import { appConfig } from "./config.js";
import type { OperationRequest } from "@umbro/shared";
export const validatePolicy = (request: OperationRequest) => {
  if (request.type === "register") return;
  if (!request.mint || !appConfig.allowedMints.includes(request.mint)) throw new Error("Mint not allowed by policy");
  if (!request.amount) throw new Error("Amount is required");
  const atomic = BigInt(request.amount);
  if (atomic < appConfig.minAmountAtomic) throw new Error("Amount below minimum policy threshold");
  if (atomic > appConfig.maxAmountAtomic) throw new Error("Amount above maximum policy threshold");
};
