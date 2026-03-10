/**
 * Seed script: populates the database with sample biotech deals for development.
 * Run with: npx tsx scripts/seed.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const sampleDeals = [
  {
    title: "Pfizer–Seagen ADC Collaboration",
    dealType: "COLLABORATION" as const,
    announcedDate: new Date("2023-12-14"),
    status: "CLOSED" as const,
    licensorName: "Seagen",
    licenseeName: "Pfizer",
    therapeuticArea: "Oncology",
    modality: "Antibody-Drug Conjugate (ADC)",
    indication: "Solid tumors",
    developmentStage: "PHASE_2" as const,
    upfrontPayment: 43000,
    totalDealValue: 43000,
    royaltyRangeLow: null,
    royaltyRangeHigh: null,
    territoryScope: "Worldwide",
    exclusivity: true,
    sourceType: "PRESS_RELEASE" as const,
    verified: true,
  },
  {
    title: "AbbVie–ImmunoGen ADC Platform License",
    dealType: "OUT_LICENSE" as const,
    announcedDate: new Date("2023-11-29"),
    status: "CLOSED" as const,
    licensorName: "ImmunoGen",
    licenseeName: "AbbVie",
    therapeuticArea: "Oncology",
    modality: "Antibody-Drug Conjugate (ADC)",
    indication: "Ovarian cancer",
    developmentStage: "APPROVED" as const,
    upfrontPayment: 10100,
    totalDealValue: 10100,
    royaltyRangeLow: null,
    royaltyRangeHigh: null,
    territoryScope: "Worldwide",
    exclusivity: true,
    sourceType: "SEC_FILING" as const,
    verified: true,
  },
  {
    title: "BMS–Karuna Therapeutics Neuroscience Deal",
    dealType: "M_AND_A" as const,
    announcedDate: new Date("2023-12-22"),
    status: "CLOSED" as const,
    licensorName: "Karuna Therapeutics",
    licenseeName: "Bristol-Myers Squibb",
    therapeuticArea: "Neurology",
    modality: "Small Molecule",
    indication: "Schizophrenia",
    developmentStage: "PHASE_3" as const,
    upfrontPayment: 14000,
    totalDealValue: 14000,
    territoryScope: "Worldwide",
    exclusivity: true,
    sourceType: "PRESS_RELEASE" as const,
    verified: true,
  },
  {
    title: "Roche–Alnylam RNAi Collaboration Extension",
    dealType: "COLLABORATION" as const,
    announcedDate: new Date("2024-03-15"),
    status: "ANNOUNCED" as const,
    licensorName: "Alnylam Pharmaceuticals",
    licenseeName: "Roche",
    therapeuticArea: "Neurology",
    modality: "siRNA / ASO",
    indication: "Alzheimer's disease",
    developmentStage: "PRECLINICAL" as const,
    upfrontPayment: 310,
    totalDealValue: 3200,
    developmentMilestones: 1390,
    commercialMilestones: 1500,
    royaltyRangeLow: 8,
    royaltyRangeHigh: 15,
    territoryScope: "Worldwide ex-US",
    exclusivity: true,
    sourceType: "PRESS_RELEASE" as const,
    verified: false,
  },
  {
    title: "Merck–Daiichi Sankyo ADC Partnership",
    dealType: "COLLABORATION" as const,
    announcedDate: new Date("2023-10-19"),
    status: "CLOSED" as const,
    licensorName: "Daiichi Sankyo",
    licenseeName: "Merck",
    therapeuticArea: "Oncology",
    modality: "Antibody-Drug Conjugate (ADC)",
    indication: "Multiple solid tumors",
    developmentStage: "PHASE_3" as const,
    upfrontPayment: 4000,
    totalDealValue: 22000,
    developmentMilestones: 7000,
    commercialMilestones: 11000,
    royaltyRangeLow: 15,
    royaltyRangeHigh: 22,
    territoryScope: "Worldwide",
    exclusivity: false,
    sourceType: "SEC_FILING" as const,
    verified: true,
  },
  {
    title: "Novartis–BeiGene Tislelizumab License",
    dealType: "IN_LICENSE" as const,
    announcedDate: new Date("2024-01-08"),
    status: "ANNOUNCED" as const,
    licensorName: "BeiGene",
    licenseeName: "Novartis",
    therapeuticArea: "Oncology",
    modality: "Monoclonal Antibody (mAb)",
    indication: "Non-small cell lung cancer",
    developmentStage: "APPROVED" as const,
    upfrontPayment: 550,
    totalDealValue: 2200,
    developmentMilestones: 650,
    commercialMilestones: 1000,
    royaltyRangeLow: 12,
    royaltyRangeHigh: 20,
    territoryScope: "US, EU, Japan",
    exclusivity: true,
    sourceType: "PRESS_RELEASE" as const,
    verified: false,
  },
  {
    title: "Gilead–CymaBay NASH/PBC Deal",
    dealType: "M_AND_A" as const,
    announcedDate: new Date("2024-02-12"),
    status: "CLOSED" as const,
    licensorName: "CymaBay Therapeutics",
    licenseeName: "Gilead Sciences",
    therapeuticArea: "Gastroenterology",
    modality: "Small Molecule",
    indication: "Primary biliary cholangitis",
    developmentStage: "PHASE_3" as const,
    upfrontPayment: 4300,
    totalDealValue: 4300,
    territoryScope: "Worldwide",
    exclusivity: true,
    sourceType: "SEC_FILING" as const,
    verified: true,
  },
  {
    title: "AstraZeneca–Fusion Radiopharmaceutical Partnership",
    dealType: "OPTION" as const,
    announcedDate: new Date("2024-06-20"),
    status: "ANNOUNCED" as const,
    licensorName: "Fusion Pharmaceuticals",
    licenseeName: "AstraZeneca",
    therapeuticArea: "Oncology",
    modality: "Radiopharmaceutical",
    indication: "Solid tumors",
    developmentStage: "PHASE_1" as const,
    upfrontPayment: 2000,
    totalDealValue: 2400,
    developmentMilestones: 400,
    royaltyRangeLow: 10,
    royaltyRangeHigh: 18,
    territoryScope: "Worldwide",
    exclusivity: true,
    sourceType: "PRESS_RELEASE" as const,
    verified: false,
  },
];

const sampleCompanies = [
  {
    name: "Pfizer",
    type: "PHARMA" as const,
    headquarters: "New York, NY",
    therapeuticFocus: ["Oncology", "Immunology", "Rare Disease"],
    modalityFocus: ["Small Molecule", "Monoclonal Antibody (mAb)", "Antibody-Drug Conjugate (ADC)"],
    partnerStatus: "ACTIVE" as const,
    partnerScore: 85,
  },
  {
    name: "Roche",
    type: "PHARMA" as const,
    headquarters: "Basel, Switzerland",
    therapeuticFocus: ["Oncology", "Neurology", "Immunology"],
    modalityFocus: ["Monoclonal Antibody (mAb)", "Bispecific Antibody", "siRNA / ASO"],
    partnerStatus: "IN_DISCUSSION" as const,
    partnerScore: 78,
  },
  {
    name: "Novartis",
    type: "PHARMA" as const,
    headquarters: "Basel, Switzerland",
    therapeuticFocus: ["Oncology", "Cardiovascular", "Immunology"],
    modalityFocus: ["Small Molecule", "Monoclonal Antibody (mAb)", "Gene Therapy"],
    partnerStatus: "CONTACTED" as const,
    partnerScore: 72,
  },
  {
    name: "Alnylam Pharmaceuticals",
    type: "BIOTECH" as const,
    headquarters: "Cambridge, MA",
    therapeuticFocus: ["Neurology", "Rare Disease", "Cardiovascular"],
    modalityFocus: ["siRNA / ASO"],
    partnerStatus: "ACTIVE" as const,
    partnerScore: 90,
  },
  {
    name: "Daiichi Sankyo",
    type: "PHARMA" as const,
    headquarters: "Tokyo, Japan",
    therapeuticFocus: ["Oncology"],
    modalityFocus: ["Antibody-Drug Conjugate (ADC)"],
    partnerStatus: "ACTIVE" as const,
    partnerScore: 88,
  },
];

async function seed() {
  console.log("Seeding database...");

  // Create sample companies
  for (const company of sampleCompanies) {
    await db.company.upsert({
      where: { id: company.name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        id: company.name.toLowerCase().replace(/\s+/g, "-"),
        ...company,
      },
    });
  }
  console.log(`  Created ${sampleCompanies.length} companies`);

  // Create sample deals
  for (const deal of sampleDeals) {
    const id = deal.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50);
    await db.deal.upsert({
      where: { id },
      update: {},
      create: { id, ...deal },
    });
  }
  console.log(`  Created ${sampleDeals.length} deals`);

  console.log("Seed complete.");
}

seed()
  .catch(console.error)
  .finally(() => db.$disconnect());
