/**
 * Sample Execution Plan — used as a preview/demo so users can see
 * the plan UI before running the AI agents (which require Anthropic credits).
 */

import type { ExecutionPlanOutput } from "@/types/hub";

export const SAMPLE_EXECUTION_PLAN: ExecutionPlanOutput = {
  overview:
    "Out-licensing of a Phase II oncology asset to a top-10 pharma. Recommended path: parallel outreach to 5 shortlisted partners over 8 weeks, structured term-sheet negotiation in weeks 9-16, due diligence + signing weeks 17-32, with regulatory and integration kickoff in weeks 33-36.",
  totalDurationWeeks: 36,
  phases: [
    {
      id: "p1",
      name: "Pre-Outreach Preparation",
      pillar: "Diagnosis",
      description:
        "Finalize asset profile, executive summary, non-confidential teaser, and data room. Align internal stakeholders on deal parameters and walk-away terms.",
      startWeek: 0,
      endWeek: 3,
      owner: "BD Lead",
      contributors: ["Legal Counsel", "Clinical Lead", "Regulatory Affairs"],
      deliverables: [
        "Executive summary deck (15 slides)",
        "Non-confidential teaser (2 pages)",
        "Data room structure & content audit",
        "Walk-away parameters approved by exec committee",
      ],
      dependsOn: [],
      successCriteria: "Materials approved by CEO and CMO; data room 80% populated.",
    },
    {
      id: "p2",
      name: "Partner Shortlist & Outreach",
      pillar: "Strategy",
      description:
        "Engage shortlisted partners simultaneously. NDA execution, initial pitch meetings, and gauge interest. Run parallel processes to maintain competitive tension.",
      startWeek: 3,
      endWeek: 8,
      owner: "BD Lead",
      contributors: ["Strategy Advisor", "Investment Banker"],
      deliverables: [
        "5 NDAs executed with shortlisted partners",
        "Initial pitch meetings completed",
        "Indication of interest letters from 3+ parties",
        "Bid solicitation document",
      ],
      dependsOn: ["p1"],
      successCriteria: "≥3 written indications of interest with preliminary value range.",
    },
    {
      id: "p3",
      name: "Term Sheet Negotiation",
      pillar: "Strategy",
      description:
        "Structured term-sheet exchange with shortlisted bidders. Iterate on key terms (upfront, milestones, royalties, territories). Down-select to lead bidder by week 14.",
      startWeek: 8,
      endWeek: 16,
      owner: "BD Lead",
      contributors: ["Outside Counsel", "CFO", "Strategy Advisor"],
      deliverables: [
        "Detailed term sheets from 3 bidders",
        "Term sheet comparison & financial modeling",
        "Lead bidder selected & non-binding term sheet executed",
      ],
      dependsOn: ["p2"],
      successCriteria: "Signed non-binding term sheet at or above target valuation.",
    },
    {
      id: "p4",
      name: "Due Diligence",
      pillar: "Execution",
      description:
        "Lead bidder conducts comprehensive diligence: clinical, regulatory, IP, manufacturing, commercial, financial, legal. Manage data room access and Q&A.",
      startWeek: 14,
      endWeek: 24,
      owner: "Diligence PM",
      contributors: [
        "Clinical Lead",
        "Regulatory Affairs",
        "IP Counsel",
        "Manufacturing Lead",
        "CFO",
        "Outside Counsel",
      ],
      deliverables: [
        "Complete data room with 100% required documents",
        "Diligence Q&A tracker (target 200+ questions)",
        "Site visits & expert sessions completed",
        "Diligence findings memo",
      ],
      dependsOn: ["p3"],
      successCriteria: "Diligence closed with no material new issues.",
    },
    {
      id: "p5",
      name: "Definitive Agreement Drafting",
      pillar: "Execution",
      description:
        "Draft and negotiate definitive license agreement, ancillary agreements (manufacturing, supply, transition services), and side letters. Board approvals.",
      startWeek: 22,
      endWeek: 30,
      owner: "Outside Counsel",
      contributors: ["Legal Counsel", "BD Lead", "CFO"],
      deliverables: [
        "Definitive license agreement (final draft)",
        "Manufacturing & supply agreement",
        "Disclosure schedules complete",
        "Board approvals secured (both sides)",
      ],
      dependsOn: ["p4"],
      successCriteria: "Both boards approve final agreement language.",
    },
    {
      id: "p6",
      name: "Signing & Announcement",
      pillar: "Execution",
      description:
        "Execute final documents, coordinate joint press release, file 8-K disclosures, brief analyst community.",
      startWeek: 30,
      endWeek: 32,
      owner: "BD Lead",
      contributors: ["IR Lead", "PR Lead", "Outside Counsel", "CFO"],
      deliverables: [
        "Definitive agreement signed",
        "Joint press release issued",
        "8-K filed with SEC",
        "Analyst briefing completed",
      ],
      dependsOn: ["p5"],
      successCriteria: "Public announcement and positive analyst reception.",
    },
    {
      id: "p7",
      name: "Closing & Transition",
      pillar: "Execution",
      description:
        "Antitrust clearances, regulatory transfer filings, knowledge transfer, JSC kick-off, upfront payment received.",
      startWeek: 32,
      endWeek: 36,
      owner: "Integration Lead",
      contributors: ["Regulatory Affairs", "Clinical Lead", "Manufacturing Lead", "CFO"],
      deliverables: [
        "Antitrust filings cleared (HSR / EU)",
        "IND/regulatory file transfer",
        "Joint Steering Committee kick-off meeting",
        "Upfront payment received and booked",
      ],
      dependsOn: ["p6"],
      successCriteria: "Closing achieved; first JSC meeting held.",
    },
  ],
  stakeholders: [
    {
      role: "BD Lead",
      involvement: "Lead",
      internalOrExternal: "Internal",
      responsibilities: [
        "Drive overall deal process and timeline",
        "Manage relationships with shortlisted partners",
        "Negotiate commercial terms",
        "Report progress to executive committee",
      ],
      phaseIds: ["p1", "p2", "p3", "p5", "p6"],
    },
    {
      role: "Legal Counsel (Internal)",
      involvement: "Contributor",
      internalOrExternal: "Internal",
      responsibilities: [
        "Coordinate with outside counsel on agreement drafting",
        "Manage IP portfolio review",
        "Internal compliance & approvals",
      ],
      phaseIds: ["p1", "p3", "p4", "p5"],
    },
    {
      role: "Outside Counsel",
      involvement: "Lead",
      internalOrExternal: "External",
      responsibilities: [
        "Draft definitive agreements",
        "Lead document negotiations",
        "Coordinate antitrust and regulatory filings",
      ],
      phaseIds: ["p3", "p4", "p5", "p6"],
    },
    {
      role: "Clinical Lead",
      involvement: "Contributor",
      internalOrExternal: "Internal",
      responsibilities: [
        "Provide clinical data and trial details",
        "Lead clinical diligence Q&A",
        "Support data room population",
      ],
      phaseIds: ["p1", "p4", "p7"],
    },
    {
      role: "Regulatory Affairs",
      involvement: "Contributor",
      internalOrExternal: "Internal",
      responsibilities: [
        "Provide regulatory history and correspondence",
        "Manage IND/BLA file transfer",
        "Liaise with FDA/EMA on transition",
      ],
      phaseIds: ["p1", "p4", "p7"],
    },
    {
      role: "CFO",
      involvement: "Approver",
      internalOrExternal: "Internal",
      responsibilities: [
        "Approve financial structure",
        "Lead financial diligence",
        "Sign off on agreements & milestones model",
      ],
      phaseIds: ["p3", "p4", "p5", "p7"],
    },
    {
      role: "Strategy Advisor",
      involvement: "Reviewer",
      internalOrExternal: "External",
      responsibilities: [
        "Validate market positioning & pricing",
        "Benchmark deal structure vs. precedents",
        "Advise on partner negotiation tactics",
      ],
      phaseIds: ["p2", "p3"],
    },
    {
      role: "Investment Banker",
      involvement: "Contributor",
      internalOrExternal: "External",
      responsibilities: [
        "Run structured outreach process",
        "Manage information flow & competitive tension",
        "Advise on valuation and term sheet evaluation",
      ],
      phaseIds: ["p2", "p3"],
    },
    {
      role: "IP Counsel",
      involvement: "Contributor",
      internalOrExternal: "External",
      responsibilities: [
        "Patent landscape review",
        "Freedom-to-operate analysis",
        "IP diligence Q&A",
      ],
      phaseIds: ["p4"],
    },
    {
      role: "Integration Lead",
      involvement: "Lead",
      internalOrExternal: "Internal",
      responsibilities: [
        "Plan and execute knowledge transfer",
        "Coordinate JSC formation",
        "Track post-signing milestones",
      ],
      phaseIds: ["p6", "p7"],
    },
  ],
  criticalMilestones: [
    {
      week: 3,
      milestone: "Outreach package approved",
      owner: "BD Lead",
      deliverable: "Exec summary, teaser, data room ready",
    },
    {
      week: 8,
      milestone: "≥3 indications of interest received",
      owner: "BD Lead",
      deliverable: "Written IOI letters with value range",
    },
    {
      week: 14,
      milestone: "Lead bidder selected",
      owner: "BD Lead",
      deliverable: "Down-select decision approved by exec",
    },
    {
      week: 16,
      milestone: "Non-binding term sheet executed",
      owner: "BD Lead",
      deliverable: "Signed term sheet at target valuation",
    },
    {
      week: 24,
      milestone: "Diligence closed",
      owner: "Diligence PM",
      deliverable: "Diligence findings memo, no material issues",
    },
    {
      week: 30,
      milestone: "Definitive agreement signed",
      owner: "Outside Counsel",
      deliverable: "Final license agreement executed",
    },
    {
      week: 36,
      milestone: "Closing & first JSC",
      owner: "Integration Lead",
      deliverable: "Closing achieved, upfront received, JSC held",
    },
  ],
  risks: [
    {
      risk: "Competing offers from larger pharmas drive down terms",
      impact: "High",
      likelihood: "Medium",
      mitigation:
        "Run parallel outreach to ≥5 partners; maintain competitive tension via IB; structure bid process with deadlines.",
      owner: "BD Lead",
    },
    {
      risk: "Lead bidder discovers unexpected clinical safety signal",
      impact: "High",
      likelihood: "Low",
      mitigation:
        "Pre-empt with thorough internal safety review and proactive disclosure in data room. Engage external safety expert.",
      owner: "Clinical Lead",
    },
    {
      risk: "Antitrust review delays closing beyond Q4 target",
      impact: "Medium",
      likelihood: "Medium",
      mitigation:
        "Engage antitrust counsel at term-sheet stage; pre-file HSR in week 30; prepare divestiture options if needed.",
      owner: "Outside Counsel",
    },
    {
      risk: "Patent cliff for adjacent assets reduces buyer enthusiasm",
      impact: "Medium",
      likelihood: "Low",
      mitigation:
        "Include lifecycle management options and reformulation IP in the package. Highlight new indications.",
      owner: "Strategy Advisor",
    },
    {
      risk: "Internal stakeholder misalignment on walk-away terms",
      impact: "Medium",
      likelihood: "Medium",
      mitigation:
        "Lock walk-away parameters in writing at exec committee in week 1; weekly steering committee touch-points.",
      owner: "BD Lead",
    },
    {
      risk: "Manufacturing transition delays milestone payments",
      impact: "Low",
      likelihood: "Medium",
      mitigation:
        "Negotiate transition services agreement with detailed timeline; align manufacturing capacity early.",
      owner: "Manufacturing Lead",
    },
  ],
  connections: [
    {
      from: "p1",
      to: "p2",
      type: "Sequential",
      description: "Outreach materials and data room must be ready before partner contact begins.",
    },
    {
      from: "p2",
      to: "p3",
      type: "Triggers",
      description: "Indications of interest from partners trigger formal term-sheet exchanges.",
    },
    {
      from: "p3",
      to: "p4",
      type: "Sequential",
      description: "Lead bidder selection must precede full diligence access.",
    },
    {
      from: "p4",
      to: "p5",
      type: "Parallel",
      description: "Late-stage diligence overlaps with definitive agreement drafting to compress timeline.",
    },
    {
      from: "p5",
      to: "p6",
      type: "Sequential",
      description: "Final agreement and board approvals required before public signing.",
    },
    {
      from: "p6",
      to: "p7",
      type: "Triggers",
      description: "Signing triggers antitrust filings and integration kick-off.",
    },
  ],
};
