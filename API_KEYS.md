# API keys — how to obtain and wire each gated source

Most of CartaOS's ~40 data sources are keyless and already live. Eight are
env-gated: their clients return empty results (and the UI shows
"no source connected") until the key exists. Registration must be done by a
human — each provider requires an account. Paste each key into `.env` locally
**and** into Vercel → Project Settings → Environment Variables, then redeploy.

| Env var | Provider | Where to register | Cost / notes |
|---|---|---|---|
| `PATENTSVIEW_API_KEY` | USPTO PatentsView | https://patentsview.org/apis/keyrequest | Free; key emailed after a short form. Feeds US patent family/expiry in the exclusivity-runway and IP dimensions. |
| `EPO_OPS_KEY` + `EPO_OPS_SECRET` | EPO Open Patent Services | https://developers.epo.org (register → create app → consumer key/secret) | Free tier (4GB/mo). OAuth pair — both vars required. European patent data for exclusivity/FTO. |
| `LENS_API_TOKEN` | The Lens | https://www.lens.org/lens/user/subscriptions#scholar (request API access) | Free for individual/scholarly use; commercial use is paid — their form asks. Global patent + scholarly graph. |
| `NICE_API_KEY` | NICE Syndication API | https://www.nice.org.uk/about/what-we-do/nice-syndication-api (request access) | Free for many uses, licence terms apply. UK HTA guidance for the access dimensions. ⚠️ Client contract is a scaffold — verify response shape on first real call. |
| `EMA_SPOR_API_KEY` | EMA SPOR | https://spor.ema.europa.eu/sporwi/ (register, then request API role) | Free; approval can take days. ⚠️ Scaffold client — verify contract. |
| `IHME_GBD_API_KEY` | IHME GBD | https://vizhub.healthdata.org/gbd-results/ (account) — API access via GBD results tool licence | Free for non-commercial; commercial use needs a licence conversation. Epidemiology for unmet-need. ⚠️ Scaffold client. |
| `PBS_SUBSCRIPTION_KEY` | PBS Australia | https://data.pbs.gov.au (developer portal → subscribe) | Free. Australian reimbursement listings. |
| `SEMANTIC_SCHOLAR_API_KEY` | Semantic Scholar | https://www.semanticscholar.org/product/api (request form) | Optional — client already works keyless at low rate limits; key raises them. Free. |

Also referenced but not data-source keys:

- `ADMIN_BOOTSTRAP_SECRET` — set any random string; required (or an owner
  session) to call `/api/admin/bootstrap` since the Phase 0.5 hotfix.
- `CMS_PARTD_DATASET_ID` / `CMS_PARTD_SPENDING_DATASET_ID` — not keys; CMS
  dataset UUIDs that rotate yearly. Only set if the defaults go stale.

After adding a key, the matching registry entry in `config/sources.ts`
(`envKey` field) starts reporting available; nothing else needs changing.
