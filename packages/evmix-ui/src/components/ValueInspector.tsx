import { useState } from 'react'
import { formatValue, type FormattedValue } from '../lib/disassembler'

interface ValueInspectorProps {
  value: string | bigint  // hex string or bigint
  label?: string
  compact?: boolean
}

/**
 * Component that shows a value with multiple format options
 */
export function ValueInspector({ value, label, compact = false }: ValueInspectorProps) {
  const [expanded, setExpanded] = useState(false)

  // Convert to bigint if string
  const bigintValue = typeof value === 'string' ? BigInt(value) : value
  const formatted = formatValue(bigintValue)

  if (compact) {
    return (
      <span
        className="cursor-pointer hover:text-evmix-accent"
        onClick={() => setExpanded(!expanded)}
        title="Click to inspect"
      >
        {formatCompact(bigintValue, formatted)}
        {expanded && (
          <ValuePopover formatted={formatted} onClose={() => setExpanded(false)} />
        )}
      </span>
    )
  }

  return (
    <div className="bg-evmix-bg rounded p-2 space-y-1">
      {label && (
        <div className="text-xs text-evmix-muted font-semibold">{label}</div>
      )}
      <ValueDisplay formatted={formatted} />
    </div>
  )
}

interface ValueDisplayProps {
  formatted: FormattedValue
}

function ValueDisplay({ formatted }: ValueDisplayProps) {
  return (
    <div className="space-y-1 text-xs">
      {/* Primary: Hex */}
      <div className="flex items-center gap-2">
        <span className="text-evmix-muted w-16">Hex:</span>
        <code className="text-evmix-text font-mono">{formatted.hex}</code>
      </div>

      {/* Decimal */}
      <div className="flex items-center gap-2">
        <span className="text-evmix-muted w-16">Decimal:</span>
        <code className="text-evmix-text font-mono">{formatted.decimal}</code>
      </div>

      {/* Signed (if different) */}
      {formatted.signed && (
        <div className="flex items-center gap-2">
          <span className="text-evmix-muted w-16">Signed:</span>
          <code className="text-evmix-warning font-mono">{formatted.signed}</code>
        </div>
      )}

      {/* Address (if looks like one) */}
      {formatted.address && (
        <div className="flex items-center gap-2">
          <span className="text-evmix-muted w-16">Address:</span>
          <code className="text-evmix-accent font-mono">{formatted.address}</code>
        </div>
      )}

      {/* ETH (if reasonable wei amount) */}
      {formatted.eth && (
        <div className="flex items-center gap-2">
          <span className="text-evmix-muted w-16">ETH:</span>
          <code className="text-evmix-success font-mono">{formatted.eth}</code>
        </div>
      )}

      {/* ASCII (if printable) */}
      {formatted.ascii && (
        <div className="flex items-center gap-2">
          <span className="text-evmix-muted w-16">ASCII:</span>
          <code className="text-evmix-text font-mono">{formatted.ascii}</code>
        </div>
      )}
    </div>
  )
}

interface ValuePopoverProps {
  formatted: FormattedValue
  onClose: () => void
}

function ValuePopover({ formatted, onClose }: ValuePopoverProps) {
  return (
    <div
      className="absolute z-50 mt-1 bg-evmix-panel border border-evmix-border rounded-lg p-3 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-1 right-1 text-evmix-muted hover:text-evmix-text"
      >
        x
      </button>
      <ValueDisplay formatted={formatted} />
    </div>
  )
}

/**
 * Format a value compactly for inline display
 */
function formatCompact(value: bigint, formatted: FormattedValue): string {
  // Small numbers: show decimal
  if (value < 1000n) {
    return value.toString()
  }

  // Possible address
  if (formatted.address) {
    return formatted.address.slice(0, 10) + '...' + formatted.address.slice(-4)
  }

  // ETH amount
  if (formatted.eth) {
    return formatted.eth
  }

  // ASCII string
  if (formatted.ascii) {
    return formatted.ascii
  }

  // Fallback to truncated hex
  const hex = formatted.hex
  if (hex.length > 18) {
    return hex.slice(0, 10) + '...' + hex.slice(-4)
  }
  return hex
}

/**
 * Inline value with hover tooltip
 */
export function InlineValue({ value }: { value: string | bigint }) {
  const bigintValue = typeof value === 'string' ? BigInt(value) : value
  const formatted = formatValue(bigintValue)
  const display = formatCompact(bigintValue, formatted)

  // Build tooltip content
  const tooltipParts = [
    `Hex: ${formatted.hex}`,
    `Dec: ${formatted.decimal}`,
  ]
  if (formatted.signed) tooltipParts.push(`Signed: ${formatted.signed}`)
  if (formatted.address) tooltipParts.push(`Addr: ${formatted.address}`)
  if (formatted.eth) tooltipParts.push(`ETH: ${formatted.eth}`)
  if (formatted.ascii) tooltipParts.push(`ASCII: ${formatted.ascii}`)

  return (
    <code
      className="text-evmix-text cursor-help"
      title={tooltipParts.join('\n')}
    >
      {display}
    </code>
  )
}
