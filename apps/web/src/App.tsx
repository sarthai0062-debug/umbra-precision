import { useEffect, useMemo, useState } from "react";
import bs58 from "bs58";
import {
  buildComplianceReport,
  computePrivacyPosture,
  treasuryPlaybooks,
  type AiPlan,
  type OperationRecord,
  type TreasuryPlaybook,
} from "@umbro/shared";
import { AiCopilot } from "./components/AiCopilot";
import { ComplianceReportPanel } from "./components/ComplianceReportPanel";
import { OverviewPanel } from "./components/OverviewPanel";
import { PlaybooksPanel } from "./components/PlaybooksPanel";
import { PrivacyPosturePanel } from "./components/PrivacyPosturePanel";
import { Sidebar, type AppView } from "./components/Sidebar";
import "./App.css";

type WalletProvider = {
  isPhantom?: boolean;
  publicKey?: { toBase58: () => string };
  connect: () => Promise<void>;
  signMessage: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array }>;
};

type Session = { token: string; publicKey: string };

const apiBase = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? "/api" : "http://localhost:8080/api");
const defaultMint = import.meta.env.VITE_DEFAULT_MINT || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const defaultPrompt = "Shield 1 USDC for payroll privacy and explain compliance tradeoffs.";

const getProvider = (): WalletProvider | null => {
  const provider = (window as unknown as { solana?: WalletProvider }).solana;
  if (!provider?.isPhantom) return null;
  return provider;
};

