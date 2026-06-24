/**
 * NICE (UK HTA) guidance syndication client.
 * KEY-REQUIRED. Env: NICE_API_KEY (returns [] until configured — graceful no-op).
 * Env-gated scaffold: confirm the exact endpoint/response contract against the NICE
 * syndication developer docs before production use.
 * Docs: https://www.nice.org.uk/about/what-we-do/content-syndication
 */

import { fetchJSON, envKey } from "./http";

const BASE_URL = "https://api.nice.org.uk/services/guidance/list";

export interface NiceGuidance {
  id: string;
  title: string;
  url: string;
  published: string;
}

/** Fetch the NICE guidance list and filter client-side by title. */
export async function searchNice(query: string, limit = 10): Promise<NiceGuidance[]> {
  const key = envKey("NICE_API_KEY");
  if (!key) return [];

  try {
    const body = await fetchJSON<any>(BASE_URL, {
      headers: { "API-Key": key },
    });

    // Contract uncertain — try common shapes: body.items / body.guidance / array body.
    const rows: any[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.items)
      ? body.items
      : Array.isArray(body?.guidance)
      ? body.guidance
      : [];

    const q = query.toLowerCase();
    const items: NiceGuidance[] = rows.map((r: any) => ({
      id: r?.id ?? r?.reference ?? "",
      title: r?.title ?? "",
      url: r?.url ?? r?.link ?? "",
      published: r?.published ?? r?.publicationDate ?? "",
    }));

    return items.filter((i) => i.title.toLowerCase().includes(q)).slice(0, limit);
  } catch {
    return [];
  }
}
