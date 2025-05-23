"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { format } from 'date-fns';

interface Evaluation {
  id: string;
  companyId: string;
  evaluationDate: string;
  evaluator: string;
  problemScore?: number;
  problemNotes?: string;
  solutionScore?: number;
  solutionNotes?: string;
  teamScore?: number;
  teamNotes?: string;
  marketScore?: number;
  marketNotes?: string;
  businessModelScore?: number;
  businessModelNotes?: string;
  tractionScore?: number;
  tractionNotes?: string;
  competitionScore?: number;
  competitionNotes?: string;
  differentiationScore?: number;
  differentiationNotes?: string;
  investmentPotentialScore?: number;
  investmentPotentialNotes?: string;
  overallNotes?: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

interface EvaluationsPanelProps {
  companyId: string;
}

const fetchEvaluations = async (companyId: string): Promise<Evaluation[]> => {
  const { data } = await api.get(`/api/companies/${companyId}/evaluations`);
  return data;
};

const EvaluationsPanel: React.FC<EvaluationsPanelProps> = ({ companyId }) => {
  const { data: evaluations, isLoading, isError } = useQuery<Evaluation[]>({
    queryKey: ['evaluations', companyId],
    queryFn: () => fetchEvaluations(companyId),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded"></div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading evaluations. Please try again.
      </div>
    );
  }

  if (!evaluations || evaluations.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <p className="text-gray-500">No evaluations available for this company.</p>
      </div>
    );
  }

  // Sort evaluations by date (newest first)
  const sortedEvaluations = [...evaluations].sort((a, b) => 
    new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime()
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Company Evaluations</h3>
      
      <div className="space-y-8">
        {sortedEvaluations.map((evaluation) => (
          <div key={evaluation.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-medium text-gray-900">
                  Evaluation from {format(new Date(evaluation.evaluationDate), 'PPP')}
                </h4>
                <p className="text-sm text-gray-500">By {evaluation.evaluator || 'Anonymous'}</p>
              </div>
              {evaluation.source === 'Email Analysis' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  From Email
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {evaluation.problemScore !== undefined && (
                <div className="bg-white p-3 rounded shadow-sm">
                  <h5 className="text-sm font-medium text-gray-500 mb-1">Problem</h5>
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-gray-900 mr-2">{evaluation.problemScore}/10</span>
                  </div>
                  {evaluation.problemNotes && (
                    <p className="text-sm text-gray-700 mt-2">{evaluation.problemNotes}</p>
                  )}
                </div>
              )}
              
              {evaluation.solutionScore !== undefined && (
                <div className="bg-white p-3 rounded shadow-sm">
                  <h5 className="text-sm font-medium text-gray-500 mb-1">Solution</h5>
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-gray-900 mr-2">{evaluation.solutionScore}/10</span>
                  </div>
                  {evaluation.solutionNotes && (
                    <p className="text-sm text-gray-700 mt-2">{evaluation.solutionNotes}</p>
                  )}
                </div>
              )}
              
              {evaluation.teamScore !== undefined && (
                <div className="bg-white p-3 rounded shadow-sm">
                  <h5 className="text-sm font-medium text-gray-500 mb-1">Team</h5>
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-gray-900 mr-2">{evaluation.teamScore}/10</span>
                  </div>
                  {evaluation.teamNotes && (
                    <p className="text-sm text-gray-700 mt-2">{evaluation.teamNotes}</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {evaluation.marketScore !== undefined && (
                <div className="bg-white p-3 rounded shadow-sm">
                  <h5 className="text-sm font-medium text-gray-500 mb-1">Market</h5>
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-gray-900 mr-2">{evaluation.marketScore}/10</span>
                  </div>
                  {evaluation.marketNotes && (
                    <p className="text-sm text-gray-700 mt-2">{evaluation.marketNotes}</p>
                  )}
                </div>
              )}
              

              
              {evaluation.tractionScore !== undefined && (
                <div className="bg-white p-3 rounded shadow-sm">
                  <h5 className="text-sm font-medium text-gray-500 mb-1">Traction</h5>
                  <div className="flex items-center">
                    <span className="text-xl font-bold text-gray-900 mr-2">{evaluation.tractionScore}/10</span>
                  </div>
                  {evaluation.tractionNotes && (
                    <p className="text-sm text-gray-700 mt-2">{evaluation.tractionNotes}</p>
                  )}
                </div>
              )}
            </div>
            
            {evaluation.overallNotes && (
              <div className="bg-white p-3 rounded shadow-sm">
                <h5 className="text-sm font-medium text-gray-500 mb-1">Overall Notes</h5>
                <p className="text-sm text-gray-700">{evaluation.overallNotes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EvaluationsPanel;
