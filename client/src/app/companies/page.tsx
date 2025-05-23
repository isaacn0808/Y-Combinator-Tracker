"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Company } from '@/types';
import { BatchView } from '@/components/BatchView';
import { useRouter } from 'next/navigation';

const fetchCompanies = async (): Promise<Company[]> => {
  const { data } = await api.get('/api/companies');
  return data;
};

const CompaniesPage: React.FC = () => {
  const router = useRouter();
  
  const { data: companies, isLoading, isError, error } = useQuery<Company[], Error>({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
  });
  
  const handleCompanyClick = (company: Company) => {
    // Navigate to company detail page
    router.push(`/companies/${company.id}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">YC Companies</h1>
        <p>Loading companies...</p>
        {/* Optional: Add a skeleton loader here */}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">YC Companies</h1>
        <p className="text-red-500">Error fetching companies: {error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">YC Company Tracker</h1>
      
      {companies && companies.length > 0 ? (
        <BatchView 
          companies={companies} 
          onSelectCompany={handleCompanyClick} 
        />
      ) : (
        <p className="text-center text-gray-500">No companies found.</p>
      )}
    </div>
  );
};

export default CompaniesPage;
