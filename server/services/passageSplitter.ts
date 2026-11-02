/**
 * Splits text into passages of roughly 3 to 6 sentences.
 * Rules:
 * 1. Split on paragraph breaks first.
 * 2. If a paragraph is too long (> 6 sentences), split it into chunks of 3 to 5 sentences.
 * 3. If a paragraph is very short (e.g. 1 short sentence), combine it with the next if possible.
 */
export function splitIntoPassages(text: string): { position: number; text: string }[] {
  if (!text || !text.trim()) return [];

  // Split on double line breaks (paragraphs)
  const rawParagraphs = text
    .split(/\r?\n\s*\r?\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const passages: string[] = [];

  for (const para of rawParagraphs) {
    // Sentence splitting regex that handles common abbreviations reasonably
    const sentences = splitIntoSentences(para);

    if (sentences.length <= 6) {
      if (sentences.length > 0) {
        passages.push(sentences.join(' '));
      }
    } else {
      // Chunk into groups of 3 to 5 sentences
      let currentChunk: string[] = [];
      for (let i = 0; i < sentences.length; i++) {
        currentChunk.push(sentences[i]);
        // If we reached 4 sentences, and there are at least 3 left, finalize chunk
        const remaining = sentences.length - (i + 1);
        if (currentChunk.length >= 4 && (remaining >= 3 || remaining === 0)) {
          passages.push(currentChunk.join(' '));
          currentChunk = [];
        } else if (currentChunk.length >= 6) {
          passages.push(currentChunk.join(' '));
          currentChunk = [];
        }
      }
      if (currentChunk.length > 0) {
        // If the leftover is just 1 or 2 sentences and we have a previous passage,
        // we can either append or keep as passage
        if (currentChunk.length < 2 && passages.length > 0) {
          passages[passages.length - 1] += ' ' + currentChunk.join(' ');
        } else {
          passages.push(currentChunk.join(' '));
        }
      }
    }
  }

  // Merge any very tiny single-phrase passages into the adjacent passage if possible
  const merged: string[] = [];
  for (let i = 0; i < passages.length; i++) {
    const cur = passages[i].trim();
    if (cur.length < 50 && i + 1 < passages.length) {
      // merge with next
      passages[i + 1] = cur + ' ' + passages[i + 1];
    } else if (cur.length < 50 && merged.length > 0) {
      // merge with previous
      merged[merged.length - 1] = merged[merged.length - 1] + ' ' + cur;
    } else {
      merged.push(cur);
    }
  }

  return merged.map((txt, index) => ({
    position: index + 1,
    text: txt
  }));
}

function splitIntoSentences(paragraph: string): string[] {
  // Regex to split on ., !, ? followed by whitespace and a capital letter or end of string
  // while avoiding common abbreviations like e.g., i.e., Dr., vs.
  const regex = /(?<=[.?!])\s+(?=[A-Z0-9"']|$)/g;
  const parts = paragraph.split(regex).map(s => s.trim()).filter(s => s.length > 0);
  
  if (parts.length === 0 && paragraph.trim().length > 0) {
    return [paragraph.trim()];
  }
  return parts;
}
