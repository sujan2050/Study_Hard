import { CardType } from '../../src/types/index.js';
import { verifyQuoteInPassage, isNearDuplicate } from './verifier.js';

export interface RawAICard {
  type: CardType;
  front: string;
  back: string;
  quote: string;
}

const SYSTEM_PROMPT = `You write study cards using ONLY the passage provided. Do not use outside knowledge. Return strict JSON: {"cards":[{"type":"concept|term|process|question","front":"...","back":"...","quote":"..."}]}. The quote must be copied EXACTLY, word for word, from the passage and must directly support the card. Produce 0 to 3 cards. If the passage does not clearly support a card, return {"cards":[]}. Never invent facts.`;

/**
 * Generate cards using configured AI provider or smart local extractor fallback
 */
export async function generateCardsForPassage(
  passageText: string,
  existingFronts: string[] = []
): Promise<RawAICard[]> {
  // If passage is very short or irrelevant (< 25 chars or empty), produce 0 cards
  if (!passageText || passageText.trim().length < 25) {
    console.log('[AI Generator] Passage too short or empty, returning 0 cards.');
    return [];
  }

  // Attempt generation with retry on quote mismatch
  let rawCards = await callModelOrFallback(passageText, false);
  let verifiedCards = filterAndVerify(rawCards, passageText, existingFronts);

  // If some or all cards failed quote verification, retry that passage ONCE
  if (rawCards.length > 0 && verifiedCards.length === 0) {
    console.log('[AI Generator] Quote verification failed on first try. Retrying passage once...');
    rawCards = await callModelOrFallback(passageText, true);
    verifiedCards = filterAndVerify(rawCards, passageText, existingFronts);
    if (verifiedCards.length === 0) {
      console.log('[AI Generator] Retry failed quote verification. Discarding silently as per rules.');
    }
  }

  return verifiedCards;
}

/**
 * Filters out invalid types, unverified quotes, and duplicates
 */
function filterAndVerify(
  cards: RawAICard[],
  passageText: string,
  existingFronts: string[]
): RawAICard[] {
  const verified: RawAICard[] = [];
  const validTypes = new Set<CardType>(['concept', 'term', 'process', 'question']);

  for (const card of cards) {
    if (!card.front || !card.back || !card.quote) {
      continue;
    }

    const type = (card.type || 'concept').toLowerCase() as CardType;
    if (!validTypes.has(type)) {
      continue;
    }

    // SERVER-SIDE VERIFICATION: Check quote really appears in passage
    const isVerified = verifyQuoteInPassage(card.quote, passageText);
    if (!isVerified) {
      console.warn(`[AI Generator] REJECTED: Quote "${card.quote}" does not appear in passage.`);
      continue;
    }

    // DUPLICATE CHECK: Skip near-duplicate cards
    const allFronts = [...existingFronts, ...verified.map(v => v.front)];
    if (isNearDuplicate(card.front, allFronts)) {
      console.log(`[AI Generator] Skipping near-duplicate front: "${card.front}"`);
      continue;
    }

    verified.push({
      type,
      front: card.front.trim(),
      back: card.back.trim(),
      quote: card.quote.trim()
    });
  }

  return verified;
}

/**
 * Routes to OpenAI, Gemini, Replit AI, or Local Intelligent Extractor
 */
async function callModelOrFallback(passageText: string, isRetry: boolean): Promise<RawAICard[]> {
  const openaiKey = process.env.OPENAI_API_KEY || process.env.REPLIT_AI_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey) {
    try {
      return await callGemini(passageText, geminiKey, isRetry);
    } catch (err) {
      console.warn('[AI Generator] Gemini call failed, falling back...', err);
    }
  }

  if (openaiKey) {
    try {
      return await callOpenAI(passageText, openaiKey, isRetry);
    } catch (err) {
      console.warn('[AI Generator] OpenAI call failed, falling back...', err);
    }
  }

  // Built-in intelligent heuristic extractor (offline / immediate demo mode)
  return smartLocalCardExtractor(passageText);
}

/**
 * Gemini API caller
 */
async function callGemini(passageText: string, apiKey: string, isRetry: boolean): Promise<RawAICard[]> {
  const prompt = `${SYSTEM_PROMPT}\n\n${isRetry ? 'IMPORTANT: Previous quote did not match text exactly. You MUST copy the quote character-for-character from the passage!\n\n' : ''}PASSAGE:\n${passageText}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) return [];

  return parseCardsJson(textResponse);
}

/**
 * OpenAI / Replit API caller
 */
async function callOpenAI(passageText: string, apiKey: string, isRetry: boolean): Promise<RawAICard[]> {
  const prompt = `${isRetry ? 'REMINDER: The quote must be copied word for word from the passage.\n\n' : ''}PASSAGE:\n${passageText}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return [];

  return parseCardsJson(content);
}

function parseCardsJson(jsonText: string): RawAICard[] {
  try {
    // Strip markdown fences if present
    const cleaned = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed.cards)) {
      return parsed.cards;
    }
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (err) {
    console.warn('[AI Generator] Failed to parse JSON response:', jsonText);
  }
  return [];
}

/**
 * Intelligent Local Extractor
 * Guarantees that EVERY card has a 100% exact verbatim sentence quote from the passage.
 * Used for offline demo, test suites, and instant evaluation without needing an API key upfront.
 */
function smartLocalCardExtractor(passageText: string): RawAICard[] {
  const sentences = passageText
    .split(/(?<=[.?!])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20);

  if (sentences.length === 0) return [];

  const cards: RawAICard[] = [];

  for (const sentence of sentences) {
    if (cards.length >= 3) break;

    // Pattern 1: Definitions ("X is defined as...", "X refers to...", "X is a...")
    const defMatch = sentence.match(/^([A-Z][a-zA-Z\s]{2,30})\s+(?:is|refers to|is defined as|means)\s+([^.,;]+(?:[.,;]|$))/i);
    if (defMatch && defMatch[1] && defMatch[2]) {
      const term = defMatch[1].trim();
      cards.push({
        type: 'term',
        front: `What is ${term}?`,
        back: sentence.replace(/[.]+$/, ''),
        quote: sentence // Verbatim match guaranteed
      });
      continue;
    }

    // Pattern 2: Process or Steps ("When X occurs...", "In order to...", "The process of...")
    const processMatch = sentence.match(/(?:The process of|In order to|During|When)\s+([^,]+),\s*(.+)/i);
    if (processMatch && processMatch[1] && processMatch[2]) {
      cards.push({
        type: 'process',
        front: `How does the process of ${processMatch[1].trim()} work?`,
        back: processMatch[2].trim(),
        quote: sentence // Verbatim match guaranteed
      });
      continue;
    }

    // Pattern 3: Key Concept or Relationship
    if (sentence.includes('because') || sentence.includes('therefore') || sentence.includes('leads to') || sentence.includes('crucial')) {
      cards.push({
        type: 'concept',
        front: `What is the significance described regarding: "${sentence.slice(0, 45)}..."?`,
        back: sentence,
        quote: sentence // Verbatim match guaranteed
      });
      continue;
    }

    // Pattern 4: General Question card
    if (cards.length < 2 && sentence.length > 35) {
      cards.push({
        type: 'question',
        front: `According to the text, what key fact is stated about this topic?`,
        back: sentence,
        quote: sentence // Verbatim match guaranteed
      });
    }
  }

  return cards;
}
