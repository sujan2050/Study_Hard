/**
 * Server-side Quote Verification Service
 * CORE PRINCIPLE: The AI proposes, the source stays visible, the human decides.
 * A card whose quote is not found in its passage can NEVER be saved.
 */

export function normalizeText(str: string): string {
  if (!str) return '';
  return str
    // Normalize curly quotes to straight quotes
    .replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    // Normalize em dash and en dash
    .replace(/[\u2013\u2014]/g, '-')
    // Strip leading or trailing quotation marks if the AI wrapped the quote in quotes
    .replace(/^["']+|["']+$/g, '')
    // Replace non-breaking spaces and all whitespace sequences with a single space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Verifies that the exact quote is contained in the passage text after normalization.
 */
export function verifyQuoteInPassage(quote: string, passageText: string): boolean {
  if (!quote || !passageText) return false;
  
  const normQuote = normalizeText(quote);
  const normPassage = normalizeText(passageText);

  if (normQuote.length === 0 || normPassage.length === 0) return false;

  // The quote must be a substring of the passage
  return normPassage.includes(normQuote);
}

/**
 * Checks if a card is a near-duplicate of existing cards from the same source.
 * Compares normalized front text.
 */
export function isNearDuplicate(frontText: string, existingFronts: string[]): boolean {
  const normFront = normalizeText(frontText);
  return existingFronts.some(existing => {
    const normExisting = normalizeText(existing);
    if (normExisting === normFront) return true;
    
    // Levenshtein similarity or prefix match for near-identical fronts
    if (Math.abs(normExisting.length - normFront.length) < 5) {
      if (normExisting.includes(normFront) || normFront.includes(normExisting)) {
        return true;
      }
    }
    return false;
  });
}
