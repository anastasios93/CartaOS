import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding additional data...\n");

  // --- Negotiations ---
  const negotiations = [
    {
      id: "neg-001",
      orgId: "org-default",
      title: "CRX-100 Out-License — Pfizer",
      companyId: "co-001",
      status: "TERM_SHEET_EXCHANGED" as const,
      proposedUpfront: 250,
      proposedMilestones: 1800,
      proposedRoyaltyLow: 10,
      proposedRoyaltyHigh: 16,
      proposedTerritory: "Worldwide",
      startDate: new Date("2024-01-15"),
      targetCloseDate: new Date("2024-06-30"),
      currentBlockers: [
        { item: "Legal review pending on sublicensing clause", severity: "MEDIUM", owner: "IP Counsel" },
        { item: "CMC data package incomplete", severity: "HIGH", owner: "CMC Lead" },
      ],
      nextSteps: [
        { action: "Schedule partner call to discuss IP allocation", owner: "BD Lead", due: "2024-03-15" },
        { action: "Finalize CMC data package", owner: "CMC Lead", due: "2024-03-20" },
      ],
      riskFlags: [
        "Upfront offer 35% below median for comparable Phase 2 oncology deals",
        "Pfizer requesting broader sublicensing rights than industry standard",
      ],
    },
    {
      id: "neg-002",
      orgId: "org-default",
      title: "CRX-200 ADC Platform — AstraZeneca",
      companyId: "co-002",
      status: "TERM_SHEET_DRAFTING" as const,
      proposedTerritory: "Worldwide ex-China",
      startDate: new Date("2024-02-28"),
      targetCloseDate: new Date("2024-09-30"),
      currentBlockers: [
        { item: "Waiting for AZ scientific review feedback", severity: "HIGH", owner: "AstraZeneca" },
      ],
      nextSteps: [
        { action: "Prepare benchmarking analysis", owner: "BD Lead", due: "2024-03-22" },
        { action: "Draft initial term sheet", owner: "BD Lead", due: "2024-03-25" },
      ],
      riskFlags: ["AZ has strong internal ADC capability"],
    },
    {
      id: "neg-003",
      orgId: "org-default",
      title: "CRX-100 Backup Option — Merck",
      companyId: "co-005",
      status: "INITIATED" as const,
      proposedTerritory: "Worldwide",
      startDate: new Date("2024-03-01"),
      nextSteps: [
        { action: "Send introductory materials and NDA", owner: "BD Lead", due: "2024-03-12" },
        { action: "Schedule introductory call", owner: "BD Lead", due: "2024-03-14" },
      ],
    },
    {
      id: "neg-004",
      orgId: "org-default",
      title: "CRX-300 Gene Therapy — Novartis",
      companyId: "co-003",
      status: "DUE_DILIGENCE" as const,
      proposedUpfront: 175,
      proposedMilestones: 2200,
      proposedRoyaltyLow: 12,
      proposedRoyaltyHigh: 18,
      proposedTerritory: "Worldwide",
      startDate: new Date("2023-11-15"),
      targetCloseDate: new Date("2024-05-15"),
      currentBlockers: [
        { item: "Manufacturing scale-up validation pending", severity: "HIGH", owner: "CMC" },
        { item: "Patent family FTO analysis", severity: "MEDIUM", owner: "Patent Counsel" },
      ],
      nextSteps: [
        { action: "Complete GMP batch release data", owner: "CMC", due: "2024-04-01" },
        { action: "FTO opinion delivery", owner: "Patent Counsel", due: "2024-03-28" },
      ],
      riskFlags: [
        "Manufacturing complexity may reduce partner interest",
        "Competing gene therapy program at Novartis in adjacent indication",
      ],
    },
  ];

  for (const n of negotiations) {
    await prisma.negotiation.upsert({
      where: { id: n.id },
      update: {},
      create: n,
    });
  }
  console.log(`Seeded ${negotiations.length} negotiations`);

  // --- Negotiation Activities ---
  const activities = [
    { id: "act-001", negotiationId: "neg-001", type: "MEETING", title: "Initial partner meeting", description: "Discussed asset overview and development plan. Pfizer expressed strong interest.", occurredAt: new Date("2024-01-20") },
    { id: "act-002", negotiationId: "neg-001", type: "EMAIL", title: "NDA executed", description: "Mutual NDA fully executed between both parties.", occurredAt: new Date("2024-01-25") },
    { id: "act-003", negotiationId: "neg-001", type: "OFFER", title: "Term sheet sent to Pfizer", description: "Initial term sheet: $300M upfront, $2.1B milestones, 12-18% royalties.", occurredAt: new Date("2024-02-15") },
    { id: "act-004", negotiationId: "neg-001", type: "COUNTEROFFER", title: "Pfizer counter-proposal received", description: "Countered with $250M upfront, $1.8B milestones, 10-16% royalties.", occurredAt: new Date("2024-03-01") },
    { id: "act-005", negotiationId: "neg-002", type: "MEETING", title: "Scientific due diligence session", description: "Presented preclinical data to AZ oncology team. Positive reception.", occurredAt: new Date("2024-03-05") },
    { id: "act-006", negotiationId: "neg-004", type: "MILESTONE", title: "Phase 1 topline data readout", description: "Positive Phase 1 data: 68% response rate, manageable safety.", occurredAt: new Date("2024-02-01") },
    { id: "act-007", negotiationId: "neg-004", type: "MEETING", title: "Novartis BD team site visit", description: "Novartis BD and R&D leadership visited for facility tour and data review.", occurredAt: new Date("2024-02-20") },
    { id: "act-008", negotiationId: "neg-003", type: "EMAIL", title: "Initial outreach to Merck BD", description: "Sent teaser document and requested CDA execution.", occurredAt: new Date("2024-03-05") },
  ];

  for (const a of activities) {
    await prisma.negotiationActivity.upsert({
      where: { id: a.id },
      update: {},
      create: a,
    });
  }
  console.log(`Seeded ${activities.length} activities`);

  // --- Clause Examples ---
  const clauses = [
    { id: "cl-001", dealId: "deal-001", clauseType: "TERMINATION" as const, clauseText: "Either party may terminate this Agreement upon 180 days prior written notice, provided that such termination shall not become effective until all ongoing clinical trials have been completed or wound down.", summary: "Standard termination for convenience with 180-day notice and trial protection.", favorability: "BALANCED", negotiationNotes: "Licensee pushes for 90-day notice. Insist on trial completion language." },
    { id: "cl-002", dealId: "deal-005", clauseType: "IP_OWNERSHIP" as const, clauseText: "All inventions made solely by Licensee personnel shall be owned by Licensee. Joint inventions shall be jointly owned, with each party having the right to exploit without accounting to the other.", summary: "Inventorship-based IP allocation with joint ownership.", favorability: "BALANCED", negotiationNotes: "Key: joint IP exploitation rights. Licensee may request exclusive license in territory." },
    { id: "cl-003", dealId: "deal-004", clauseType: "ANTI_SHELVING" as const, clauseText: "Licensee shall use Commercially Reasonable Efforts to develop and commercialize at least one Licensed Product in the Territory.", summary: "Anti-shelving requiring commercially reasonable efforts.", favorability: "LICENSOR_FAVORABLE", negotiationNotes: "Tie CRE to similarly situated company, not licensee portfolio prioritization." },
    { id: "cl-004", dealId: "deal-003", clauseType: "SUBLICENSING" as const, clauseText: "Licensee may grant sublicenses only with prior written consent of Licensor, not to be unreasonably withheld. Licensee remains responsible for sublicensee performance.", summary: "Sublicensing requires prior consent with reasonableness standard.", favorability: "LICENSOR_FAVORABLE", negotiationNotes: "Allow affiliate sublicensing freely, require consent for third parties." },
    { id: "cl-005", dealId: "deal-008", clauseType: "CHANGE_OF_CONTROL" as const, clauseText: "In the event of a Change of Control of Licensee, Licensor shall have the right to terminate if the acquiring entity is a Competitor.", summary: "CoC termination right triggered by competitor acquisition.", favorability: "LICENSOR_FAVORABLE", negotiationNotes: "Compromise: convert to additional milestones or require competitor definition." },
    { id: "cl-006", dealId: "deal-002", clauseType: "MILESTONE_DEF" as const, clauseText: "Development milestones payable upon: IND filing, first patient Phase 1/2/3, primary endpoint met, BLA/NDA filing, first regulatory approval.", summary: "Standard 7-event clinical milestone structure.", favorability: "BALANCED", negotiationNotes: "Key: milestone definition clarity on endpoint achievement." },
    { id: "cl-007", dealId: "deal-006", clauseType: "ROYALTY_STEP_DOWN" as const, clauseText: "Royalties reduced by 50% upon patent expiry; 25% if generic achieves 20%+ market share; aggregate reduction capped at 60%.", summary: "Royalty step-downs tied to patent expiry and generic competition.", favorability: "LICENSEE_FAVORABLE", negotiationNotes: "Negotiate for higher floors (max 40% reduction)." },
    { id: "cl-008", dealId: "deal-007", clauseType: "DISPUTE_RESOLUTION" as const, clauseText: "Disputes first referred to senior executives for 30 days, then binding ICC arbitration in New York with three arbitrators.", summary: "Tiered dispute resolution: executive escalation then ICC arbitration.", favorability: "BALANCED", negotiationNotes: "Venue selection often contested. Three arbitrators standard for >$100M deals." },
  ];

  for (const c of clauses) {
    await prisma.clauseExample.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }
  console.log(`Seeded ${clauses.length} clause examples`);

  // --- Term Sheets ---
  const termSheets = [
    {
      id: "ts-001",
      orgId: "org-default",
      title: "CRX-100 Phase 2 Oncology Out-License",
      assetName: "CRX-100",
      indication: "Non-small Cell Lung Cancer",
      modality: "Antibody-Drug Conjugate (ADC)",
      stage: "PHASE_2" as const,
      proposedUpfront: 300,
      proposedMilestones: 2100,
      proposedRoyaltyLow: 12,
      proposedRoyaltyHigh: 18,
      proposedTerritory: "Worldwide",
      proposedStructure: "Exclusive license with opt-in co-promote",
      milestoneSchedule: {
        development: [
          { event: "IND filing acceptance", amount: 25 },
          { event: "Phase 2 endpoint met", amount: 75 },
          { event: "Pivotal trial FPD", amount: 100 },
          { event: "BLA/NDA filing", amount: 150 },
          { event: "First approval (US)", amount: 200 },
          { event: "First approval (EU)", amount: 100 },
        ],
        commercial: [
          { event: "First commercial sale", amount: 150 },
          { event: "Net sales > $500M", amount: 300 },
          { event: "Net sales > $1B", amount: 500 },
          { event: "Net sales > $2B", amount: 500 },
        ],
      },
      royaltyTiers: [
        { threshold: 500, rate: 12 },
        { threshold: 1000, rate: 14 },
        { threshold: 2000, rate: 16 },
        { threshold: null, rate: 18 },
      ],
    },
    {
      id: "ts-002",
      orgId: "org-default",
      title: "CRX-200 ADC Platform Co-Development",
      assetName: "CRX-200 Platform",
      indication: "Solid Tumors",
      modality: "Antibody-Drug Conjugate (ADC)",
      stage: "PRECLINICAL" as const,
      proposedUpfront: 100,
      proposedMilestones: 1500,
      proposedRoyaltyLow: 8,
      proposedRoyaltyHigh: 14,
      proposedTerritory: "Worldwide ex-Greater China",
      proposedStructure: "Co-development with per-target opt-in",
    },
    {
      id: "ts-003",
      orgId: "org-default",
      title: "CRX-300 Gene Therapy License",
      assetName: "CRX-300",
      indication: "Rare Metabolic Disease",
      modality: "Gene Therapy",
      stage: "PHASE_1" as const,
      proposedUpfront: 175,
      proposedMilestones: 2200,
      proposedRoyaltyLow: 12,
      proposedRoyaltyHigh: 18,
      proposedTerritory: "Worldwide",
      proposedStructure: "Exclusive license with development milestones",
    },
  ];

  for (const ts of termSheets) {
    await prisma.termSheet.upsert({
      where: { id: ts.id },
      update: {},
      create: ts,
    });
  }
  console.log(`Seeded ${termSheets.length} term sheets`);

  // --- Action Items ---
  const actionItems = [
    { id: "ai-001", negotiationId: "neg-001", title: "Draft counter-proposal on royalty step-downs", assignedTo: "BD Lead", dueDate: new Date("2024-03-18"), status: "IN_PROGRESS" as const },
    { id: "ai-002", negotiationId: "neg-001", title: "Finalize CMC data package", assignedTo: "CMC Lead", dueDate: new Date("2024-03-20"), status: "OPEN" as const },
    { id: "ai-003", negotiationId: "neg-001", title: "Schedule IP allocation call", assignedTo: "BD Lead", dueDate: new Date("2024-03-15"), status: "COMPLETED" as const, completedAt: new Date("2024-03-14") },
    { id: "ai-004", negotiationId: "neg-002", title: "Prepare benchmarking deck for AZ", assignedTo: "BD Lead", dueDate: new Date("2024-03-22"), status: "OPEN" as const },
    { id: "ai-005", negotiationId: "neg-004", title: "Complete GMP batch release data", assignedTo: "CMC", dueDate: new Date("2024-04-01"), status: "IN_PROGRESS" as const },
    { id: "ai-006", negotiationId: "neg-004", title: "FTO opinion delivery", assignedTo: "Patent Counsel", dueDate: new Date("2024-03-28"), status: "OPEN" as const },
  ];

  for (const ai of actionItems) {
    await prisma.actionItem.upsert({
      where: { id: ai.id },
      update: {},
      create: ai,
    });
  }
  console.log(`Seeded ${actionItems.length} action items`);

  console.log("\nAll additional data seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
