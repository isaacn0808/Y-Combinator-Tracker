import React from 'react'
type StatusType = 'watching' | 'engaged' | 'invested' | 'passed' | 'new'
interface StatusBadgeProps {
  status: StatusType
}
const statusColors = {
  watching: 'bg-blue-100 text-blue-800',
  engaged: 'bg-purple-100 text-purple-800',
  invested: 'bg-green-100 text-green-800',
  passed: 'bg-gray-100 text-gray-800',
  new: 'bg-yellow-100 text-yellow-800',
}
export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status]}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
