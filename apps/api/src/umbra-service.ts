import { appConfig } from "./config.js";

export type UmbraExecutionResult = {
  queueSignature?: string;
  callbackSignature?: string;
  status: "queued" | "callback_confirmed";
};

const loadSdk = async () => import("@umbra-privacy/sdk");

export class UmbraService {
  async executeRegister(): Promise<UmbraExecutionResult> {
    if (!appConfig.enableRealUmbra) {
      return {
        status: "callback_confirmed",
        queueSignature: "mock-register-queue",
        callbackSignature: "mock-register-callback",
      };
    }

    const {
      createInMemorySigner,
      getUmbraClient,
      getUserRegistrationFunction,
    } = await loadSdk();
    const signer = await createInMemorySigner();
    const client = await getUmbraClient({
      signer,
      network: appConfig.solanaNetwork,
      rpcUrl: appConfig.rpcUrl,
      rpcSubscriptionsUrl: appConfig.rpcSubscriptionsUrl,
      indexerApiEndpoint: appConfig.indexerApiEndpoint,
    });
    const register = getUserRegistrationFunction({ client });
    const signatures = await register({ confidential: true, anonymous: true });
    return {
      status: "callback_confirmed",
      queueSignature: signatures[0],
      callbackSignature: signatures[signatures.length - 1],
    };
  }

  async executeDeposit(_destinationAddress: string, mint: string, amount: bigint): Promise<UmbraExecutionResult> {
    if (!appConfig.enableRealUmbra) {
      return { status: "queued", queueSignature: `mock-deposit-${mint}-${amount.toString()}` };
    }

    const {
      createInMemorySigner,
      getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
      getUmbraClient,
    } = await loadSdk();
    const signer = await createInMemorySigner();
    const client = await getUmbraClient({
      signer,
      network: appConfig.solanaNetwork,
      rpcUrl: appConfig.rpcUrl,
      rpcSubscriptionsUrl: appConfig.rpcSubscriptionsUrl,
      indexerApiEndpoint: appConfig.indexerApiEndpoint,
    });
    const deposit = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client });
    const result = await deposit(client.signer.address as never, mint as never, amount as never);
    return { status: "queued", queueSignature: result.queueSignature, callbackSignature: result.callbackSignature };
  }

  async executeWithdraw(_destinationAddress: string, mint: string, amount: bigint): Promise<UmbraExecutionResult> {
    if (!appConfig.enableRealUmbra) {
      return { status: "queued", queueSignature: `mock-withdraw-${mint}-${amount.toString()}` };
    }

    const {
      createInMemorySigner,
      getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction,
      getUmbraClient,
    } = await loadSdk();
    const signer = await createInMemorySigner();
    const client = await getUmbraClient({
      signer,
      network: appConfig.solanaNetwork,
      rpcUrl: appConfig.rpcUrl,
      rpcSubscriptionsUrl: appConfig.rpcSubscriptionsUrl,
      indexerApiEndpoint: appConfig.indexerApiEndpoint,
    });
    const withdraw = getEncryptedBalanceToPublicBalanceDirectWithdrawerFunction({ client });
    const result = await withdraw(client.signer.address as never, mint as never, amount as never);
    return { status: "queued", queueSignature: result.queueSignature, callbackSignature: result.callbackSignature };
  }
}

export const umbraService = new UmbraService();
