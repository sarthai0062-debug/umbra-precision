import type { TreasuryPlaybook } from "@umbro/shared";

type Props = {
  playbooks: TreasuryPlaybook[];
  onUsePlaybook: (playbook: TreasuryPlaybook) => void;
};

export function PlaybooksPanel({ playbooks, onUsePlaybook }: Props) {
  return (
    <section className="panel-grid">
      <article className="card hero-card">
        <h2>Treasury playbooks</h2>
        <p>
          Repeatable scenarios for payroll, vendor settlement, and emergency liquidity. Each playbook preloads the AI
          copilot with a treasury intent and suggested Umbra amounts.
        </p>
      </article>

      {playbooks.map((playbook) => (
        <article key={playbook.id} className="card playbook-card">
          <div className="playbook-head">
            <div>
              <h3>{playbook.title}</h3>
              <p>{playbook.audience}</p>
            </div>
            <button type="button" onClick={() => onUsePlaybook(playbook)}>
              Use playbook
            </button>
          </div>
          <p>{playbook.prompt}</p>
          <ul className="bullet-list">
            {playbook.benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}
