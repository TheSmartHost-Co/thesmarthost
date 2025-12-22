'use client'

interface SparklineProps {
  currentValue: number
  previousValue: number
  className?: string
}

export const Sparkline: React.FC<SparklineProps> = ({
  currentValue,
  previousValue,
  className = '',
}) => {
  const isIncreasing = currentValue > previousValue
  const strokeColor = isIncreasing ? '#10b981' : '#ef4444' // green-500 : red-500

  // Create a simple 2-point line chart
  const width = 60
  const height = 20
  const padding = 2

  // Normalize values to fit in the chart
  const max = Math.max(currentValue, previousValue)
  const min = Math.min(currentValue, previousValue)
  const range = max - min || 1

  const y1 = height - padding - ((previousValue - min) / range) * (height - padding * 2)
  const y2 = height - padding - ((currentValue - min) / range) * (height - padding * 2)

  return (
    <svg
      width={width}
      height={height}
      className={`inline-block ${className}`}
      viewBox={`0 0 ${width} ${height}`}
    >
      <line
        x1={padding}
        y1={y1}
        x2={width - padding}
        y2={y2}
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx={padding} cy={y1} r="2" fill={strokeColor} />
      <circle cx={width - padding} cy={y2} r="2" fill={strokeColor} />
    </svg>
  )
}
