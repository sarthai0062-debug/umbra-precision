import { z } from "zod";

export const operationTypes = ["register", "deposit", "withdraw"] as const;
export type OperationType = (typeof operationTypes)[number];

export const operationStatus = ["created","submitted","queued","callback_confirmed","failed","retried"] as const;
export type OperationStatus = (typeof operationStatus)[number];

export const operationRequestSchema = z.object({
  type: z.enum(operationTypes), amount: z.string().optional(), mint: z.string().optional(), destinationAddress: z.string().optional(),
});
export type OperationRequest = z.infer<typeof operationRequestSchema>;

export type OperationRecord = {
  id: string; userPublicKey: string; type: OperationType; status: OperationStatus;
  amount?: string; mint?: string; destinationAddress?: string;
  idempotencyKey: string; correlationId: string; queueSignature?: string; callbackSignature?: string;
  failureReason?: string; createdAt: string; updatedAt: string; attempts: number;
};

export const createOperationState = (input: Omit<OperationRecord, "status" | "attempts" | "createdAt" | "updatedAt">): OperationRecord => {
  const now = new Date().toISOString();
  return { ...input, status: "created", attempts: 0, createdAt: now, updatedAt: now };
};

export const transitionOperation = (op: OperationRecord, patch: Partial<OperationRecord> & Pick<OperationRecord, "status">): OperationRecord => ({
  ...op, ...patch, updatedAt: new Date().toISOString(),
});

export const isTerminalStatus = (status: OperationStatus): boolean => status === "callback_confirmed" || status === "failed";

export const aiPlanSchema = z.object({
  summary: z.string(),
  recommendedOperations: z.array(
    z.object({
      type: z.enum(operationTypes),
      mint: z.string().optional(),
      amount: z.string().optional(),
      rationale: z.string(),
    }),
  ),
  privacyNotes: z.array(z.string()),
  complianceNotes: z.array(z.string()),
  warnings: z.array(z.string()),
});
export type AiPlan = z.infer<typeof aiPlanSchema>;

export const aiExplainSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  privacyImpact: z.string(),
  suggestedNextSteps: z.array(z.string()),
});
export type AiExplain = z.infer<typeof aiExplainSchema>;

export const aiAuditSchema = z.object({
  headline: z.string(),
  summary: z.string(),
  highlights: z.array(z.string()),
  riskFlags: z.array(z.string()),
});
export type AiAudit = z.infer<typeof aiAuditSchema>;

export {
  buildComplianceReport,
  computePrivacyPosture,
  treasuryPlaybooks,
  type PrivacyPosture,
  type TreasuryPlaybook,
} from "./treasury.js";
