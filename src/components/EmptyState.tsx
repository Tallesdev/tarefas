// Ilustração original: prancheta com um check, flutuando sobre uma nuvem
export default function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="empty">
      <svg width="148" height="120" viewBox="0 0 148 120" aria-hidden="true">
        <ellipse cx="74" cy="106" rx="54" ry="8" className="e-shadow" />
        <path d="M30 86c-10 0-16-7-16-15s7-14 15-14c2-11 12-18 23-17 6-9 20-12 30-6 8-5 20-2 24 7 10 0 18 8 18 18s-8 17-18 17H30Z" className="e-cloud" />
        <rect x="52" y="14" width="46" height="62" rx="8" className="e-board" />
        <rect x="64" y="9" width="22" height="10" rx="4" className="e-clip" />
        <path d="M63 38h24M63 48h18M63 58h22" className="e-lines" />
        <circle cx="96" cy="70" r="13" className="e-badge" />
        <path d="M90 70l4.5 4.5L103 66" className="e-tick" />
      </svg>
      <p className="empty-title">{title}</p>
      <p className="empty-hint">{hint}</p>
    </div>
  )
}
