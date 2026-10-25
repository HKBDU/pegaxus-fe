interface VndTextProps {
  amount: number
  className?: string
}

const vndFormatter = new Intl.NumberFormat('en-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

export function VndText({ amount, className }: VndTextProps) {
  return <span className={className}>{vndFormatter.format(amount)}</span>
}
