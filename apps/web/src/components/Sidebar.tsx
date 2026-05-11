export type AppView = "overview" | "vault" | "posture" | "playbooks" | "copilot" | "ledger" | "compliance";

type NavItem = {
  id: AppView;
  label: string;
  hint: string;
  icon: string;
};

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", hint: "Hackathon value", icon: "◎" },
  { id: "vault", label: "Vault", hint: "Wallet and Umbra ops", icon: "⛨" },
  { id: "posture", label: "Privacy posture", hint: "Risk dashboard", icon: "◈" },
  { id: "playbooks", label: "Playbooks", hint: "Treasury scenarios", icon: "▣" },
  { id: "copilot", label: "AI copilot", hint: "MiniMax planning", icon: "✦" },
  { id: "ledger", label: "Ledger", hint: "Operation history", icon: "≡" },
  { id: "compliance", label: "Compliance export", hint: "Audit packet", icon: "⬇" },
];

type Props = {
  activeView: AppView;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (view: AppView) => void;
};

export function Sidebar({ activeView, expanded, onToggle, onNavigate }: Props) {
  return (
    <aside className={`sidebar ${expanded ? "expanded" : "collapsed"}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <span className="brand-mark">UP</span>
          {expanded ? (
            <div>
              <strong>UmbraPrecision</strong>
              <p>Private treasury console</p>
            </div>
          ) : null}
        </div>
        <button type="button" className="sidebar-toggle" onClick={onToggle} aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}>
          {expanded ? "⟨" : "⟩"}
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-link ${activeView === item.id ? "active" : ""}`}
            onClick={() => onNavigate(item.id)}
            title={item.hint}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {expanded ? (
              <span className="sidebar-copy">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
            ) : null}
          </button>
        ))}
      </nav>
    </aside>
  );
}
