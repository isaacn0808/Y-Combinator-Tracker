import React from 'react'
interface EditableFieldProps {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  isEditing: boolean
  type?: 'text' | 'url' | 'date' | 'textarea' | 'select'
  options?: string[]
  className?: string
}
export const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  onChange,
  isEditing,
  type = 'text',
  options = [],
  className = '',
}) => {
  if (!isEditing) {
    return (
      <div className={`mb-4 ${className}`}>
        <h4 className="text-sm font-medium text-gray-700">{label}</h4>
        <p className="text-sm text-gray-600">
          {type === 'textarea' ? (
            <span className="whitespace-pre-wrap">{value || ''}</span>
          ) : (
            value || ''
          )}
        </p>
      </div>
    )
  }
  if (type === 'select') {
    return (
      <div className={`mb-4 ${className}`}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    )
  }
  if (type === 'textarea') {
    return (
      <div className={`mb-4 ${className}`}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
      </div>
    )
  }
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
      />
    </div>
  )
}
