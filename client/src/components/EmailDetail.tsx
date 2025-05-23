import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ProcessedEmail, EmailAnalysisResult } from '@/types/email';
import { format } from 'date-fns';

interface EmailDetailProps {
  email: ProcessedEmail;
  onClose?: () => void;
}

const EmailDetail: React.FC<EmailDetailProps> = ({ email, onClose }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'content' | 'analysis'>('content');
  
  const analyzeEmailMutation = useMutation({
    mutationFn: async (emailId: string) => {
      await api.post(`/api/emails/${emailId}/analyze`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
    }
  });



  const deleteEmailMutation = useMutation({
    mutationFn: async (emailId: string) => {
      await api.delete(`/api/emails/${emailId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] });
      if (onClose) onClose();
    }
  });

  const handleAnalyzeEmail = () => {
    analyzeEmailMutation.mutate(email.id);
  };

  const handleDeleteEmail = () => {
    if (window.confirm('Are you sure you want to delete this email?')) {
      deleteEmailMutation.mutate(email.id);
    }
  };

  // Try to get the analysis result, which might be nested
  let analysisResult: EmailAnalysisResult | undefined = email.analysisResult;
  
  // Debug: Log the raw analysis result structure
  console.log('Raw Analysis Result:', analysisResult);
  
  // Check if the result is a string that needs to be parsed
  if (analysisResult && typeof analysisResult === 'string') {
    try {
      analysisResult = JSON.parse(analysisResult);
      console.log('Parsed from string:', analysisResult);
    } catch (e) {
      console.error('Failed to parse analysis result string:', e);
    }
  }
  
  // Check if the data is nested in extractedData
  if (analysisResult && analysisResult.extractedData) {
    console.log('Found nested data in extractedData:', analysisResult.extractedData);
    // Use the nested data structure
    analysisResult = {
      ...analysisResult,
      ...analysisResult.extractedData
    };
  }
  
  // Log the final structure we'll use
  console.log('Final Analysis Result Structure:', analysisResult);
  if (analysisResult) {
    console.log('Final Keys:', Object.keys(analysisResult));
    console.log('Metrics:', analysisResult.metrics);
    console.log('Interaction:', analysisResult.interaction);
    console.log('Evaluation Notes:', analysisResult.evaluationNotes);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{email.subject}</h3>
            <p className="text-sm text-gray-600">From: {email.sender}</p>
            <p className="text-sm text-gray-500">
              {format(new Date(email.receivedAt), 'PPP p')}
            </p>
          </div>
          <div className="flex space-x-2">
            {!email.processed && (
              <button
                onClick={handleAnalyzeEmail}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                disabled={analyzeEmailMutation.isPending}
              >
                {analyzeEmailMutation.isPending ? 'Analyzing...' : 'Analyze Email'}
              </button>
            )}
            <button
              onClick={handleDeleteEmail}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              disabled={deleteEmailMutation.isPending}
            >
              {deleteEmailMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'content' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('content')}
          >
            Email Content
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'analysis' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('analysis')}
            disabled={!email.processed}
          >
            Analysis Results
          </button>
        </nav>
      </div>

      <div className="p-4">
        {activeTab === 'content' && (
          <div className="prose max-w-none">
            <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg text-gray-800 font-mono text-sm">
              {email.content}
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div>
            {email.processed && analysisResult ? (
              <div className="space-y-6">
                {analysisResult.companyName && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Company Identified</h4>
                    <p className="text-blue-800">{analysisResult.companyName}</p>
                  </div>
                )}

                {analysisResult.metrics && Array.isArray(analysisResult.metrics) && analysisResult.metrics.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Metrics Extracted</h4>
                    <div className="bg-gray-50 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metric</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {analysisResult.metrics.map((metric, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{metric.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{metric.valueString || metric.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Handle single interaction object or array */}
                {analysisResult.interaction && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Interaction Extracted</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-900">{analysisResult.interaction.type}</span>
                        <span className="text-sm text-gray-500">
                          {analysisResult.interaction.date ? format(new Date(analysisResult.interaction.date), 'PP') : 'N/A'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-2">{analysisResult.interaction.summary}</p>
                      {analysisResult.interaction.notes && (
                        <p className="text-sm text-gray-600 mt-1">{analysisResult.interaction.notes}</p>
                      )}
                      {analysisResult.interaction.participants && analysisResult.interaction.participants.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">Participants: </span>
                          {analysisResult.interaction.participants.map((participant, i) => (
                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-1">
                              {participant}
                            </span>
                          ))}
                        </div>
                      )}
                      {analysisResult.interaction.followUpNeeded && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            Follow-up needed
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {analysisResult.evaluationNotes && Array.isArray(analysisResult.evaluationNotes) && analysisResult.evaluationNotes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Evaluation Notes</h4>
                    <div className="space-y-3">
                      {analysisResult.evaluationNotes.map((evaluation, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-900">{evaluation.category}</span>
                            {evaluation.score !== undefined && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Score: {evaluation.score}/10
                              </span>
                            )}
                          </div>
                          {evaluation.notes && (
                            <p className="text-sm text-gray-700 mt-2">{evaluation.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.businessUpdates && analysisResult.businessUpdates.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Business Updates</h4>
                    <div className="space-y-3">
                      {analysisResult.businessUpdates.map((update, index) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-900">{update.type}</span>
                            {update.date && (
                              <span className="text-sm text-gray-500">
                                {format(new Date(update.date), 'PP')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-2">{update.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Debug info */}
                <div className="bg-gray-100 p-4 rounded-lg mb-4 text-xs font-mono overflow-auto">
                  <p>Debug Info:</p>
                  <pre>{JSON.stringify(analysisResult, null, 2)}</pre>
                </div>

                {(!analysisResult.metrics || !Array.isArray(analysisResult.metrics) || analysisResult.metrics.length === 0) &&
                 (!analysisResult.interaction) &&
                 (!analysisResult.evaluationNotes || !Array.isArray(analysisResult.evaluationNotes) || analysisResult.evaluationNotes.length === 0) && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-yellow-700">No structured data was extracted from this email.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-gray-500 mb-4">This email has not been analyzed yet.</p>
                <button
                  onClick={handleAnalyzeEmail}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  disabled={analyzeEmailMutation.isPending}
                >
                  {analyzeEmailMutation.isPending ? 'Analyzing...' : 'Analyze Now'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailDetail;
