/** Live check of the innovative agent's evidence layer. Run: npx tsx scripts/probe-innovative-sources.ts */
import { searchOpenTargets } from "../server/services/open-targets";
import { searchClinicalTrials } from "../server/services/clinical-trials";
import { searchLiterature } from "../server/services/pubmed";
import { searchPatents } from "../server/services/patents";
import { searchEdgarForDeals } from "../server/services/sec-edgar";
import { searchMolecules, getMechanisms } from "../server/services/chembl";
import { searchDrugApplications } from "../server/services/openfda";

const ASSET = "pembrolizumab";
const INDICATION = "non-small cell lung cancer";

async function main() {
  const settled = await Promise.allSettled([
    searchOpenTargets(INDICATION),
    searchClinicalTrials(`${ASSET} ${INDICATION}`, undefined, 30),
    searchLiterature(`${ASSET} ${INDICATION} mechanism target validation`, 12),
    searchPatents(ASSET, 15),
    searchEdgarForDeals(`"license agreement" AND "${INDICATION}"`, ["8-K"], "2022-01-01", undefined, 12),
    searchMolecules(ASSET, 6),
    searchDrugApplications(ASSET, 10),
  ]);
  const names = ["open-targets", "clinical-trials", "pubmed", "patents", "sec-edgar", "chembl", "openfda"];
  settled.forEach((r, i) => {
    if (r.status === "rejected") {
      console.log(`${names[i]}: REJECTED — ${String(r.reason).slice(0, 120)}`);
      return;
    }
    const v = r.value as unknown;
    const count = Array.isArray(v)
      ? v.length
      : Array.isArray((v as { results?: unknown[] })?.results)
        ? (v as { results: unknown[] }).results.length
        : v
          ? 1
          : 0;
    console.log(`${names[i]}: ok, ${count} record(s)`);
  });

  const mols = settled[5].status === "fulfilled" ? (settled[5].value as { chemblId?: string }[]) : [];
  const id = mols[0]?.chemblId;
  console.log("chembl first id:", id ?? "(none — mechanism lookup would be skipped)");
  if (id) {
    const mech = await getMechanisms(id).catch(() => []);
    console.log("mechanisms:", mech.length);
  }
}
void main();
