import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../.env") });
const schema = z.object({
  PORT: z.string().default("8080"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ALLOWED_ORIGIN: z.string().default("http://localhost:5173"),
  SESSION_TTL_MS: z.string().default("3600000"),
  ALLOWED_MINTS: z.string().default("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  MIN_AMOUNT_ATOMIC: z.string().default("1"),
  MAX_AMOUNT_ATOMIC: z.string().default("100000000000"),
  RATE_LIMIT_PER_MINUTE: z.string().default("30"),
  ENABLE_REAL_UMBRA: z.string().default("false"),
  SOLANA_NETWORK: z.enum(["mainnet", "devnet", "localnet"]).default("devnet"),
  SOLANA_RPC_URL: z.string().url().default("https://api.devnet.solana.com"),
  SOLANA_RPC_SUBSCRIPTIONS_URL: z.string().url().default("wss://api.devnet.solana.com"),
  UMBRA_INDEXER_API_ENDPOINT: z.string().url().default("https://utxo-indexer.api-devnet.umbraprivacy.com"),
  NVIDIA_API_KEY: z.string().optional(),
  NVIDIA_BASE_URL: z.string().url().default("https://integrate.api.nvidia.com/v1"),
  NVIDIA_MODEL: z.string().default("minimaxai/minimax-m2.7"),
  ENABLE_AI: z.string().default("true"),
});
const env = schema.parse(process.env);
export const appConfig = {
  port: Number(env.PORT),
  nodeEnv: env.NODE_ENV,
  allowedOrigin: env.ALLOWED_ORIGIN,
  sessionTtlMs: Number(env.SESSION_TTL_MS),
  allowedMints: env.ALLOWED_MINTS.split(",").map((m) => m.trim()),
  minAmountAtomic: BigInt(env.MIN_AMOUNT_ATOMIC),
  maxAmountAtomic: BigInt(env.MAX_AMOUNT_ATOMIC),
  rateLimitPerMinute: Number(env.RATE_LIMIT_PER_MINUTE),
  enableRealUmbra: env.ENABLE_REAL_UMBRA === "true",
  solanaNetwork: env.SOLANA_NETWORK,
  rpcUrl: env.SOLANA_RPC_URL,
  rpcSubscriptionsUrl: env.SOLANA_RPC_SUBSCRIPTIONS_URL,
  indexerApiEndpoint: env.UMBRA_INDEXER_API_ENDPOINT,
  nvidiaApiKey: env.NVIDIA_API_KEY ?? "",
  nvidiaBaseUrl: env.NVIDIA_BASE_URL,
  nvidiaModel: env.NVIDIA_MODEL,
  enableAi: env.ENABLE_AI === "true" && Boolean(env.NVIDIA_API_KEY),
};
