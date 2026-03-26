/**
 * Shared utilities for agents.
 */

/**
 * Extract a clean, human-readable error message from Anthropic SDK errors.
 */
export function cleanError(err: unknown): string {
  if (!(err instanceof Error)) return "Unknown error";

  const msg = err.message;

  // Anthropic SDK wraps errors with status code + JSON body
  if (msg.includes("credit balance is too low")) {
    return "Anthropic API has no credits. Please add billing at console.anthropic.com/settings/billing";
  }
  if (msg.includes("invalid_api_key") || msg.includes("authentication_error")) {
    return "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY.";
  }
  if (msg.includes("rate_limit")) {
    return "Rate limited by Anthropic API. Please wait a moment and try again.";
  }
  if (msg.includes("overloaded")) {
    return "Anthropic API is overloaded. Please try again in a few minutes.";
  }

  // Try to extract just the message from a JSON error body
  try {
    const jsonMatch = msg.match(/\{[\s\S]*"message"\s*:\s*"([^"]+)"/);
    if (jsonMatch) return jsonMatch[1];
  } catch {
    // ignore
  }

  // Truncate overly long messages
  return msg.length > 200 ? msg.slice(0, 200) + "..." : msg;
}

/**
 * Extract JSON from Claude's response text.
 * Handles: raw JSON, ```json fenced blocks, text with embedded JSON.
 */
export function extractJSON<T = unknown>(text: string): T {
  // Try raw parse first
  try {
    return JSON.parse(text) as T;
  } catch {
    // continue
  }

  // Try stripping markdown code fences
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim()) as T;
    } catch {
      // continue
    }
  }

  // Try finding first [ or { and extract
  const arrStart = text.indexOf("[");
  const objStart = text.indexOf("{");
  const start = arrStart === -1 ? objStart : objStart === -1 ? arrStart : Math.min(arrStart, objStart);

  if (start !== -1) {
    const isArray = text[start] === "[";
    const closeChar = isArray ? "]" : "}";
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === text[start]) depth++;
      if (text[i] === closeChar) depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1)) as T;
        } catch {
          break;
        }
      }
    }
  }

  throw new Error("Failed to parse JSON from AI response. The model returned an unexpected format.");
}
