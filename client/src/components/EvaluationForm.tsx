import React, { useState } from 'react'
import { Company, EvaluationScores, EvaluationNotes } from '../types'
import { ScoreIndicator } from '@/components/ScoreIndicator'
interface EvaluationFormProps {
  company: Company
  onUpdateEvaluation: (
    companyId: string,
    scores: Partial<EvaluationScores>,
    notes: Partial<EvaluationNotes>,
  ) => void
}
export const EvaluationForm: React.FC<EvaluationFormProps> = ({
  company,
  onUpdateEvaluation,
}) => {
  const [scores, setScores] = useState<Partial<EvaluationScores>>(
    company.evaluationScores || {},
  )
  const [notes, setNotes] = useState<Partial<EvaluationNotes>>(
    company.evaluationNotes || {},
  )
  const [isEditing, setIsEditing] = useState(false)
  const handleScoreChange = (field: keyof EvaluationScores, value: number) => {
    setScores((prev) => ({
      ...prev,
      [field]: value,
    }))
  }
  const handleNotesChange = (field: keyof EvaluationNotes, value: string) => {
    setNotes((prev) => ({
      ...prev,
      [field]: value,
    }))
  }
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdateEvaluation(company.id, scores, notes)
    setIsEditing(false)
  }
  const scoreFields: Array<{
    key: keyof EvaluationScores
    label: string
  }> = [
    {
      key: 'problem',
      label: 'Problem',
    },
    {
      key: 'solution',
      label: 'Solution',
    },
    {
      key: 'team',
      label: 'Team',
    },
    {
      key: 'market',
      label: 'Market',
    },

    {
      key: 'traction',
      label: 'Traction',
    },
    {
      key: 'competition',
      label: 'Competition',
    },
    {
      key: 'differentiation',
      label: 'Differentiation',
    },
    {
      key: 'investmentPotential',
      label: 'Investment Potential',
    },
  ]
  if (!isEditing) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Evaluation Scores
          </h3>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit Evaluation
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scoreFields.map((field) => (
            <div key={field.key} className="mb-6">
              <ScoreIndicator
                score={scores[field.key] || 0}
                label={field.label}
                showValue={true}
              />
              {notes[field.key as keyof EvaluationNotes] && (
                <div className="mt-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {notes[field.key as keyof EvaluationNotes]}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
        {notes.general && (
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-900 mb-2">
              General Notes
            </h4>
            <p className="text-sm text-gray-600">{notes.general}</p>
          </div>
        )}
      </div>
    )
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Edit Evaluation</h3>
        <div>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Evaluation
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scoreFields.map((field) => (
          <div key={field.key} className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label} Score (1-10)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={scores[field.key] || ''}
              onChange={(e) =>
                handleScoreChange(field.key, parseInt(e.target.value, 10))
              }
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
            <label className="block text-sm font-medium text-gray-700 mt-2 mb-1">
              {field.label} Notes
            </label>
            <textarea
              value={notes[field.key as keyof EvaluationNotes] || ''}
              onChange={(e) =>
                handleNotesChange(
                  field.key as keyof EvaluationNotes,
                  e.target.value,
                )
              }
              rows={2}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
          </div>
        ))}
      </div>
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          General Notes
        </label>
        <textarea
          value={notes.general || ''}
          onChange={(e) => handleNotesChange('general', e.target.value)}
          rows={4}
          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
        />
      </div>
    </form>
  )
}
