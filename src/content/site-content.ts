export type Service = {
  id: string;
  title: string;
  description: string;
};

export const contactEmail = "mirza@10x.ai";

export const services: Service[] = [
  {
    id: "001",
    title: "Strategic Planning",
    description:
      "Roadmap design, capability sequencing, and stack decisions tied to enterprise priorities.",
  },
  {
    id: "002",
    title: "Technical Due Diligence",
    description:
      "Independent assessment for investment and M&A decisions across architecture, risk, and scale readiness.",
  },
  {
    id: "003",
    title: "Operational Review",
    description:
      "Process and team diagnostics to remove delivery friction and improve throughput in critical workflows.",
  },
  {
    id: "004",
    title: "Board Advisory",
    description:
      "Structured leadership briefings for strategy decisions, market positioning, and portfolio governance.",
  },
];

export const engagementPoints = [
  "One operating view across business, IT, risk, and delivery leadership.",
  "Structured stage-gate decisions to scale, redesign, or retire initiatives.",
  "Explicit ownership and cadence to reduce cross-functional execution drift.",
  "Decision packs designed for executive and board-level clarity.",
];

export const terms = [
  { label: "Commitment", value: "Quarterly minimum" },
  { label: "Response", value: "Within 48 business hours" },
  { label: "Format", value: "Remote support + quarterly sessions" },
  { label: "Availability", value: "Business hours EST" },
];

export const proofPoints = [
  { label: "Response SLA", value: "48 Hours" },
  { label: "Engagement Cadence", value: "Quarterly Reviews" },
  { label: "Coverage", value: "Board to Delivery" },
];
