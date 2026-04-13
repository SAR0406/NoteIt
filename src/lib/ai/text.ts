// Removes markup-sensitive characters to keep generated flashcard text plain/safe.
// We intentionally normalize to plain text (instead of HTML-escaping) because these
// values are consumed as text fields, not injected as HTML.
export const sanitizeModelText = (value: string) =>
  value.replace(/[<>&"']/g, '').replace(/\s+/g, ' ').trim();

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
