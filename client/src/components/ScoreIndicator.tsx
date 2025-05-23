import React from 'react'
interface ScoreIndicatorProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  label?: string
  showValue?: boolean
}
export const ScoreIndicator: React.FC<ScoreIndicatorProps> = ({
  score,
  size = 'md',
  label,
  showValue = true,
}) => {
  const getColor = (score: number) => {
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-blue-500'
    if (score >= 4) return 'bg-yellow-500'
    return 'bg-red-500'
  }
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-16 h-3'
      case 'lg':
        return 'w-32 h-5'
      default:
        return 'w-24 h-4'
    }
  }
  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-xs'
      case 'lg':
        return 'text-base'
      default:
        return 'text-sm'
    }
  }
  return (
    <div className="flex flex-col">
      {label && (
        <div className="flex justify-between mb-1">
          <span className={`${getTextSize()} font-medium text-gray-700`}>
            {label}
          </span>
          {showValue && (
            <span className={`${getTextSize()} font-medium text-gray-700`}>
              {score}/10
            </span>
          )}
        </div>
      )}
      <div className={`bg-gray-200 rounded-full ${getSizeClasses()}`}>
        <div
          className={`${getColor(score)} h-full rounded-full`}
          style={{
            width: `${score * 10}%`,
          }}
        />
      </div>
      {!label && showValue && (
        <span className={`${getTextSize()} text-gray-600 mt-1`}>
          {score}/10
        </span>
      )}
    </div>
  )
}
