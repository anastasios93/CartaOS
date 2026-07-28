/** Live verification of the open-data source swap. Run: npx tsx scripts/probe-new-sources.ts */
import { getExclusivityRunway, searchOrangeBook } from "../server/services/orange-book";
import { searchDrugShortages } from "../server/services/fda-shortages";
import { getUkPrescribingSummary } from "../server/services/nhs-openprescribing";

async function main() {
const runway = await getExclusivityRunway("atorvastatin");
console.log("OB runway (atorvastatin):", JSON.stringify(runway));

const semaglutide = await getExclusivityRunway("semaglutide");
console.log("OB runway (semaglutide):", JSON.stringify(semaglutide));

const ob = await searchOrangeBook("ATORVASTATIN CALCIUM", 3);
console.log("OB search: total", ob.totalCount, "| first applicant:", ob.results[0]?.applicant, "| TE:", ob.results[0]?.teCodes);

const shortage = await searchDrugShortages("Clonazepam");
console.log("Shortages (clonazepam):", shortage ? `${shortage.current} current / ${shortage.resolved} resolved` : "null");

const none = await searchDrugShortages("atorvastatin");
console.log("Shortages (atorvastatin):", JSON.stringify(none && { current: none.current, resolved: none.resolved }));

const uk = await getUkPrescribingSummary("atorvastatin");
console.log("UK OpenPrescribing:", uk ? JSON.stringify(uk) : "null (blocked or unreachable — degrades to 'no source connected')");
}
void main();
