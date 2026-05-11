import type { OperationRecord } from "./index";

export type TreasuryPlaybook = {
  id: string;
  title: string;
  audience: string;
  prompt: string;
  suggestedAmount: string;
  mint: string;
  benefits: string[];
};

export const treasuryPlaybooks: TreasuryPlaybook[] = [
  {
    id: "payroll",
    title: "Private payroll buffer",
    audience: "DAO ops and payroll admins",
    prompt: "Shield 5 USDC for monthly payroll while keeping amounts confidential on-chain.",
    suggestedAmount: "5000000",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    benefits: ["Hides payroll float from public explorers", "Keeps treasury intent off public dashboards"],
  },
  {
    id: "vendor",
    title: "Vendor settlement staging",
    audience: "Finance teams paying contractors",
    prompt: "Shield 2 USDC for vendor settlement and explain selective disclosure for auditors.",
    suggestedAmount: "2000000",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    benefits: ["Stages settlement privately before public payout", "Supports audit summaries without full history exposure"],
  },
  {
    id: "liquidity",
    title: "Emergency liquidity exit",
    audience: "Treasury managers under stress",
    prompt: "Unshield 1 USDC back to the public wallet and warn about linkage tradeoffs.",
    suggestedAmount: "1000000",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    benefits: ["Returns funds when public liquidity is required", "Surfaces privacy impact before execution"],
  },
];

export type PrivacyPosture = {
  score: number;
  label: "strong" | "balanced" | "exposed";
  shieldedMoves: number;
  unshieldedMoves: number;
  confirmedMoves: number;
  failedMoves: number;
  recommendations: string[];
  valuePoints: string[];
};

export const computePrivacyPosture = (operations: OperationRecord[]): PrivacyPosture => {
  const shieldedMoves = operations.filter((op) => op.type === "deposit").length;
  const unshieldedMoves = operations.filter((op) => op.type === "withdraw").length;
  const confirmedMoves = operations.filter((op) => op.status === "callback_confirmed").length;
  const failedMoves = operations.filter((op) => op.status === "failed").length;
  const totalMoves = operations.length;

  let score = 42;
  if (totalMoves > 0) score += Math.min(28, confirmedMoves * 8);
  if (shieldedMoves > unshieldedMoves) score += 12;
  if (failedMoves > 0) score -= failedMoves * 10;
  if (operations.some((op) => op.type === "register" && op.status === "callback_confirmed")) score += 8;
  score = Math.max(0, Math.min(100, score));

  const label = score >= 75 ? "strong" : score >= 50 ? "balanced" : "exposed";
  const recommendations = [
    failedMoves > 0 ? "Resolve failed Umbra operations before moving production treasury funds." : "No failed operations detected in the current ledger.",
    shieldedMoves === 0 ? "Run at least one shield flow before relying on encrypted balances." : "Maintain a shielded buffer for recurring treasury outflows.",
    unshieldedMoves > shieldedMoves ? "Recent unshield activity increases public linkage risk." : "Shield-heavy activity supports stronger confidentiality.",
  ];

  const valuePoints = [
    "Encrypted balances keep treasury amounts off public Solana explorers.",
    "AI planning reduces operational mistakes for non-specialist treasury teams.",
    "Audit summaries support compliance without publishing full transaction history.",
  ];

  return {
    score,
    label,
    shieldedMoves,
    unshieldedMoves,
    confirmedMoves,
    failedMoves,
    recommendations,
    valuePoints,
  };
};

export const buildComplianceReport = (operations: OperationRecord[], auditSummary?: string) => {
  const posture = computePrivacyPosture(operations);
  const lines = [
    "# UmbraPrecision compliance packet",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Privacy posture: ${posture.score}/100 (${posture.label})`,
    "",
    "## Why this system matters",
    "- Teams can operate a private treasury on Solana without giving up wallet custody.",
    "- Umbra encrypted balances hide amounts while preserving on-chain settlement guarantees.",
    "- AI copilots translate treasury intent into safer Umbra flows and audit-ready summaries.",
    "",
    "## Ledger snapshot",
    ...operations.map(
      (op) =>
        `- ${op.createdAt} | ${op.type} | ${op.status} | correlation ${op.correlationId}${
          op.failureReason ? ` | failure ${op.failureReason}` : ""
        }`,
    ),
    "",
    "## Recommendations",
    ...posture.recommendations.map((item) => `- ${item}`),
  ];

  if (auditSummary) {
    lines.push("", "## AI audit summary", auditSummary);
  }

  return lines.join("\n");
};
