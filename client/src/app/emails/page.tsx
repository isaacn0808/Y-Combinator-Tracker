"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import EmailList from '@/components/EmailList';
import EmailDetail from '@/components/EmailDetail';
import { ProcessedEmail } from '@/types/email';

const EmailsPage: React.FC = () => {
  const router = useRouter();
  const [selectedEmail, setSelectedEmail] = useState<ProcessedEmail | null>(null);

  const handleSelectEmail = (email: ProcessedEmail) => {
    setSelectedEmail(email);
  };

  const handleCloseDetail = () => {
    setSelectedEmail(null);
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="container mx-auto p-4">
      <button 
        onClick={handleBack}
        className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
      >
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </button>
      
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Email Management</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Processed Emails</h2>
            <EmailList onSelectEmail={handleSelectEmail} />
          </div>
        </div>
        
        <div className="lg:col-span-2">
          {selectedEmail ? (
            <EmailDetail email={selectedEmail} onClose={handleCloseDetail} />
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500 mb-4">Select an email to view details</p>
                <p className="text-sm text-gray-400">
                  The system automatically checks for new emails every 30 seconds
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailsPage;
