import type { OperationRecord } from "@umbro/shared";
export const operationStore = new Map<string, OperationRecord>();
export const idempotencyStore = new Map<string, string>();
type Session = { token: string; publicKey: string; expiresAt: number };
export const sessionStore = new Map<string, Session>();
type LoginChallenge = { message: string; expiresAt: number };
export const loginChallengeStore = new Map<string, LoginChallenge>();
