/**
 * Shared utilities for agents.
 */

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
