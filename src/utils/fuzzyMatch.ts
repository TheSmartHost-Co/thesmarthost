/**
 * Fuzzy string matching utilities for property name matching
 */

/**
 * Normalize a string for comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Calculate bigrams (pairs of adjacent characters) for a string
 */
function getBigrams(str: string): Set<string> {
  const bigrams = new Set<string>()
  const normalized = str.toLowerCase().replace(/\s+/g, '')
  for (let i = 0; i < normalized.length - 1; i++) {
    bigrams.add(normalized.slice(i, i + 2))
  }
  return bigrams
}

/**
 * Calculate Dice coefficient between two strings
 * Returns a value between 0 and 1, where 1 is a perfect match
 */
function diceCoefficient(str1: string, str2: string): number {
  const bigrams1 = getBigrams(str1)
  const bigrams2 = getBigrams(str2)

  if (bigrams1.size === 0 && bigrams2.size === 0) return 1
  if (bigrams1.size === 0 || bigrams2.size === 0) return 0

  let intersection = 0
  for (const bigram of bigrams1) {
    if (bigrams2.has(bigram)) {
      intersection++
    }
  }

  return (2 * intersection) / (bigrams1.size + bigrams2.size)
}

/**
 * Calculate similarity score between two strings
 * Returns a value between 0 and 1, where 1 is a perfect match
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0

  const norm1 = normalizeString(str1)
  const norm2 = normalizeString(str2)

  // Exact match after normalization
  if (norm1 === norm2) return 1.0

  // One contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const shorter = norm1.length < norm2.length ? norm1 : norm2
    const longer = norm1.length < norm2.length ? norm2 : norm1
    return 0.85 + (0.1 * (shorter.length / longer.length))
  }

  // Use Dice coefficient for partial matches
  return diceCoefficient(norm1, norm2)
}

/**
 * Match result with confidence score
 */
export interface FuzzyMatchResult<T> {
  item: T
  score: number
  matchedField: string
}

/**
 * Find the best fuzzy match for a query string among candidates
 * Prioritizes matches by field order (first field has highest priority)
 */
export function findBestMatch<T>(
  query: string,
  candidates: T[],
  getFields: (item: T) => { field: string; value: string | undefined }[],
  minScore: number = 0.7
): FuzzyMatchResult<T> | null {
  let bestMatch: FuzzyMatchResult<T> | null = null

  for (const candidate of candidates) {
    const fields = getFields(candidate)

    for (const { field, value } of fields) {
      if (!value) continue

      const score = calculateSimilarity(query, value)

      if (score >= minScore && (!bestMatch || score > bestMatch.score)) {
        bestMatch = {
          item: candidate,
          score,
          matchedField: field,
        }
      }
    }
  }

  return bestMatch
}
