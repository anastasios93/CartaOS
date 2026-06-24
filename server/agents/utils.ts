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
 * Handles: raw JSON, ```json fenced blocks, text with embedded JSON, and
 * — critically — JSON that was TRUNCATED because the model hit max_tokens
 * mid-output (the #1 cause of "the agent doesn't work"). Truncated payloads
 * are repaired by closing any open string and balancing open brackets, with a
 * fallback that drops the final incomplete element of an array/object.
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

  // Locate the first JSON container in the text
  const arrStart = text.indexOf("[");
  const objStart = text.indexOf("{");
  const start = arrStart === -1 ? objStart : objStart === -1 ? arrStart : Math.min(arrStart, objStart);

  if (start !== -1) {
    // Balanced-extraction: find a complete, well-formed container if present.
    const closeChar = text[start] === "[" ? "]" : "}";
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

    // Container never closed (truncated output) — attempt to repair it.
    const repaired = repairTruncatedJSON(text.slice(start));
    if (repaired !== null) {
      try {
        return JSON.parse(repaired) as T;
      } catch {
        // continue
      }
    }

    // Last resort: keep only the complete leading elements of an
    // array/object by cutting back to the last complete `}` or `]`.
    const salvaged = salvageLeadingElements(text.slice(start));
    if (salvaged !== null) {
      try {
        return JSON.parse(salvaged) as T;
      } catch {
        // continue
      }
    }
  }

  throw new Error("Failed to parse JSON from AI response. The model returned an unexpected format.");
}

/**
 * Repair JSON that was cut off mid-output: close an unterminated string, drop a
 * dangling trailing comma / dangling property key, and append the closing
 * brackets needed to balance every container left open.
 */
function repairTruncatedJSON(body: string): string | null {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") stack.pop();
  }

  if (stack.length === 0 && !inString) return null; // nothing was open — not our case

  let s = body;
  if (inString) s += '"'; // close the unterminated string
  s = s.replace(/\s+$/, "");
  s = s.replace(/,$/, ""); // drop a dangling comma
  s = s.replace(/:\s*$/, ": null"); // dangling property key → null value

  for (let i = stack.length - 1; i >= 0; i--) s += stack[i];
  return s;
}

/**
 * Keep only the complete leading elements of a truncated array/object by
 * cutting back to the last complete top-level element boundary, then closing
 * the container. Ideal for the array-of-objects outputs the agents produce
 * (clauses, comparables, partners, leverage points) where the final object was
 * cut off but every earlier one is intact.
 */
function salvageLeadingElements(body: string): string | null {
  const open = body[0];
  if (open !== "[" && open !== "{") return null;
  const close = open === "[" ? "]" : "}";

  let depth = 0;
  let inString = false;
  let escaped = false;
  let lastBoundary = -1; // index just after the last complete depth-1 element

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") {
      depth--;
      if (depth === 1) lastBoundary = i + 1; // a nested element just closed
    } else if (ch === "," && depth === 1) {
      lastBoundary = i; // boundary between two top-level elements
    }
  }

  if (lastBoundary === -1) return null;
  return body.slice(0, lastBoundary).replace(/,\s*$/, "") + close;
}
