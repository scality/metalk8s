const AI_UA_PATTERNS = [
  // OpenAI
  /GPTBot/i,
  /ChatGPT-User/i,
  /OAI-SearchBot/i,

  // Anthropic
  /ClaudeBot/i,
  /Claude-User/i,
  /Claude-Web/i,
  /Claude-SearchBot/i,

  // Google
  /Google-Extended/i,
  /Gemini-Deep-Research/i,
  /Google-CloudVertexBot/i,

  // Microsoft (Bing/Copilot crawlers)
  /bingbot/i,

  // Perplexity
  /PerplexityBot/i,

  // Apple
  /Applebot-Extended/i,

  // Meta
  /Meta-ExternalAgent/i,

  // ByteDance / TikTok
  /Bytespider/i,

  // Amazon
  /Amazonbot/i,

  // Common Crawl (used by many LLM training pipelines)
  /CCBot/i,
];

/**
 * Returns true if the current User Agent matches a known AI agent pattern.
 * Used to suppress the automatic Keycloak redirect so that AI agents can
 * load the page, enumerate tools, and trigger authentication on first tool use.
 */
export function isAIUserAgent(): boolean {
  const ua = navigator.userAgent;
  return AI_UA_PATTERNS.some((pattern) => pattern.test(ua));
}
