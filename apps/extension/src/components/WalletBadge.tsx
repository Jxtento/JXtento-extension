import type { BadgeLabel } from "../lib/mockIntelligence"
import type { RiskLevel } from "../lib/riskScore"

interface WalletBadgeProps {
  label: BadgeLabel
  riskLevel: RiskLevel
  onClick?: () => void
}

const RISK_CLASS: Record<RiskLevel, string> = {
  low: "border-jxtento-good bg-jxtento-panel text-jxtento-good",
  medium: "border-jxtento-warn bg-jxtento-panel text-jxtento-warn",
  high: "border-jxtento-bad bg-jxtento-panel text-jxtento-bad"
}

export function WalletBadge({ label, riskLevel, onClick }: WalletBadgeProps) {
  return (
    <button
      type="button"
      className={`axiom-intel-badge ml-1 inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-bold leading-none shadow-none transition hover:-translate-y-px ${RISK_CLASS[riskLevel]}`}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClick?.()
      }}>
      {label}
    </button>
  )
}