async function api<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers || {});
  headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

  const response = await fetch(`${apiBase}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(payload.error || "Request failed");
  }
  return response.json() as Promise<T>;
}

function App() {
  const [activeView, setActiveView] = useState<AppView>("overview");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [mint, setMint] = useState(defaultMint);
  const [amount, setAmount] = useState("1000000");
  const [copilotPrompt, setCopilotPrompt] = useState(defaultPrompt);
  const [operations, setOperations] = useState<OperationRecord[]>([]);
  const [status, setStatus] = useState("Ready for Umbra devnet demo.");
  const [isBusy, setIsBusy] = useState(false);
  const [features, setFeatures] = useState<{ umbra: boolean; ai: boolean; network: string } | null>(null);

  const isAuthed = Boolean(session?.token);

  const sortedOps = useMemo(
    () => [...operations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [operations],
  );
  const posture = useMemo(() => computePrivacyPosture(operations), [operations]);
  const complianceReport = useMemo(() => buildComplianceReport(operations), [operations]);

  const refreshOperations = async () => {
    if (!session) return;
    const res = await api<{ operations: OperationRecord[] }>("/operations", { method: "GET" }, session.token);
    setOperations(res.operations);
  };

  useEffect(() => {
    void api<{ features: { umbra: boolean; ai: boolean; network: string } }>("/health")
      .then((res) => setFeatures(res.features))
      .catch(() => setFeatures(null));
  }, []);

  useEffect(() => {
    if (!session) return;
    void refreshOperations();
    const timer = setInterval(() => {
      void refreshOperations();
    }, 4000);
    return () => clearInterval(timer);
  }, [session]);

  const connectWallet = async () => {
    const provider = getProvider();
    if (!provider) throw new Error("Phantom wallet not detected");

    await provider.connect();
    const publicKey = provider.publicKey?.toBase58();
    if (!publicKey) throw new Error("Wallet public key not available");

    const msgRes = await api<{ message: string }>(`/auth/message?publicKey=${publicKey}`);
    const encoded = new TextEncoder().encode(msgRes.message);
    const signed = await provider.signMessage(encoded, "utf8");
    const signature = bs58.encode(signed.signature);

    const sessionRes = await api<Session>("/auth/session", {
      method: "POST",
      body: JSON.stringify({ publicKey, message: msgRes.message, signature }),
    });

    setSession(sessionRes);
    setStatus(`Authenticated as ${sessionRes.publicKey}`);
  };

  const submitOperation = async (type: "register" | "deposit" | "withdraw") => {
    if (!session) throw new Error("Connect wallet first");

    setStatus(`${type} submitted...`);
    const body =
      type === "register"
        ? { type }
        : { type, mint, amount, destinationAddress: session.publicKey };

    const res = await api<{ operation: OperationRecord }>(
      "/operations",
      {
        method: "POST",
        headers: { "x-idempotency-key": crypto.randomUUID() },
        body: JSON.stringify(body),
      },
      session.token,
    );

    setOperations((ops) => [res.operation, ...ops.filter((it) => it.id !== res.operation.id)]);
    setStatus(`${type} -> ${res.operation.status}`);
  };

  const applyPlan = (plan: AiPlan) => {
    const first = plan.recommendedOperations[0];
    if (!first) return;
    if (first.mint) setMint(first.mint);
    if (first.amount) setAmount(first.amount);
    setActiveView("vault");
    setStatus(`Applied AI plan: ${plan.summary}`);
  };

  const usePlaybook = (playbook: TreasuryPlaybook) => {
    setCopilotPrompt(playbook.prompt);
    setMint(playbook.mint);
    setAmount(playbook.suggestedAmount);
    setActiveView("copilot");
    setStatus(`Loaded playbook: ${playbook.title}`);
  };

  const onAction = (action: () => Promise<void>) => async () => {
    setIsBusy(true);
    try {
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      if (message.includes("Invalid or expired session")) {
        setSession(null);
      }
      setStatus(message);
    } finally {
      setIsBusy(false);
    }
  };

  const renderView = () => {
    switch (activeView) {
      case "overview":
        return (
          <OverviewPanel
            posture={posture}
            network={features?.network ?? "devnet"}
            aiEnabled={features?.ai ?? false}
            umbraLive={features?.umbra ?? false}
          />
        );
      case "vault":
        return (
          <section className="panel-grid">
            <article className="card">
              <h2>Wallet and session</h2>
              <button onClick={onAction(connectWallet)} disabled={isBusy}>
                {isAuthed ? "Connected" : "Connect Phantom"}
              </button>
              <p className="status">{status}</p>
            </article>
            <article className="card">
              <h2>Umbra operations</h2>
              <div className="grid">
                <label>
                  Mint
                  <input value={mint} onChange={(e) => setMint(e.target.value)} />
                </label>
                <label>
                  Amount (atomic)
                  <input value={amount} onChange={(e) => setAmount(e.target.value)} />
                </label>
              </div>
              <div className="actions">
                <button onClick={onAction(() => submitOperation("register"))} disabled={!isAuthed || isBusy}>
                  Register
                </button>
                <button onClick={onAction(() => submitOperation("deposit"))} disabled={!isAuthed || isBusy}>
                  Shield deposit
                </button>
                <button onClick={onAction(() => submitOperation("withdraw"))} disabled={!isAuthed || isBusy}>
                  Unshield withdraw
                </button>
                <button onClick={onAction(refreshOperations)} disabled={!isAuthed || isBusy}>
                  Refresh
                </button>
              </div>
            </article>
          </section>
        );
      case "posture":
        return <PrivacyPosturePanel posture={posture} />;
      case "playbooks":
        return <PlaybooksPanel playbooks={treasuryPlaybooks} onUsePlaybook={usePlaybook} />;
      case "copilot":
        return (
          <AiCopilot
            token={session?.token}
            apiBase={apiBase}
            prompt={copilotPrompt}
            onPromptChange={setCopilotPrompt}
            onApplyPlan={applyPlan}
          />
        );
      case "ledger":
        return (
          <section className="panel-grid">
            <article className="card">
              <h2>Activity ledger</h2>
              <p>Tracks created, submitted, queued, retried, and callback-confirmed Umbra operations.</p>
              <ul className="ledger">
                {sortedOps.map((op) => (
                  <li key={op.id}>
                    <strong>{op.type}</strong> · {op.status} · attempts {op.attempts}
                    <div className="meta">id: {op.id}</div>
                    <div className="meta">correlation: {op.correlationId}</div>
                    {op.queueSignature ? <div className="meta">queue: {op.queueSignature}</div> : null}
                    {op.callbackSignature ? <div className="meta">callback: {op.callbackSignature}</div> : null}
                    {op.failureReason ? <div className="error">failure: {op.failureReason}</div> : null}
                  </li>
                ))}
              </ul>
            </article>
          </section>
        );
      case "compliance":
        return (
          <ComplianceReportPanel
            report={complianceReport}
            token={session?.token}
            apiBase={apiBase}
            onStatus={setStatus}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((value) => !value)}
        onNavigate={setActiveView}
      />
      <main className="main-panel">
        <header className="hero">
          <div>
            <p className="eyebrow">Umbra Side Track · Superteam Earn</p>
            <h1>StealthVault Pro</h1>
            <p>Private treasury operations on Solana with Umbra encrypted balances and an AI privacy copilot.</p>
          </div>
        </header>
        {renderView()}
      </main>
    </div>
  );
}

export default App;
