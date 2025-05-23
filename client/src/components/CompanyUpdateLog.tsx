"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ArrowRightIcon, TrendingUpIcon, DollarSignIcon, FileTextIcon } from 'lucide-react';

interface UpdateLogItem {
  id: string;
  companyId: string;
  timestamp: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  source: string | null;
  userId: string | null;
}

interface CompanyUpdateLogProps {
  companyId: string;
}

const fetchUpdateLogs = async (companyId: string): Promise<UpdateLogItem[]> => {
  const { data } = await api.get(`/api/companies/${companyId}/updatelogs`);
  return data;
};

const CompanyUpdateLog: React.FC<CompanyUpdateLogProps> = ({ companyId }) => {
  const { data: updateLogs, isLoading, isError } = useQuery<UpdateLogItem[]>({
    queryKey: ['updateLogs', companyId],
    queryFn: () => fetchUpdateLogs(companyId),
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
        Error loading update logs. Please try again.
      </div>
    );
  }

  if (!updateLogs || updateLogs.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <p className="text-gray-500">No update logs recorded for this company.</p>
      </div>
    );
  }

  // Group updates by date
  const groupedUpdates: Record<string, UpdateLogItem[]> = {};
  updateLogs.forEach(log => {
    const date = new Date(log.timestamp).toISOString().split('T')[0];
    if (!groupedUpdates[date]) {
      groupedUpdates[date] = [];
    }
    groupedUpdates[date].push(log);
  });

  // Sort dates in descending order (newest first)
  const sortedDates = Object.keys(groupedUpdates).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const getUpdateIcon = (fieldName: string) => {
    if (fieldName.toLowerCase().includes('metric') || 
        fieldName.includes('userCount') || 
        fieldName.includes('growthRate') || 
        fieldName.includes('revenue') || 
        fieldName.includes('burnRate')) {
      return <TrendingUpIcon className="h-5 w-5 text-blue-500" />;
    } else if (fieldName.toLowerCase().includes('fund') || 
              fieldName.includes('raised') || 
              fieldName.includes('valuation') || 
              fieldName.includes('runway')) {
      return <DollarSignIcon className="h-5 w-5 text-green-500" />;
    } else {
      return <FileTextIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatValue = (value: string | null) => {
    if (value === null) return 'Not set';
    return value;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Update Log</h3>
      <div className="space-y-8">
        {sortedDates.map(date => (
          <div key={date} className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {format(new Date(date), 'MMMM d, yyyy')}
            </h4>
            <div className="space-y-4">
              {groupedUpdates[date].map(log => (
                <div key={log.id} className="relative">
                  <div className="flex items-start">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 border border-gray-200 flex-shrink-0">
                      {getUpdateIcon(log.fieldName)}
                    </div>
                    <div className="ml-4 flex-grow">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {log.fieldName}
                        </h4>
                        <time className="text-sm text-gray-500">
                          {format(new Date(log.timestamp), 'h:mm a')}
                        </time>
                      </div>
                      <div className="mt-2 flex items-center text-sm">
                        <span className="text-gray-900">{formatValue(log.oldValue)}</span>
                        <ArrowRightIcon className="h-4 w-4 mx-2 text-gray-400" />
                        <span className="text-gray-900 font-medium">
                          {formatValue(log.newValue)}
                        </span>
                      </div>
                      {log.source && (
                        <p className="mt-1 text-xs text-gray-500">
                          Source: {log.source}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompanyUpdateLog;
