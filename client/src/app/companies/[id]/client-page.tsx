"use client";

import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Company } from '@/types';

import api from '@/lib/api';
import EmailList from '@/components/EmailList';
import MetricsPanel from '@/components/MetricsPanel';
import InteractionsPanel from '@/components/InteractionsPanel';
import EvaluationsPanel from '@/components/EvaluationsPanel';

interface CompanyDetailClientProps {
  initialData: Company;
}

const CompanyDetailClient: React.FC<CompanyDetailClientProps> = ({ initialData }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = initialData;

  const { data: company } = useQuery({
    queryKey: ['company', id],
    queryFn: () => api.get(`/api/companies/${id}`).then(res => res.data),
    initialData,
  });

  const [showMetrics, setShowMetrics] = useState(false);
  const [showEvaluations, setShowEvaluations] = useState(false);
  const [showInteractions, setShowInteractions] = useState(false);
  const [showEmails, setShowEmails] = useState(false);

  const toggleSection = useCallback((setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    return () => setter((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg">
          {/* Header */}
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => router.back()}
                  className="mr-4 p-2 text-gray-400 hover:text-gray-500"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                  <p className="mt-1 text-sm text-gray-500">{company.tagline}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-5 sm:px-6">
            <div className="space-y-8">
              {/* Description */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3">Company Description</h2>
                <p className="text-gray-700">{company.description}</p>
              </div>

              {/* Metrics */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3">Metrics</h2>
                <button onClick={toggleSection(setShowMetrics)} className="text-blue-600 hover:text-blue-500">
                  {showMetrics ? 'Hide Metrics' : 'Show Metrics'}
                </button>
                {showMetrics && (
                  <MetricsPanel
                    metrics={{
                      userCount: company.metrics?.userCount || null,
                      growthRate: company.metrics?.growthRate || null,
                      burnRate: company.metrics?.burnRate || null,
                      revenue: company.metrics?.revenue || null
                    }}
                    onUpdate={async (metrics) => {
                      await api.patch(`/api/companies/${id}`, { metrics });
                      queryClient.invalidateQueries({ queryKey: ['company', id] });
                    }}
                  />
                )}
              </div>

              {/* Evaluations */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3">Evaluations</h2>
                <button onClick={toggleSection(setShowEvaluations)} className="text-blue-600 hover:text-blue-500">
                  {showEvaluations ? 'Hide Evaluations' : 'Show Evaluations'}
                </button>
                {showEvaluations && <EvaluationsPanel companyId={id} />}
              </div>

              {/* Interactions */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3">Interactions</h2>
                <button onClick={toggleSection(setShowInteractions)} className="text-blue-600 hover:text-blue-500">
                  {showInteractions ? 'Hide Interactions' : 'Show Interactions'}
                </button>
                {showInteractions && <InteractionsPanel companyId={id} />}
              </div>

              {/* Emails */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3">Emails</h2>
                <button onClick={toggleSection(setShowEmails)} className="text-blue-600 hover:text-blue-500">
                  {showEmails ? 'Hide Emails' : 'Show Emails'}
                </button>
                {showEmails && <EmailList companyId={id} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailClient;
