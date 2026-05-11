import type { PrivacyPosture } from "@umbro/shared";

type Props = {
  posture: PrivacyPosture;
  network: string;
  aiEnabled: boolean;
  umbraLive: boolean;
};

export function OverviewPanel({ posture, network, aiEnabled, umbraLive }: Props) {
  return (
    <section className="panel-grid">
      <article className="card hero-card">
        <p className="eyebrow">Hackathon thesis</p>
        <h2>Why teams need a private treasury console</h2>
        <p>
          Public Solana treasuries leak strategy the moment funds move. UmbraPrecision combines Umbra encrypted balances
          with an AI copilot so operators can shield USDC, plan safer flows, and produce audit-ready summaries without
          exposing full history on-chain.
        </p>
        <div className="feature-pills">
          <span>{network}</span>
          <span>{umbraLive ? "live Umbra" : "demo Umbra"}</span>
          <span>{aiEnabled ? "MiniMax M2.7" : "heuristic AI"}</span>
        </div>
      </article>

      <article className="card">
        <h3>What you gain</h3>
        <ul className="bullet-list">
          {posture.valuePoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
          <li>Playbooks turn recurring treasury jobs into repeatable private workflows.</li>
          <li>Compliance export packages ledger metadata for reviewers without wallet custody.</li>
        </ul>
      </article>

      <article className="card">
        <h3>Who it helps</h3>
        <div className="persona-grid">
          <div>
            <strong>DAO operators</strong>
            <p>Hide payroll buffers and vendor staging from competitive observers.</p>
          </div>
          <div>
            <strong>Finance teams</strong>
            <p>Translate treasury intent into Umbra operations with AI guardrails.</p>
          </div>
          <div>
            <strong>Compliance reviewers</strong>
            <p>Review structured audit packets while amounts stay confidential on-chain.</p>
          </div>
        </div>
      </article>

      <article className="card metric-card">
        <h3>Current posture snapshot</h3>
        <p className="score-line">
          <span className="score-value">{posture.score}</span>
          <span className="score-label">{posture.label} privacy posture</span>
        </p>
        <p>
          {posture.confirmedMoves} confirmed moves · {posture.shieldedMoves} shields · {posture.unshieldedMoves} unshields
        </p>
      </article>
    </section>
  );
}
