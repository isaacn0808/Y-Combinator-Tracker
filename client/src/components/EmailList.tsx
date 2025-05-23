import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ProcessedEmail } from '@/types/email';
import { formatDistanceToNow } from 'date-fns';

interface EmailListProps {
  companyId?: string;
  onSelectEmail?: (email: ProcessedEmail) => void;
}

const fetchEmails = async (companyId?: string): Promise<ProcessedEmail[]> => {
  const url = companyId 
    ? `/api/emails?companyId=${companyId}`
    : '/api/emails';
  const { data } = await api.get(url);
  return data;
};

const EmailList: React.FC<EmailListProps> = ({ companyId, onSelectEmail }) => {
  const queryClient = useQueryClient();
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  const { data: emails, isLoading, isError } = useQuery<ProcessedEmail[]>({
    queryKey: ['emails', companyId],
    queryFn: () => fetchEmails(companyId),
  });

  const fetchEmailsMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/emails/fetch');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    }
  });

  const processAllEmailsMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/emails/process-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    }
  });

  const handleSelectEmail = (email: ProcessedEmail) => {
    setSelectedEmailId(email.id);
    if (onSelectEmail) {
      onSelectEmail(email);
    }
  };

  const handleFetchEmails = () => {
    fetchEmailsMutation.mutate();
  };

  const handleProcessEmails = () => {
    processAllEmailsMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-gray-100 p-4 rounded-lg">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading emails. Please try again.
      </div>
    );
  }

  if (!emails || emails.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <p className="text-gray-500 mb-4">No emails found.</p>
          <div className="flex justify-center space-x-2">
            <button
              onClick={handleFetchEmails}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              disabled={fetchEmailsMutation.isPending}
            >
              {fetchEmailsMutation.isPending ? 'Fetching...' : 'Fetch Emails'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          {emails.length} {emails.length === 1 ? 'Email' : 'Emails'} Found
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={handleFetchEmails}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            disabled={fetchEmailsMutation.isPending}
          >
            {fetchEmailsMutation.isPending ? 'Fetching...' : 'Fetch New Emails'}
          </button>
          <button
            onClick={handleProcessEmails}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            disabled={processAllEmailsMutation.isPending}
          >
            {processAllEmailsMutation.isPending ? 'Processing...' : 'Process All Unprocessed'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {emails.map((email) => (
          <div
            key={email.id}
            className={`border rounded-lg p-4 cursor-pointer transition-colors ${
              selectedEmailId === email.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:bg-gray-50'
            }`}
            onClick={() => handleSelectEmail(email)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900">{email.subject}</h4>
                <p className="text-sm text-gray-600">From: {email.sender}</p>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                </span>
                {email.processed ? (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Processed
                  </span>
                ) : (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Unprocessed
                  </span>
                )}
              </div>
            </div>
            {email.companyName && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {email.companyName}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailList;
