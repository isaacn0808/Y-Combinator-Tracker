import React from 'react';
import Image from 'next/image';
import { Company } from '../types'
import { StatusBadge } from '@/components/StatusBadge'
import { ScoreIndicator } from '@/components/ScoreIndicator'
interface CompanyCardProps {
  company: Company
  onClick: () => void
}
export const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  onClick,
}) => {
  // Calculate average score if evaluation scores exist
  const scores = company.evaluationScores || {}
  const scoreValues = Object.values(scores).filter(
    (score) => typeof score === 'number',
  ) as number[]
  const averageScore =
    scoreValues.length > 0
      ? Math.round(
          scoreValues.reduce((sum, score) => sum + score, 0) /
            scoreValues.length,
        )
      : undefined
  return (
    <div
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden cursor-pointer border border-gray-200"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            {company.logo ? (
              <Image
                src={company.logo}
                alt={`${company.name} logo`}
                width={40}
                height={40}
                className="rounded-md object-cover mr-3"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center mr-3">
                <span className="text-gray-500 font-medium">
                  {company.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <h3 className="font-semibold text-gray-900">{company.name}</h3>
          </div>
          <StatusBadge status={company.status} />
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {company.oneLiner}
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {company.sectors && company.sectors.length > 0 ? (
            company.sectors.map((sector, index) => (
              <span key={`${company.id}-sector-${index}`} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                {sector}
              </span>
            ))
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              Unknown
            </span>
          )}

          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            {company.developmentStage}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {company.metWith ? (
              <span className="inline-flex items-center text-xs text-green-700">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                Met
              </span>
            ) : (
              <span className="inline-flex items-center text-xs text-gray-500">
                <span className="w-2 h-2 bg-gray-300 rounded-full mr-1"></span>
                Not Met
              </span>
            )}
            {company.lastMeetingDate && (
              <span className="text-xs text-gray-500 ml-2">
                Last: {company.lastMeetingDate}
              </span>
            )}
          </div>
          {averageScore !== undefined && (
            <div className="flex items-center">
              <span className="text-xs font-medium text-gray-700 mr-2">
                Score:
              </span>
              <ScoreIndicator
                score={averageScore}
                size="sm"
                showValue={false}
              />
              <span className="text-xs font-medium text-gray-700 ml-1">
                {averageScore}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

