import cors from "cors";
import express, { type NextFunction, type Request, type Response, type Router } from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { z } from "zod";
import { appConfig } from "./config";
import { logger } from "./logger";
import { consumeLoginChallenge, getSessionPublicKey, issueLoginChallenge, issueSession, verifyWalletSignature } from "./auth";
import { checkRateLimit } from "./rate-limit";
import { explainTreasuryTopic, planTreasuryMove, summarizeAuditTrail } from "./ai-service";
import { createOperation, getOperation, listOperations } from "./operations";

const loginSchema = z.object({
  publicKey: z.string().min(32),
  message: z.string().min(10),
  signature: z.string().min(20),
});
const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[a-zA-Z0-9:_-]+$/);

type AuthedRequest = Request & { userPublicKey: string };
const getAuthedUserPublicKey = (req: Request): string => (req as AuthedRequest).userPublicKey;

const registerRoutes = (router: Router) => {
  router.get("/health", (_req: Request, res: Response) => {
    res.json({
      ok: true,
      env: appConfig.nodeEnv,
      features: {
        umbra: appConfig.enableRealUmbra,
        ai: appConfig.enableAi,
        network: appConfig.solanaNetwork,
      },
    });
  });

  router.get("/auth/message", (req: Request, res: Response) => {
    const publicKey = String(req.query.publicKey ?? "");
    if (!publicKey) return res.status(400).json({ error: "publicKey required" });
    return res.json({ message: issueLoginChallenge(publicKey) });
  });

  router.post("/auth/session", (req: Request, res: Response) => {
    try {
      const { publicKey, message, signature } = loginSchema.parse(req.body);
      checkRateLimit(publicKey, appConfig.rateLimitPerMinute);
      if (!consumeLoginChallenge(publicKey, message)) {
        return res.status(401).json({ error: "Invalid or expired login challenge" });
      }

      if (!verifyWalletSignature(publicKey, message, signature)) {
        return res.status(401).json({ error: "Invalid wallet signature" });
      }

      const token = issueSession(publicKey);
      return res.json({ token, publicKey });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "bad request" });
    }
  });

  router.use((req: Request, res: Response, next: NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Missing bearer token" });
    const token = auth.slice("Bearer ".length);
    const publicKey = getSessionPublicKey(token);
    if (!publicKey) return res.status(401).json({ error: "Invalid or expired session" });
    (req as AuthedRequest).userPublicKey = publicKey;
    return next();
  });

  router.get("/operations", (req: Request, res: Response) => {
    const userPublicKey = getAuthedUserPublicKey(req);
    res.json({ operations: listOperations(userPublicKey) });
  });

  router.get("/operations/:id", (req: Request, res: Response) => {
    const userPublicKey = getAuthedUserPublicKey(req);
    const operation = getOperation(String(req.params.id), userPublicKey);
    if (!operation) return res.status(404).json({ error: "Not found" });
    return res.json({ operation });
  });

  router.post("/ai/plan", async (req: Request, res: Response) => {
    const userPublicKey = getAuthedUserPublicKey(req);
    try {
      checkRateLimit(userPublicKey, appConfig.rateLimitPerMinute);
      const prompt = z.object({ prompt: z.string().min(3).max(4000) }).parse(req.body).prompt;
      const plan = await planTreasuryMove(prompt, listOperations(userPublicKey));
      return res.json({ plan, source: appConfig.enableAi ? "minimax-m2.7" : "heuristic" });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "bad request" });
    }
  });

  router.post("/ai/explain", async (req: Request, res: Response) => {
    const userPublicKey = getAuthedUserPublicKey(req);
    try {
      checkRateLimit(userPublicKey, appConfig.rateLimitPerMinute);
      const topic = z.object({ topic: z.string().min(3).max(4000) }).parse(req.body).topic;
      const explanation = await explainTreasuryTopic(topic, listOperations(userPublicKey));
      return res.json({ explanation, source: appConfig.enableAi ? "minimax-m2.7" : "heuristic" });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "bad request" });
    }
  });

  router.post("/ai/audit", async (req: Request, res: Response) => {
    const userPublicKey = getAuthedUserPublicKey(req);
    try {
      checkRateLimit(userPublicKey, appConfig.rateLimitPerMinute);
      const audit = await summarizeAuditTrail(listOperations(userPublicKey));
      return res.json({ audit, source: appConfig.enableAi ? "minimax-m2.7" : "heuristic" });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "bad request" });
    }
  });

  router.post("/operations", async (req: Request, res: Response) => {
    const userPublicKey = getAuthedUserPublicKey(req);
    const parsedKey = idempotencyKeySchema.safeParse(req.header("x-idempotency-key"));
    if (!parsedKey.success) return res.status(400).json({ error: "Valid x-idempotency-key required" });

    try {
      checkRateLimit(userPublicKey, appConfig.rateLimitPerMinute);
      const operation = await createOperation(userPublicKey, req.body, parsedKey.data);
      return res.json({ operation });
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : "bad request" });
    }
  });
};

export const createApp = () => {
  const app = express();
  const router = express.Router();

  app.use(helmet());
  app.use(cors({ origin: appConfig.allowedOrigin }));
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  registerRoutes(router);
  app.use("/api", router);
  app.use(router);

  return app;
};
