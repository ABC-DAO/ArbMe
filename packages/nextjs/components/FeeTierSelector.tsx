'use client'

import { V4_FEE_TIERS } from '@/utils/constants'

type FeeTier = {
  value: number
  label: string
  description: string
}

interface FeeTierSelectorProps {
  value: number
  onChange: (fee: number) => void
  disabled?: boolean
  tiers?: readonly FeeTier[]
}

export function FeeTierSelector({
  value,
  onChange,
  disabled = false,
  tiers = V4_FEE_TIERS,
}: FeeTierSelectorProps) {
  return (
    <div className="fee-tier-selector">
      {tiers.map((tier) => (
        <button
          key={tier.value}
          type="button"
          className={`fee-tier-btn ${value === tier.value ? 'selected' : ''}`}
          onClick={() => onChange(tier.value)}
          disabled={disabled}
        >
          <span className="fee-label">{tier.label}</span>
          <span className="fee-desc">{tier.description}</span>
        </button>
      ))}
    </div>
  )
}
