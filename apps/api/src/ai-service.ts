import OpenAI from "openai";
import {
  aiAuditSchema,
  aiExplainSchema,
  aiPlanSchema,
  type AiAudit,
  type AiExplain,
  type AiPlan,
  type OperationRecord,
} from "@umbro/shared";
import { appConfig } from "./config";

const SYSTEM_PROMPT = `You are UmbraPrecision, a privacy-first treasury copilot for Solana teams using Umbra.
Umbra shields SPL balances into encrypted accounts and supports anonymous mixer transfers with selective compliance access.
Respond with valid JSON only. Never invent transaction signatures or wallet balances.
Prefer USDC mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v and atomic base units (1 USDC = 1000000).
Operation types: register, deposit (shield), withdraw (unshield).`;

const client = () =>
  new OpenAI({
    apiKey: appConfig.nvidiaApiKey,
    baseURL: appConfig.nvidiaBaseUrl,
  });

const extractJson = (content: string) => {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? content.trim();
  return JSON.parse(raw) as unknown;
};

const completeJson = async (userPrompt: string) => {
  const completion = await client().chat.completions.create({
    model: appConfig.nvidiaModel,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 1,
    top_p: 0.95,
    max_tokens: 2048,
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("AI returned an empty response");
  return extractJson(content);
};

const heuristicPlan = (prompt: string): AiPlan => {
  const lower = prompt.toLowerCase();
  const amountMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:usdc|usd)?/);
  const atomic = amountMatch ? String(Math.round(Number(amountMatch[1]) * 1_000_000)) : "1000000";
  const wantsWithdraw = /unshield|withdraw|cash out|public/.test(lower);
  const wantsRegister = /register|onboard|setup|first time/.test(lower);

  const recommendedOperations = wantsRegister
    ? [{ type: "register" as const, rationale: "Initialize Umbra encrypted account before moving funds privately." }]
    : [
        {
          type: (wantsWithdraw ? "withdraw" : "deposit") as "deposit" | "withdraw",
          mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          amount: atomic,
          rationale: wantsWithdraw
            ? "Move funds from encrypted balance back to a public wallet."
            : "Shield stablecoin balance into Umbra encrypted storage.",
        },
      ];

  return {
    summary: wantsWithdraw
      ? "Prepare an unshield flow that returns funds to the public wallet."
      : "Prepare a shield flow that hides the treasury balance on-chain.",
    recommendedOperations,
    privacyNotes: [
      "Encrypted balances hide amounts from public explorers while remaining non-custodial.",
      "Mixer transfers break deposit-withdraw linkage when you need stronger anonymity.",
    ],
    complianceNotes: [
      "Umbra supports selective viewing keys for auditors without exposing full history.",
      "Keep operation metadata in your app ledger for internal controls.",
    ],
    warnings: wantsWithdraw
      ? ["Unshielding reveals the destination wallet linkage on-chain."]
      : ["Shielding requires a funded public token account and Umbra registration."],
  };
};

const heuristicExplain = (topic: string): AiExplain => ({
  title: "Umbra treasury privacy",
  explanation: `UmbraPrecision routes ${topic} through Umbra encrypted balances on Solana devnet.`,
  privacyImpact: "Amounts stay confidential in encrypted accounts; public wallets only see queue and callback signatures.",
  suggestedNextSteps: [
    "Connect Phantom and sign the login challenge.",
    "Run register once, then shield or unshield USDC.",
    "Review the activity ledger before sharing an audit summary.",
  ],
});

const heuristicAudit = (operations: OperationRecord[]): AiAudit => {
  const confirmed = operations.filter((op) => op.status === "callback_confirmed").length;
  const failed = operations.filter((op) => op.status === "failed").length;

  return {
    headline: "Private treasury activity snapshot",
    summary: `Tracked ${operations.length} Umbra operations with ${confirmed} confirmed and ${failed} failed states.`,
    highlights: operations.slice(0, 5).map((op) => `${op.type} is ${op.status} (correlation ${op.correlationId})`),
    riskFlags: failed > 0 ? ["Retry or investigate failed operations before production treasury moves."] : [],
  };
};

export const planTreasuryMove = async (prompt: string, operations: OperationRecord[]): Promise<AiPlan> => {
  if (!appConfig.enableAi) return heuristicPlan(prompt);

  const payload = await completeJson(
    `Plan a treasury move from this prompt: ${prompt}
Recent operations (metadata only): ${JSON.stringify(
      operations.map((op) => ({
        type: op.type,
        status: op.status,
        mint: op.mint,
        amount: op.amount,
        correlationId: op.correlationId,
      })),
    )}
Return JSON matching: {"summary":string,"recommendedOperations":[{"type":"register"|"deposit"|"withdraw","mint"?:string,"amount"?:string,"rationale":string}],"privacyNotes":string[],"complianceNotes":string[],"warnings":string[]}`,
  );

  return aiPlanSchema.parse(payload);
};

export const explainTreasuryTopic = async (topic: string, operations: OperationRecord[]): Promise<AiExplain> => {
  if (!appConfig.enableAi) return heuristicExplain(topic);

  const payload = await completeJson(
    `Explain this Umbra treasury topic for a hackathon demo: ${topic}
Recent operations: ${JSON.stringify(operations.map((op) => ({ type: op.type, status: op.status })))}
Return JSON matching: {"title":string,"explanation":string,"privacyImpact":string,"suggestedNextSteps":string[]}`,
  );

  return aiExplainSchema.parse(payload);
};

export const summarizeAuditTrail = async (operations: OperationRecord[]): Promise<AiAudit> => {
  if (!appConfig.enableAi) return heuristicAudit(operations);

  const payload = await completeJson(
    `Create a compliance-friendly audit summary for these Umbra operation records without revealing private keys:
${JSON.stringify(
      operations.map((op) => ({
        type: op.type,
        status: op.status,
        mint: op.mint,
        amount: op.amount,
        correlationId: op.correlationId,
        queueSignature: op.queueSignature,
        callbackSignature: op.callbackSignature,
        failureReason: op.failureReason,
        createdAt: op.createdAt,
      })),
    )}
Return JSON matching: {"headline":string,"summary":string,"highlights":string[],"riskFlags":string[]}`,
  );

  return aiAuditSchema.parse(payload);
};
