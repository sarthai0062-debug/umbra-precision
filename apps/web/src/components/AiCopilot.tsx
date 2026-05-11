import { useState } from "react";
import type { AiAudit, AiExplain, AiPlan } from "@umbro/shared";

type Props = {
  token?: string;
  apiBase: string;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onApplyPlan: (plan: AiPlan) => void;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

async function requestApi<T>(apiBase: string, path: string, init: RequestInit, token?: string): Promise<T> {
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

export function AiCopilot({ token, apiBase, prompt, onPromptChange, onApplyPlan }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Describe a treasury move in plain language. I will plan Umbra shield, unshield, or registration steps and surface privacy and compliance notes.",
    },
  ]);
  const [plan, setPlan] = useState<AiPlan | null>(null);
  const [explanation, setExplanation] = useState<AiExplain | null>(null);
  const [audit, setAudit] = useState<AiAudit | null>(null);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);

  const pushAssistant = (content: string) => {
    setMessages((current) => [...current, { role: "assistant", content }]);
  };

  const run = async (action: () => Promise<void>) => {
    if (!token) throw new Error("Connect Phantom before using the AI copilot.");
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const onPlan = () =>
    run(async () => {
      setMessages((current) => [...current, { role: "user", content: prompt }]);
      const res = await requestApi<{ plan: AiPlan; source: string }>(
        apiBase,
        "/ai/plan",
        { method: "POST", body: JSON.stringify({ prompt }) },
        token,
      );
      setPlan(res.plan);
      setSource(res.source);
      pushAssistant(`${res.plan.summary}\n\nWarnings: ${res.plan.warnings.join(" ")}`);
    });

  const onExplain = () =>
    run(async () => {
      setMessages((current) => [...current, { role: "user", content: `Explain: ${prompt}` }]);
      const res = await requestApi<{ explanation: AiExplain; source: string }>(
        apiBase,
        "/ai/explain",
        { method: "POST", body: JSON.stringify({ topic: prompt }) },
        token,
      );
      setExplanation(res.explanation);
      setSource(res.source);
      pushAssistant(`${res.explanation.title}\n${res.explanation.explanation}`);
    });

  const onAudit = () =>
    run(async () => {
      const res = await requestApi<{ audit: AiAudit; source: string }>(
        apiBase,
        "/ai/audit",
        { method: "POST", body: "{}" },
        token,
      );
      setAudit(res.audit);
      setSource(res.source);
      pushAssistant(`${res.audit.headline}\n${res.audit.summary}`);
    });

  return (
    <section className="card copilot">
      <h2>AI Privacy Copilot</h2>
      <p>Powered by NVIDIA MiniMax M2.7 for planning, explanations, and audit-ready summaries over Umbra flows.</p>
      <div className="chat-log">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>
            {message.content}
          </div>
        ))}
      </div>
      <label className="prompt-label">
        Treasury intent
        <textarea value={prompt} onChange={(event) => onPromptChange(event.target.value)} rows={4} />
      </label>
      <div className="actions">
        <button onClick={() => void onPlan()} disabled={!token || busy}>
          Plan move
        </button>
        <button onClick={() => void onExplain()} disabled={!token || busy}>
          Explain privacy
        </button>
        <button onClick={() => void onAudit()} disabled={!token || busy}>
          Audit summary
        </button>
        {plan ? (
          <button onClick={() => onApplyPlan(plan)} disabled={busy}>
            Apply plan
          </button>
        ) : null}
      </div>
      {source ? <p className="meta">AI source: {source}</p> : null}
      {plan ? (
        <div className="insight-grid">
          <Insight title="Recommended operations" items={plan.recommendedOperations.map((op) => `${op.type}: ${op.rationale}`)} />
          <Insight title="Privacy notes" items={plan.privacyNotes} />
          <Insight title="Compliance notes" items={plan.complianceNotes} />
        </div>
      ) : null}
      {explanation ? (
        <div className="insight-grid">
          <Insight title="Privacy impact" items={[explanation.privacyImpact]} />
          <Insight title="Next steps" items={explanation.suggestedNextSteps} />
        </div>
      ) : null}
      {audit ? (
        <div className="insight-grid">
          <Insight title="Highlights" items={audit.highlights} />
          <Insight title="Risk flags" items={audit.riskFlags.length ? audit.riskFlags : ["No risk flags detected in the current ledger."]} />
        </div>
      ) : null}
    </section>
  );
}

function Insight({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="insight">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
