import { z } from "zod";
export const operationTypes = ["register", "deposit", "withdraw"];
export const operationStatus = ["created", "submitted", "queued", "callback_confirmed", "failed", "retried"];
export const operationRequestSchema = z.object({
    type: z.enum(operationTypes), amount: z.string().optional(), mint: z.string().optional(), destinationAddress: z.string().optional(),
});
export const createOperationState = (input) => {
    const now = new Date().toISOString();
    return { ...input, status: "created", attempts: 0, createdAt: now, updatedAt: now };
};
export const transitionOperation = (op, patch) => ({
    ...op, ...patch, updatedAt: new Date().toISOString(),
});
export const isTerminalStatus = (status) => status === "callback_confirmed" || status === "failed";
export const aiPlanSchema = z.object({
    summary: z.string(),
    recommendedOperations: z.array(z.object({
        type: z.enum(operationTypes),
        mint: z.string().optional(),
        amount: z.string().optional(),
        rationale: z.string(),
    })),
    privacyNotes: z.array(z.string()),
    complianceNotes: z.array(z.string()),
    warnings: z.array(z.string()),
});
export const aiExplainSchema = z.object({
    title: z.string(),
    explanation: z.string(),
    privacyImpact: z.string(),
    suggestedNextSteps: z.array(z.string()),
});
export const aiAuditSchema = z.object({
    headline: z.string(),
    summary: z.string(),
    highlights: z.array(z.string()),
    riskFlags: z.array(z.string()),
});
export { buildComplianceReport, computePrivacyPosture, treasuryPlaybooks, } from "./treasury";
