/**
 * Sample Out-Licensing Strategy Report — preview/demo for the simulated plan page.
 * Modeled on a Phase II oncology asset with realistic regional dynamics.
 */

import type { OutLicensingReport } from "@/types/hub";

export const SAMPLE_OUT_LICENSING_REPORT: OutLicensingReport = {
  executiveSummary:
    "This Phase II oncology asset (anti-CD47 mAb) presents a strong out-licensing opportunity with $2.1B–$3.4B total deal value potential across regions. Highest-priority recommendation is US territory licensing to a top-10 oncology pharma (BMS, Merck, or AstraZeneca), with parallel EU rights to Roche or Novartis. Japan and China offer attractive secondary opportunities with regional partners (Takeda, Innovent). The asset's clean safety profile (FAERS), composition-of-matter patent runway through 2034, and emerging Phase II efficacy signal (3 trials, 47% ORR vs. 22% SoC) support premium valuation. Market dynamics favor immediate action: the CD47 space is consolidating after Gilead/Forty Seven and Pfizer/Trillium precedents, and competing assets are entering Phase III in 2026.",

  assetProfile: {
    name: "CTX-4100 (anti-CD47 monoclonal antibody)",
    description:
      "Differentiated anti-CD47 IgG4 monoclonal antibody with engineered Fc to minimize hematologic toxicity. Targeting solid tumors with expansion into hematologic malignancies. Demonstrated 47% ORR in Phase II MSS colorectal cancer cohort, with manageable safety profile and no Grade 4+ anemia events.",
    modality: "Monoclonal Antibody (IgG4 engineered Fc)",
    therapeuticArea: "Oncology — Solid Tumors / Hematologic Malignancies",
    developmentStage: "Phase II",
    mechanism: "Anti-CD47 / SIRPα checkpoint inhibition (innate immune)",
    currentMarkets: ["US"],
    keyStrengths: [
      "Best-in-class hematologic safety profile (no Grade 4+ anemia in 156 patients per FAERS)",
      "Clean composition-of-matter patent runway to 2034 (US-10,123,456)",
      "47% ORR in Phase II MSS CRC vs. 22% SoC (clinically meaningful)",
      "Orphan Drug designation in MSS CRC (US, Sep 2025)",
      "Strong KOL support — 3 lead investigators are NCCN guideline panel members",
    ],
    keyChallenges: [
      "Competing assets: 4 anti-CD47 mAbs in Phase II/III globally",
      "China requires local clinical data (NMPA bridging study needed)",
      "Manufacturing capacity limited — only 200kg/yr at current CDMO",
      "Limited Asian market presence; no current partner in JP/CN",
      "Reimbursement uncertain in EU markets (HTA challenges expected)",
    ],
    keyDataPoints: [
      { label: "FDA IND Date", value: "2022-03-14", source: "OpenFDA Drugs@FDA" },
      { label: "Active Trials", value: "3 (Ph II ongoing)", source: "ClinicalTrials.gov" },
      { label: "FAERS Reports", value: "12 total", source: "FDA FAERS" },
      { label: "Composition Patent Expiry", value: "2034-08-12", source: "Orange Book" },
      { label: "Recent Comparable Deal", value: "Pfizer–Trillium $2.3B", source: "SEC EDGAR" },
      { label: "EU EMA Status", value: "Not yet filed", source: "EMA ePI" },
    ],
  },

  regionalAnalysis: [
    {
      region: "US",
      regionLabel: "United States",
      attractiveness: "Very High",
      attractivenessScore: 92,
      market: {
        sizeUSD: "$8.4B",
        growthRate: "12.3% CAGR (2026-2032)",
        drivers: [
          "Aging population — 1.9M new cancer cases/yr",
          "Premium reimbursement for novel oncology mechanisms",
          "Strong KOL ecosystem at top NCI cancer centers",
          "Accelerated approval pathways (FDA Project FrontRunner)",
        ],
        barriers: [
          "Crowded checkpoint space with 60+ assets",
          "ICER pricing scrutiny on new oncology launches",
        ],
        unmetNeed: "MSS CRC 3rd-line: 5-year survival <14%, currently no checkpoint options approved",
      },
      legal: {
        regulatoryAuthority: "FDA (CBER for biologics)",
        pathway: "BLA with potential Accelerated Approval",
        estimatedTimeline: "10-12 months from BLA filing",
        exclusivityOpportunities: [
          "Orphan Drug Exclusivity (7 years) for MSS CRC",
          "Reference Product Exclusivity (12 years from BLA)",
          "Pediatric Exclusivity option (+6 months)",
        ],
        barriers: [
          "Required confirmatory Phase III for Accelerated Approval",
          "REMS likely required given prior CD47 hematologic concerns",
        ],
      },
      commercial: {
        competitorActivity:
          "Magrolimab (Gilead/Forty Seven $4.9B) discontinued 2024 due to safety. ALX148 (Pfizer/Trillium $2.3B) in Ph II. ZL-1310 (Zai Lab) Ph I.",
        pricingDynamics: "Reference oncology mAbs: $150K-$200K/yr. CD47 likely premium positioned at $180K-$220K/yr.",
        reimbursementLandscape:
          "Medicare Part B coverage standard for oncology biologics. Commercial payer scrutiny via ICER. Prior authorization likely.",
        keyPartnerCandidates: [
          "Bristol Myers Squibb (Opdivo combo strategy)",
          "Merck (Keytruda IO portfolio expansion)",
          "AstraZeneca (Imfinzi GI cancer focus)",
          "Pfizer (existing CD47 program at Trillium)",
        ],
        distributionChannels: "Specialty pharmacy + buy-and-bill model. Top 50 academic cancer centers + community oncology",
      },
      ip: {
        patentStrength: "Strong",
        ftoStatus: "Clear",
        expirationRisks: [
          "Composition patent US-10,123,456 expires 2034-08-12",
          "Method patent for combo with anti-PD1 expires 2036-04-22",
        ],
        opportunities: [
          "Method patents for MSS CRC indication (filed 2024)",
          "Formulation patents for SC delivery (in preparation)",
          "Combination patents with TIGIT, LAG-3 assets",
        ],
        estimatedExclusivityYears: 12,
      },
    },
    {
      region: "EU",
      regionLabel: "European Union",
      attractiveness: "High",
      attractivenessScore: 78,
      market: {
        sizeUSD: "$5.2B",
        growthRate: "9.8% CAGR (2026-2032)",
        drivers: [
          "EMA centralized procedure provides single market entry",
          "Strong oncology infrastructure in DE/FR/IT/ES/UK",
          "PRIME designation potential for innovative oncology",
        ],
        barriers: [
          "HTA scrutiny — NICE, G-BA, HAS demand robust comparative data",
          "Reference pricing pressures from peripheral markets",
          "Brexit complexity for UK access",
        ],
        unmetNeed: "MSS CRC: ~150K new diagnoses/yr in EU, no immune-based therapies approved",
      },
      legal: {
        regulatoryAuthority: "EMA (CHMP)",
        pathway: "Centralized MAA, potential PRIME designation",
        estimatedTimeline: "12-15 months from MAA filing",
        exclusivityOpportunities: [
          "Orphan Drug Exclusivity (10 years) for MSS CRC",
          "Data Exclusivity (8 years) + Market Protection (10 years)",
          "Pediatric Investigation Plan extension",
        ],
        barriers: [
          "Country-by-country reimbursement post-EMA approval",
          "Potential mandatory cost-effectiveness analysis (ICER thresholds)",
        ],
      },
      commercial: {
        competitorActivity:
          "Roche/Genentech and Novartis have established CD47 research programs but no Phase III assets. AstraZeneca has UK origin advantage for oncology launches.",
        pricingDynamics: "30-40% lower than US pricing. Reference pricing driven by lowest-priced market.",
        reimbursementLandscape: "JCB/HTA negotiation in DE; NICE in UK; HAS in FR; AIFA in IT. 12-18 month delay post-approval typical.",
        keyPartnerCandidates: [
          "Roche (Genentech parent, oncology #1)",
          "Novartis (oncology + biosimilars expertise)",
          "Sanofi (oncology rebuilding strategy)",
          "Merck KGaA (Erbitux GI cancer franchise)",
        ],
        distributionChannels: "Hospital-only dispensing in most EU markets. National tender systems for drug procurement.",
      },
      ip: {
        patentStrength: "Strong",
        ftoStatus: "Clear",
        expirationRisks: [
          "EP patent EP3456789 expires 2034 (parallel to US)",
          "Risk of biosimilar entry post-2034 due to faster EU biosimilar pathway",
        ],
        opportunities: [
          "SPC extension possible (up to 5 additional years)",
          "Pediatric extension (+6 months SPC)",
        ],
        estimatedExclusivityYears: 11,
      },
    },
    {
      region: "JP",
      regionLabel: "Japan",
      attractiveness: "High",
      attractivenessScore: 74,
      market: {
        sizeUSD: "$2.1B",
        growthRate: "7.5% CAGR (2026-2032)",
        drivers: [
          "Sakigake (PRIORITY) designation possible for oncology",
          "Premium pricing for innovative oncology (up to 100% innovation premium)",
          "Aging population — highest cancer incidence in OECD",
        ],
        barriers: [
          "Local clinical data often required (PMDA bridging)",
          "Biennial NHI price revisions reduce launch prices over time",
        ],
        unmetNeed: "GI cancers (gastric, CRC) — 2nd leading cancer death cause in Japan",
      },
      legal: {
        regulatoryAuthority: "PMDA (under MHLW)",
        pathway: "Standard NDA or Sakigake fast-track",
        estimatedTimeline: "12-18 months",
        exclusivityOpportunities: [
          "Re-examination period (8 years for orphan)",
          "Pediatric extension under MHLW initiative",
        ],
        barriers: [
          "Bridging study often mandated (~$15-30M, 18 months)",
          "Biennial NHI price cuts (5-15% per cycle)",
        ],
      },
      commercial: {
        competitorActivity:
          "Takeda has global oncology footprint. Astellas, Daiichi Sankyo, and Ono are aggressive in oncology. Limited domestic CD47 competition.",
        pricingDynamics: "Premium launch via cost+innovation method. NHI negotiates downward over time.",
        reimbursementLandscape: "Universal coverage via NHI. Listing within 60-90 days post-approval. Premium pricing for first-in-class.",
        keyPartnerCandidates: [
          "Takeda (global oncology, US-Japan flow)",
          "Daiichi Sankyo (T-DXd oncology momentum)",
          "Astellas (Padcev/Xtandi platform)",
          "Ono Pharmaceutical (Opdivo origin)",
        ],
        distributionChannels: "Hospital-distributed via specialty wholesalers. Top 100 cancer hospitals = 70% of volume.",
      },
      ip: {
        patentStrength: "Strong",
        ftoStatus: "Clear",
        expirationRisks: [
          "JP patent expires 2034 parallel to US",
          "Generic/biosimilar pathway less mature than EU",
        ],
        opportunities: [
          "Method patent application filed in JP (2024)",
          "Combination patents with Japanese-origin assets (Opdivo, etc.)",
        ],
        estimatedExclusivityYears: 11,
      },
    },
    {
      region: "CN",
      regionLabel: "China",
      attractiveness: "Medium",
      attractivenessScore: 62,
      market: {
        sizeUSD: "$3.8B",
        growthRate: "16.2% CAGR (2026-2032)",
        drivers: [
          "World's 2nd largest oncology market by volume",
          "NMPA reform accelerating approvals (2-3 years)",
          "Volume-Based Procurement (VBP) for biosimilars boosting innovator pricing for novel agents",
          "GI cancer epidemiology — highest incidence globally",
        ],
        barriers: [
          "Local clinical data required (NMPA bridging)",
          "VBP price compression risk for older mechanisms",
          "IP enforcement historically weaker (improving)",
          "Geopolitical/trade tensions affecting BD",
        ],
        unmetNeed: "Gastric cancer (470K new cases/yr), MSS CRC (530K new cases/yr)",
      },
      legal: {
        regulatoryAuthority: "NMPA (under NHC)",
        pathway: "China-specific NDA, possible BTD",
        estimatedTimeline: "18-24 months with bridging study",
        exclusivityOpportunities: [
          "5-year monitoring period for new chemical entities",
          "Patent linkage system (improving)",
          "Inclusion in National Reimbursement Drug List (NRDL)",
        ],
        barriers: [
          "Bridging study mandatory ($20-40M)",
          "Annual NRDL price negotiations (can cut 50%+)",
          "Local production preference",
        ],
      },
      commercial: {
        competitorActivity:
          "Innovent (IBI188 anti-CD47 in Ph II), I-Mab (lemzoparlimab partnered with AbbVie), BeiGene aggressive in oncology. Local biotechs cost-competitive.",
        pricingDynamics: "Launch at 50-70% of US price; further NRDL negotiations 30-50% reduction.",
        reimbursementLandscape: "NRDL inclusion = 80% volume but ~50% price. Out-of-pocket market for premium.",
        keyPartnerCandidates: [
          "Innovent (anti-CD47 expertise, Roche partnership)",
          "BeiGene (global oncology + China leadership)",
          "Hutchmed (oncology specialist, China-first)",
          "Junshi (Tuoyi PD-1 in solid tumors)",
        ],
        distributionChannels: "Tertiary hospitals (Class III) + DTP pharmacies. NRDL inclusion expands to county hospitals.",
      },
      ip: {
        patentStrength: "Moderate",
        ftoStatus: "Some Risk",
        expirationRisks: [
          "Faster biosimilar entry possible after 2034",
          "Patent linkage less robust than US/EU",
          "Compulsory licensing risk for high-priced essential medicines",
        ],
        opportunities: [
          "Chinese composition patent granted (2023)",
          "Method patent applications pending",
        ],
        estimatedExclusivityYears: 9,
      },
    },
    {
      region: "ROW",
      regionLabel: "Rest of World (LatAm, MEA, APAC ex-JP/CN)",
      attractiveness: "Medium",
      attractivenessScore: 55,
      market: {
        sizeUSD: "$1.6B",
        growthRate: "11.4% CAGR (2026-2032)",
        drivers: [
          "Growing middle class in BRICS markets",
          "Brazilian ANVISA and Indian CDSCO accepting US/EU dossiers",
          "Australia/Canada offer premium developed markets",
          "South Korea, Taiwan oncology spending growing",
        ],
        barriers: [
          "Fragmented regulatory landscape (40+ jurisdictions)",
          "Lower per-capita healthcare spending",
          "Currency volatility (LatAm, EMEA)",
          "Cold chain logistics for biologics",
        ],
        unmetNeed: "Brazil/Mexico: 200K new cancer diagnoses/yr each. Limited oncology biologic access.",
      },
      legal: {
        regulatoryAuthority: "Multiple — ANVISA (Brazil), CDSCO (India), TGA (Australia), Health Canada, MFDS (Korea)",
        pathway: "Reliance on US FDA / EMA approvals + local registration",
        estimatedTimeline: "6-18 months per market post-FDA/EMA",
        exclusivityOpportunities: [
          "Data exclusivity 5-10 years (varies by market)",
          "Patent extension via PCT in major markets",
          "Most-favored-nation pricing avoidance",
        ],
        barriers: [
          "Reference pricing tied to LatAm/AU prices can leak globally",
          "Compulsory licensing precedent in Brazil/India for key disease areas",
        ],
      },
      commercial: {
        competitorActivity:
          "Established US/EU pharmas (Roche, Merck, BMS) have ROW affiliates. Local champions (Cipla, Sun Pharma, EMS, Bayer LatAm) for distribution.",
        pricingDynamics: "30-60% of US pricing. International reference pricing risk.",
        reimbursementLandscape: "Public+private mix. Brazil SUS, Mexico IMSS, Indian state programs. Out-of-pocket significant in MEA.",
        keyPartnerCandidates: [
          "Roche/Genentech (global affiliate network)",
          "Cipla (India, Africa specialty oncology)",
          "EMS (Brazil leader)",
          "Sun Pharma (India global expansion)",
          "Pfizer (regional distribution)",
        ],
        distributionChannels: "Hospital tenders + specialty wholesalers + private oncology centers.",
      },
      ip: {
        patentStrength: "Moderate",
        ftoStatus: "Clear",
        expirationRisks: [
          "Compulsory licensing risk in Brazil/India for unmet need",
          "Variable patent enforcement",
        ],
        opportunities: [
          "PCT filings in 50+ jurisdictions",
          "Trade secret protection for manufacturing process",
        ],
        estimatedExclusivityYears: 8,
      },
    },
  ],

  recommendations: [
    {
      priorityRank: 1,
      targetRegion: "US",
      rationale:
        "Highest economic value capture. Recent CD47 precedents (Pfizer-Trillium $2.3B, Gilead-Forty Seven $4.9B) establish premium baseline. BMS is most logical partner given Opdivo combination strategy and gap in CD47. Phase II data from Q1 2026 readouts position asset for term sheet by Q2 2026.",
      recommendedDealStructure: "Out-licensing US territory exclusive with milestone-driven Asia option",
      estimatedValue: {
        upfront: "$300M",
        total: "$1.8B-$2.4B",
        royaltyRange: "12-18% tiered",
      },
      topPartnerCandidates: ["Bristol Myers Squibb", "Merck (US)", "AstraZeneca"],
      prerequisites: [
        "Phase II MSS CRC primary readout (Q1 2026)",
        "FDA Type C meeting on Ph III design",
        "CMC scale-up plan (commercial-grade)",
      ],
      estimatedTimeline: "9-12 months to signing",
      expectedROI: "4-6x at peak sales vs. internal commercialization",
    },
    {
      priorityRank: 2,
      targetRegion: "EU",
      rationale:
        "Run parallel with US to maximize valuation through competitive tension. Roche/Genentech is ideal — has global oncology infrastructure, no internal CD47 program, and has actively done large oncology BD ($X.XB Spark, etc.). EMA centralized procedure simplifies launch.",
      recommendedDealStructure: "Out-licensing EU territory with co-development option for ROW",
      estimatedValue: {
        upfront: "$180M",
        total: "$900M-$1.2B",
        royaltyRange: "10-15%",
      },
      topPartnerCandidates: ["Roche", "Novartis", "Merck KGaA"],
      prerequisites: [
        "PRIME designation submission",
        "EU KOL engagement plan",
        "HTA strategy for top 5 EU markets",
      ],
      estimatedTimeline: "10-14 months to signing",
      expectedROI: "3-4x at peak sales",
    },
    {
      priorityRank: 3,
      targetRegion: "JP",
      rationale:
        "Premium pricing opportunity via Sakigake. Takeda is preferred — strong global oncology, US-JP capability, and recent expansion into solid tumors. Daiichi Sankyo aggressive on T-DXd may want a CD47 angle.",
      recommendedDealStructure: "Japan-only out-licensing with bridging study commitment",
      estimatedValue: {
        upfront: "$80M",
        total: "$400M-$550M",
        royaltyRange: "8-13%",
      },
      topPartnerCandidates: ["Takeda", "Daiichi Sankyo", "Astellas"],
      prerequisites: [
        "Sakigake designation application",
        "PMDA bridging study protocol",
      ],
      estimatedTimeline: "12-15 months",
      expectedROI: "2.5-3.5x",
    },
    {
      priorityRank: 4,
      targetRegion: "CN",
      rationale:
        "Strategic but lower-priority due to local CD47 competition. Innovent is best partner — has anti-CD47 expertise from IBI188 program and Roche relationship. Wait until US/EU deals signed to maintain leverage.",
      recommendedDealStructure: "China region license + co-development with local clinical commitment",
      estimatedValue: {
        upfront: "$50M",
        total: "$300M-$450M",
        royaltyRange: "6-10%",
      },
      topPartnerCandidates: ["Innovent", "BeiGene", "Hutchmed"],
      prerequisites: [
        "NMPA pre-IND meeting",
        "Local manufacturing assessment",
        "IP enforcement strategy",
      ],
      estimatedTimeline: "15-20 months",
      expectedROI: "2-3x",
    },
    {
      priorityRank: 5,
      targetRegion: "ROW",
      rationale:
        "Bundle remaining territories (LatAm, MEA, ANZ, APAC ex-JP/CN) with regional or global partner who already has BD capacity in these markets. Lower per-deal value but accretive if structured efficiently.",
      recommendedDealStructure: "ROW bundle with established regional/global partner",
      estimatedValue: {
        upfront: "$30M",
        total: "$200M-$300M",
        royaltyRange: "5-9%",
      },
      topPartnerCandidates: ["Roche (global)", "Cipla", "EMS (Brazil)"],
      prerequisites: ["Partner shortlist from primary deals"],
      estimatedTimeline: "18-24 months (post-primary deals)",
      expectedROI: "1.5-2.5x",
    },
  ],

  portfolioRisks: [
    {
      category: "Market",
      risk: "Competing CD47 assets reach Phase III before our regulatory filings, eroding first-mover advantage",
      affectedRegions: ["US", "EU", "JP", "CN"],
      impact: "High",
      likelihood: "Medium",
      mitigation: "Accelerate Ph III initiation; explore combination strategies with PD-1/L1 to differentiate; secure orphan designations to delay competition.",
    },
    {
      category: "Market",
      risk: "Reimbursement rejection by ICER/NICE/G-BA limits pricing power",
      affectedRegions: ["US", "EU"],
      impact: "Medium",
      likelihood: "Medium",
      mitigation: "Engage HEOR consultancy in Ph II; design value framework demonstrating cost-per-QALY <$150K; preempt with payer advisory boards.",
    },
    {
      category: "Legal",
      risk: "FDA requires confirmatory Phase III before Accelerated Approval — extends timeline to 2030+",
      affectedRegions: ["US"],
      impact: "High",
      likelihood: "Low",
      mitigation: "FDA Type B/C meetings to align on accelerated approval pathway; design adaptive Ph III to enable faster confirmation.",
    },
    {
      category: "Legal",
      risk: "Patent challenge via IPR proceedings in US (PTAB) post-launch",
      affectedRegions: ["US"],
      impact: "High",
      likelihood: "Low",
      mitigation: "Strengthen patent portfolio with method, formulation, dosing patents; engage outside IP counsel for portfolio audit.",
    },
    {
      category: "Commercial",
      risk: "Top-tier partner walks away after diligence due to manufacturing capacity limits",
      affectedRegions: ["US", "EU"],
      impact: "Medium",
      likelihood: "Medium",
      mitigation: "Pre-negotiate CDMO commitments for 1,500kg/yr capacity scale; secure dual-source manufacturing.",
    },
    {
      category: "Commercial",
      risk: "Pfizer/Trillium asset reaches market first and captures KOL preference",
      affectedRegions: ["US", "EU"],
      impact: "Medium",
      likelihood: "Medium",
      mitigation: "Differentiate via best-in-class safety profile; focus on MSS CRC where Trillium not pursuing; KOL engagement.",
    },
    {
      category: "IP",
      risk: "China NMPA grants compulsory license citing high price during NRDL negotiation",
      affectedRegions: ["CN"],
      impact: "Medium",
      likelihood: "Low",
      mitigation: "Voluntary tiered pricing for China; partner with local Chinese pharma to align with national priorities.",
    },
    {
      category: "IP",
      risk: "EU biosimilar entry post-2034 erodes residual revenue faster than US",
      affectedRegions: ["EU"],
      impact: "Medium",
      likelihood: "High",
      mitigation: "Pursue SPC extensions; build life-cycle management with reformulation patents (SC, oral); next-gen successor program.",
    },
  ],

  dataConfidence: "High",
  sourcesUsed: [
    "SEC EDGAR",
    "ClinicalTrials.gov",
    "OpenFDA Drugs@FDA",
    "FDA FAERS",
    "Orange Book",
    "DailyMed",
    "RxNorm",
    "EMA ePI",
    "Health Canada DPD",
    "ChEMBL",
    "PubMed",
    "Patents",
    "Google News",
  ],
};
