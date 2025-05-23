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

interface CompanyMetrics {
  userCount: number | null;
  growthRate: number | null;
  burnRate: string | null;
  revenue: string | null;
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

  const handleUpdateMetrics = async (metrics: Partial<CompanyMetrics>) => {
    const updatedMetrics = Object.entries(metrics).reduce((acc, [key, value]) => {
      acc[`metrics_${key}`] = value;
      return acc;
    }, {} as Record<string, string | number | null>);

    await api.patch(`/api/companies/${id}`, updatedMetrics);
    await queryClient.invalidateQueries({ queryKey: ['company', id] });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.push('/companies')}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Companies
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-3xl font-bold mb-4">{company.name}</h1>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <button
                  onClick={toggleSection(setShowMetrics)}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <ArrowLeft
                    className={`w-4 h-4 mr-2 transform transition-transform ${
                      showMetrics ? 'rotate-90' : ''
                    }`}
                  />
                  Metrics
                </button>
                {showMetrics && (
                  <MetricsPanel
                    metrics={{
                      userCount: company.metrics_userCount || null,
                      growthRate: company.metrics_growthRate || null,
                      burnRate: company.metrics_burnRate || null,
                      revenue: company.metrics_revenue || null,
                    }}
                    onUpdate={handleUpdateMetrics}
                  />
                )}
              </div>
              <div>
                <button
                  onClick={toggleSection(setShowEvaluations)}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <ArrowLeft
                    className={`w-4 h-4 mr-2 transform transition-transform ${
                      showEvaluations ? 'rotate-90' : ''
                    }`}
                  />
                  Evaluations
                </button>
                {showEvaluations && <EvaluationsPanel companyId={id} />}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <button
                  onClick={toggleSection(setShowInteractions)}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <ArrowLeft
                    className={`w-4 h-4 mr-2 transform transition-transform ${
                      showInteractions ? 'rotate-90' : ''
                    }`}
                  />
                  Interactions
                </button>
                {showInteractions && <InteractionsPanel companyId={id} />}
              </div>
              <div>
                <button
                  onClick={toggleSection(setShowEmails)}
                  className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
                >
                  <ArrowLeft
                    className={`w-4 h-4 mr-2 transform transition-transform ${
                      showEmails ? 'rotate-90' : ''
                    }`}
                  />
                  Emails
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
