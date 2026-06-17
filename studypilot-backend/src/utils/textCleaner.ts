/**
 * Sanitizes and cleans input text by normalizing line endings,
 * tabs, collapsing multiple spaces, and removing non-printable control characters.
 * 
 * @param text The raw text content to clean
 * @returns The cleaned and normalized text
 */
export function cleanText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')           // Normalize line endings
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ')             // Tabs to spaces
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // Remove non-printable control characters (keep newlines)
    .replace(/\n{3,}/g, '\n\n')       // Max 2 consecutive newlines
    .replace(/ {2,}/g, ' ')           // Collapse multiple spaces
    .trim();
}

/**
 * Sanitizes notes according to specific project guidelines.
 */
export function sanitizeNotes(text: string): string {
  return cleanText(text);
}
