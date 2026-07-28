/**
 * Both SSE routes persist their run in a `finally` block. Closing the writer
 * ends the response body, and the hosting platform is free to tear the function
 * down the moment the response completes — so any `await`ed database write that
 * sits after `writer.close()` silently never lands.
 *
 * This shipped to production once: a completed diagnosis rendered fine in the
 * browser but the Run row stayed at `diagnosis_running` forever, which made
 * every downstream pillar unreachable. These tests pin the ordering.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROUTES = [
  "app/api/orchestrator/route.ts",
  "app/api/run/strategy/route.ts",
];

describe.each(ROUTES)("%s", route => {
  const source = readFileSync(join(__dirname, "..", route), "utf8");

  it("closes the SSE writer exactly once", () => {
    expect(source.match(/writer\.close\(\)/g)).toHaveLength(1);
  });

  it("closes the SSE writer only after every persistence write", () => {
    const close = source.indexOf("writer.close()");
    expect(close, "writer.close() not found").toBeGreaterThan(-1);

    const writes = [...source.matchAll(/await db\.\w+\.(update|create|createMany)\(/g)];
    expect(writes.length, "no persistence writes found").toBeGreaterThan(0);

    for (const write of writes) {
      expect(
        write.index,
        `"${write[0]}" at index ${write.index} runs after writer.close() at ${close} — it will not survive function teardown`,
      ).toBeLessThan(close);
    }
  });
});
