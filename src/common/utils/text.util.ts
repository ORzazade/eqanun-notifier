const MD_CHARS = /([_*[\]()~`>#+\-=|{}.!\\])/g; // Telegram MarkdownV2 reserved chars

export function escapeMarkdown(text: string): string {
  return text.replace(MD_CHARS, '\\$1');
}

export function truncateWithEllipsis(text: string, max: number): { value: string; truncated: boolean } {
  if (text.length <= max) return { value: text, truncated: false };
  if (max <= 1) return { value: text.slice(0, max), truncated: true };
  return { value: text.slice(0, max - 1) + '…', truncated: true };
}

/**
 * Build a title safe for Telegram (Markdown) ensuring whole message stays <4096.
 * We reserve some slack (300 chars) for prefixes, category, URL, and future additions.
 */
export function buildSafeTitleForTelegram(rawTitle: string, hardCap = 3000) {
  const { value, truncated } = truncateWithEllipsis(rawTitle, hardCap);
  return { title: escapeMarkdown(value), truncated, originalLength: rawTitle.length };
}
