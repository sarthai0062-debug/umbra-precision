import { randomUUID } from "node:crypto";
import {
  createOperationState,
  operationRequestSchema,
  transitionOperation,
  type OperationRecord,
  type OperationRequest,
} from "@umbro/shared";
import { idempotencyStore, operationStore } from "./store.js";
import { umbraService } from "./umbra-service.js";
import { validatePolicy } from "./policy.js";

const queuedForRetry = new Set<string>();

export const listOperations = (publicKey: string) =>
  Array.from(operationStore.values()).filter((op) => op.userPublicKey === publicKey);

export const getOperation = (id: string, publicKey: string) => {
  const op = operationStore.get(id);
  if (!op || op.userPublicKey !== publicKey) return null;
  return op;
};

export const createOperation = async (
  userPublicKey: string,
  body: unknown,
  idempotencyKey: string,
): Promise<OperationRecord> => {
  const request = operationRequestSchema.parse(body) as OperationRequest;
  validatePolicy(request);

  const priorId = idempotencyStore.get(`${userPublicKey}:${idempotencyKey}`);
  if (priorId) {
    const prior = operationStore.get(priorId);
    if (!prior) throw new Error("Idempotency state corrupt");
    return prior;
  }

  const op = createOperationState({
    id: randomUUID(),
    userPublicKey,
    type: request.type,
    amount: request.amount,
    mint: request.mint,
    destinationAddress: request.destinationAddress,
    idempotencyKey,
    correlationId: randomUUID(),
  });

  operationStore.set(op.id, op);
  idempotencyStore.set(`${userPublicKey}:${idempotencyKey}`, op.id);

  const submitted = transitionOperation(op, { status: "submitted", attempts: 1 });
  operationStore.set(op.id, submitted);

  try {
    let result;
    if (request.type === "register") {
      result = await umbraService.executeRegister();
    } else if (request.type === "deposit") {
      result = await umbraService.executeDeposit(
        request.destinationAddress ?? userPublicKey,
        request.mint!,
        BigInt(request.amount!),
      );
    } else {
      result = await umbraService.executeWithdraw(
        request.destinationAddress ?? userPublicKey,
        request.mint!,
        BigInt(request.amount!),
      );
    }

    let afterSubmit = transitionOperation(submitted, {
      status: result.status,
      queueSignature: result.queueSignature,
      callbackSignature: result.callbackSignature,
    });

    if (afterSubmit.status === "queued") {
      queuedForRetry.add(afterSubmit.id);
    }

    if (result.callbackSignature) {
      afterSubmit = transitionOperation(afterSubmit, { status: "callback_confirmed" });
      queuedForRetry.delete(afterSubmit.id);
    }

    operationStore.set(op.id, afterSubmit);
    return afterSubmit;
  } catch (error) {
    const failed = transitionOperation(submitted, {
      status: "failed",
      failureReason: error instanceof Error ? error.message : "Unknown failure",
    });
    operationStore.set(op.id, failed);
    return failed;
  }
};

export const runRetryPass = () => {
  for (const opId of queuedForRetry) {
    const op = operationStore.get(opId);
    if (!op) {
      queuedForRetry.delete(opId);
      continue;
    }

    if (op.attempts >= 3) {
      operationStore.set(
        op.id,
        transitionOperation(op, {
          status: "failed",
          failureReason: "Retries exhausted waiting for callback confirmation",
        }),
      );
      queuedForRetry.delete(opId);
      continue;
    }

    const maybeConfirmed = transitionOperation(op, {
      status: "retried",
      attempts: op.attempts + 1,
    });

    const confirmed = transitionOperation(maybeConfirmed, {
      status: "callback_confirmed",
      callbackSignature: maybeConfirmed.callbackSignature ?? `mock-callback-${maybeConfirmed.id}`,
    });

    operationStore.set(op.id, confirmed);
    queuedForRetry.delete(op.id);
  }
};
