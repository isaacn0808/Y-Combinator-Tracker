"use client";

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

interface Interaction {
  id: string;
  companyId: string;
  type: string;
  date: string;
  summary: string;
  notes?: string;
  participants?: string[];
  followUpNeeded: boolean;
  source: string;
  createdAt: string;
  updatedAt: string;
}

interface InteractionsPanelProps {
  companyId: string;
}

const fetchInteractions = async (companyId: string): Promise<Interaction[]> => {
  const { data } = await api.get(`/api/companies/${companyId}/interactions`);
  return data;
};

const InteractionsPanel: React.FC<InteractionsPanelProps> = ({ companyId }) => {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: interactions, isLoading, isError } = useQuery<Interaction[]>({
    queryKey: ['interactions', companyId],
    queryFn: () => fetchInteractions(companyId),
  });
  
  const handleDeleteInteraction = async (interactionId: string) => {
    if (confirm('Are you sure you want to delete this interaction?')) {
      try {
        setIsDeleting(interactionId);
        await api.delete(`/api/companies/${companyId}/interactions/${interactionId}`);
        // Invalidate the interactions query to refetch the data
        queryClient.invalidateQueries({ queryKey: ['interactions', companyId] });
      } catch (error) {
        console.error('Error deleting interaction:', error);
        alert('Failed to delete interaction. Please try again.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

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
        Error loading interactions. Please try again.
      </div>
    );
  }

  if (!interactions || interactions.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <p className="text-gray-500">No interactions recorded for this company.</p>
      </div>
    );
  }

  // Sort interactions by date (newest first)
  const sortedInteractions = [...interactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Interaction History</h3>
      
      <div className="space-y-4">
        {sortedInteractions.map((interaction) => (
          <div key={interaction.id} className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900">{interaction.type}</h4>
                <p className="text-sm text-gray-500">{format(new Date(interaction.date), 'PPP')}</p>
              </div>
              <div className="flex items-center space-x-2">
                {interaction.source === 'Email Analysis' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    From Email
                  </span>
                )}
                {interaction.followUpNeeded && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                    Follow-up needed
                  </span>
                )}
                <button
                  onClick={() => handleDeleteInteraction(interaction.id)}
                  disabled={isDeleting === interaction.id}
                  className="ml-2 p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title="Delete interaction"
                >
                  {isDeleting === interaction.id ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            </div>
            
            <div className="mt-3">
              <p className="text-gray-900 font-medium">Summary</p>
              <p className="text-gray-700">{interaction.summary}</p>
            </div>
            
            {interaction.notes && (
              <div className="mt-3">
                <p className="text-gray-900 font-medium">Notes</p>
                <p className="text-gray-700">{interaction.notes}</p>
              </div>
            )}
            
            {interaction.participants && interaction.participants.length > 0 && (
              <div className="mt-3">
                <p className="text-gray-900 font-medium">Participants</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {interaction.participants.map((participant, idx) => (
                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {participant}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InteractionsPanel;
