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

// --- Added helpers for fuzzy keyword matching ---

/**
 * Normalize string for matching:
 * - lower-case
 * - NFD accent strip
 * - Azerbaijani char folding (ə→e, ı→i, ş→s, ç→c, ğ→g, ö→o, ü→u)
 * - remove non-alphanumerics except spaces
 * - collapse spaces
 */
export function normalizeForMatch(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeForMatch(input: string): string[] {
  return normalizeForMatch(input)
    .split(' ')
    .filter(t => t.length >= 2);
}

// --- Advanced fuzzy helpers (added) ---

const CONNECTOR_SET = new Set(['ve', 'və', 'and', '&', '+']);

export function tokenizeQueryForMatch(input: string): string[] {
  return normalizeForMatch(
    input
      .replace(/[,+/;|]/g, ' ')
      .replace(/\s+(ve|və|and|&|\+)\s+/g, ' ')
  )
    .split(' ')
    .filter(t => t.length >= 2 && !CONNECTOR_SET.has(t));
}

export function tokenizeTitleForMatch(title: string): string[] {
  return normalizeForMatch(title).split(' ').filter(t => t.length >= 2);
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[a.length][b.length];
}

export function fuzzyTokenMatch(token: string, titleTokens: string[]): boolean {
  for (const w of titleTokens) {
    if (w === token) return true;
    if (w.includes(token) || token.includes(w)) return true;
    const len = Math.max(token.length, w.length);
    if (len >= 3) {
      const dist = levenshtein(token, w);
      if ((len <= 4 && dist <= 1) || (len >= 5 && dist <= 2)) return true;
    }
  }
  return false;
}
