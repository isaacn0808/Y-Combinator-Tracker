import React from 'react'
import { MetricUpdate } from '../types'
import { ArrowRightIcon, TrendingUpIcon, DollarSignIcon } from 'lucide-react'
interface UpdateLogProps {
  updates: MetricUpdate[]
}
export const UpdateLog: React.FC<UpdateLogProps> = ({ updates }) => {
  const sortedUpdates = [...updates].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
  const getUpdateIcon = (type: MetricUpdate['type']) => {
    switch (type) {
      case 'metrics':
        return <TrendingUpIcon className="h-5 w-5 text-blue-500" />
      case 'funding':
        return <DollarSignIcon className="h-5 w-5 text-green-500" />
      default:
        return null
    }
  }
  const formatValue = (value: string) => {
    // Remove any common currency or metric symbols for comparison
    return value.replace(/[$%]/g, '').trim()
  }
  const getChangeIndicator = (oldValue: string, newValue: string) => {
    const oldNum = parseFloat(formatValue(oldValue))
    const newNum = parseFloat(formatValue(newValue))
    if (isNaN(oldNum) || isNaN(newNum)) return null
    const percentChange = ((newNum - oldNum) / oldNum) * 100
    const isPositive = percentChange > 0
    return (
      <span
        className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}
      >
        ({isPositive ? '+' : ''}
        {percentChange.toFixed(1)}%)
      </span>
    )
  }
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Update Log</h3>
      {sortedUpdates.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No updates recorded yet</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedUpdates.map((update) => (
            <div key={update.id} className="relative">
              <div className="flex items-start">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex-shrink-0">
                  {getUpdateIcon(update.type)}
                </div>
                <div className="ml-4 flex-grow">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900">
                      {update.type === 'metrics'
                        ? 'Metrics Update'
                        : 'Funding Update'}
                    </h4>
                    <time className="text-sm text-gray-500">{update.date}</time>
                  </div>
                  <div className="mt-2 space-y-2">
                    {update.changes.map((change, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <span className="text-gray-600 min-w-[120px]">
                          {change.field}:
                        </span>
                        <span className="text-gray-900">{change.oldValue}</span>
                        <ArrowRightIcon className="h-4 w-4 mx-2 text-gray-400" />
                        <span className="text-gray-900 font-medium">
                          {change.newValue}
                        </span>
                        <span className="ml-2">
                          {getChangeIndicator(change.oldValue, change.newValue)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {update.notes && (
                    <p className="mt-2 text-sm text-gray-600">{update.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
