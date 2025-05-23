import React from 'react';
import Image from 'next/image';
import { Company } from '../types';
import { StatusBadge } from '@/components/StatusBadge';
import { ScoreIndicator } from '@/components/ScoreIndicator';

interface CompanyTableProps {
  companies: Company[];
  onRowClick: (company: Company) => void;
}

export const CompanyTable: React.FC<CompanyTableProps> = ({
  companies,
  onRowClick,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left text-gray-700">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3">Company</th>
            <th scope="col" className="px-6 py-3">Sectors</th>
            <th scope="col" className="px-6 py-3">One-liner</th>

            <th scope="col" className="px-6 py-3">Status</th>
            <th scope="col" className="px-6 py-3">Met</th>
            <th scope="col" className="px-6 py-3">Score</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((company) => {
            // Calculate average score if evaluation scores exist
            const scores = company.evaluationScores || {};
            const scoreValues = Object.values(scores).filter(
              (score) => typeof score === 'number',
            ) as number[];
            const averageScore =
              scoreValues.length > 0
                ? Math.round(
                    scoreValues.reduce((sum, score) => sum + score, 0) /
                      scoreValues.length,
                  )
                : undefined;
                
            return (
              <tr 
                key={company.id} 
                className="bg-white border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => onRowClick(company)}
              >
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                  <div className="flex items-center">
                    {company.logo ? (
                      <Image
                        src={company.logo}
                        alt={`${company.name} logo`}
                        width={32}
                        height={32}
                        className="rounded-full object-cover mr-3"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                        <span className="text-gray-500 font-medium text-xs">
                          {company.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    {company.name}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
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
                  </div>
                </td>
                <td className="px-6 py-4 max-w-xs truncate">{company.oneLiner}</td>

                <td className="px-6 py-4">
                  <StatusBadge status={company.status} />
                </td>
                <td className="px-6 py-4">
                  {company.metWith ? (
                    <span className="inline-flex items-center text-xs text-green-700">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                      Yes
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs text-gray-500">
                      <span className="w-2 h-2 bg-gray-300 rounded-full mr-1"></span>
                      No
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {averageScore !== undefined ? (
                    <div className="flex items-center">
                      <ScoreIndicator
                        score={averageScore}
                        size="sm"
                        showValue={false}
                      />
                      <span className="text-xs font-medium text-gray-700 ml-1">
                        {averageScore}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">N/A</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
