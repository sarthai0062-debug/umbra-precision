import type { PrivacyPosture } from "@umbro/shared";

type Props = {
  posture: PrivacyPosture;
};

export function PrivacyPosturePanel({ posture }: Props) {
  return (
    <section className="panel-grid">
      <article className="card metric-card">
        <h2>Privacy posture dashboard</h2>
        <p>Scores how well the current ledger balances confidentiality, successful execution, and exposure risk.</p>
        <p className="score-line">
          <span className="score-value">{posture.score}</span>
          <span className="score-label">{posture.label}</span>
        </p>
      </article>

      <article className="card">
        <h3>Execution mix</h3>
        <div className="stat-grid">
          <div>
            <strong>{posture.shieldedMoves}</strong>
            <span>Shield moves</span>
          </div>
          <div>
            <strong>{posture.unshieldedMoves}</strong>
            <span>Unshield moves</span>
          </div>
          <div>
            <strong>{posture.confirmedMoves}</strong>
            <span>Confirmed</span>
          </div>
          <div>
            <strong>{posture.failedMoves}</strong>
            <span>Failed</span>
          </div>
        </div>
      </article>

      <article className="card">
        <h3>Recommendations</h3>
        <ul className="bullet-list">
          {posture.recommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
