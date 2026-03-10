import { PrismaClient } from "@prisma/client";
import { MOCK_DEALS, MOCK_COMPANIES } from "../lib/mock-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Seed companies first
  for (const c of MOCK_COMPANIES) {
    await prisma.company.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        name: c.name,
        type: c.type as any,
        headquarters: c.headquarters,
        website: c.website,
        marketCap: c.marketCap,
        therapeuticFocus: c.therapeuticFocus,
        modalityFocus: c.modalityFocus,
        avgDealCadenceDays: c.avgDealCadenceDays,
        dealActivityScore: c.dealActivityScore,
        partnerStatus: c.partnerStatus as any,
        partnerScore: c.partnerScore,
        lastDealDate: c.lastDealDate ? new Date(c.lastDealDate) : null,
        notes: c.notes,
      },
    });
  }
  console.log(`Seeded ${MOCK_COMPANIES.length} companies`);

  // Seed contacts for companies
  for (const c of MOCK_COMPANIES) {
    await prisma.contact.upsert({
      where: { id: `contact-${c.id}` },
      update: {},
      create: {
        id: `contact-${c.id}`,
        companyId: c.id,
        name: c.contactName,
        title: c.contactTitle,
        email: c.contactEmail,
      },
    });
  }
  console.log(`Seeded ${MOCK_COMPANIES.length} contacts`);

  // Seed deals
  for (const d of MOCK_DEALS) {
    await prisma.deal.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        title: d.title,
        dealType: d.dealType as any,
        announcedDate: new Date(d.announcedDate),
        status: d.status as any,
        licensorName: d.licensorName,
        licenseeName: d.licenseeName,
        assetName: d.assetName,
        therapeuticArea: d.therapeuticArea,
        modality: d.modality,
        indication: d.indication,
        developmentStage: d.developmentStage as any,
        upfrontPayment: d.upfrontPayment,
        totalDealValue: d.totalDealValue,
        developmentMilestones: d.developmentMilestones,
        commercialMilestones: d.commercialMilestones,
        royaltyRangeLow: d.royaltyRangeLow,
        royaltyRangeHigh: d.royaltyRangeHigh,
        territoryScope: d.territoryScope,
        exclusivity: d.exclusivity,
        coDevRights: d.coDevRights,
        coPromoteRights: d.coPromoteRights,
        optionStructure: d.optionStructure,
        sourceType: d.sourceType as any,
        confidence: d.confidence,
        verified: d.verified,
      },
    });
  }
  console.log(`Seeded ${MOCK_DEALS.length} deals`);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
