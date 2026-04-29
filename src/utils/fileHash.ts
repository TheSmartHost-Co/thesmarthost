/**
 * Compute the SHA-256 hash of a File using the Web Crypto API.
 * Returns a 64-char lowercase hex string — matches the format the backend
 * expects in /receipts/check-duplicates and stores in receipts.content_hash.
 *
 * Hashing in the browser saves Storage upload + Gemini OCR cost on duplicate
 * uploads — we can short-circuit before any byte leaves the client.
 */
export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
