import bs58 from "bs58";
import nacl from "tweetnacl";
import { PublicKey } from "@solana/web3.js";
import { randomUUID } from "node:crypto";
import { appConfig } from "./config";
import { loginChallengeStore, sessionStore } from "./store";

const LOGIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;

export const issueLoginChallenge = (publicKey: string) => {
  const nonce = randomUUID();
  const message = `UmbraPrecision login for ${publicKey}\nnonce:${nonce}\nts:${Date.now()}`;
  loginChallengeStore.set(publicKey, {
    message,
    expiresAt: Date.now() + LOGIN_CHALLENGE_TTL_MS,
  });
  return message;
};

export const consumeLoginChallenge = (publicKey: string, message: string): boolean => {
  const challenge = loginChallengeStore.get(publicKey);
  if (!challenge) return false;
  loginChallengeStore.delete(publicKey);
  if (Date.now() > challenge.expiresAt) return false;
  return challenge.message === message;
};

export const verifyWalletSignature = (publicKey: string, message: string, signature: string) => {
  const sigBytes = bs58.decode(signature);
  const messageBytes = new TextEncoder().encode(message);
  const pubKeyBytes = new PublicKey(publicKey).toBytes();
  return nacl.sign.detached.verify(messageBytes, sigBytes, pubKeyBytes);
};

export const issueSession = (publicKey: string) => {
  const token = randomUUID();
  sessionStore.set(token, { token, publicKey, expiresAt: Date.now() + appConfig.sessionTtlMs });
  return token;
};

export const getSessionPublicKey = (token: string) => {
  const session = sessionStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessionStore.delete(token);
    return null;
  }
  return session.publicKey;
};
