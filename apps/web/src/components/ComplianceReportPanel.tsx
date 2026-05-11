import { useState } from "react";
import type { AiAudit } from "@umbro/shared";

type Props = {
  report: string;
  token?: string;
  apiBase: string;
  onStatus: (message: string) => void;
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

export function ComplianceReportPanel({ report, token, apiBase, onStatus }: Props) {
  const [auditSummary, setAuditSummary] = useState("");

  const refreshAudit = async () => {
    if (!token) throw new Error("Connect Phantom before generating an AI audit summary.");
    const res = await requestApi<{ audit: AiAudit }>(apiBase, "/ai/audit", { method: "POST", body: "{}" }, token);
    const summary = `${res.audit.headline}\n${res.audit.summary}\n${res.audit.highlights.join("\n")}`;
    setAuditSummary(summary);
    onStatus("AI audit summary attached to the compliance packet.");
  };

  const download = () => {
    const body = auditSummary ? `${report}\n\n## AI audit summary\n${auditSummary}` : report;
    const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `umbraprecision-compliance-${new Date().toISOString().slice(0, 10)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    onStatus("Compliance packet downloaded.");
  };

  return (
    <section className="panel-grid">
      <article className="card hero-card">
        <h2>Compliance export</h2>
        <p>
          Package ledger metadata, privacy posture, and optional AI audit language into a reviewer-friendly markdown
          packet for hackathon demos or internal controls.
        </p>
        <div className="actions">
          <button type="button" onClick={() => void refreshAudit().catch((error) => onStatus(String(error)))} disabled={!token}>
            Attach AI audit summary
          </button>
          <button type="button" onClick={download}>
            Download markdown packet
          </button>
        </div>
      </article>

      <article className="card">
        <h3>Preview</h3>
        <pre className="report-preview">{auditSummary ? `${report}\n\n## AI audit summary\n${auditSummary}` : report}</pre>
      </article>
    </section>
  );
}
