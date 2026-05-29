/**
 * Convert plain text email content to HTML email-friendly format
 * Handles:
 * - Paragraphs (double newlines)
 * - Bullet lists (lines starting with •, -, or *)
 * - Line breaks (single newlines)
 * - Existing HTML tags (preserves them)
 */
export function convertPlainTextToHtml(text: string): string {
  // If already contains HTML tags, return as-is
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }

  // Split by double newlines to identify paragraphs
  const paragraphs = text.split(/\n\s*\n/);

  const htmlParagraphs = paragraphs
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return "";

      // Check if this paragraph is a list (lines starting with •, -, or *)
      const lines = trimmed.split("\n");
      const isList = lines.some((line) => /^\s*[•\-*]\s/.test(line));

      if (isList) {
        // Convert to unordered list
        const listItems = lines
          .map((line) => {
            const cleaned = line.replace(/^\s*[•\-*]\s*/, "").trim();
            return cleaned ? `<li>${cleaned}</li>` : "";
          })
          .filter((item) => item);

        return `<ul>\n${listItems.join("\n")}\n</ul>`;
      }

      // Regular paragraph - convert single newlines to <br>
      const withLineBreaks = trimmed
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line)
        .join("<br>");

      return `<p>${withLineBreaks}</p>`;
    })
    .filter((para) => para);

  return htmlParagraphs.join("\n");
}

/**
 * Sanitize HTML to prevent XSS while preserving formatting
 */
export function sanitizeHtmlEmail(html: string): string {
  // Remove script tags and event handlers
  let sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/on\w+\s*=\s*[^\s>]*/gi, "");

  return sanitized;
}
