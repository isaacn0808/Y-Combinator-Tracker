"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Company, /* EvaluationNotes, EvaluationScores */ } from '@/types';
import { BatchView } from '@/components/BatchView';
import { CompanyDetail } from '@/components/CompanyDetail';
const fetchCompanies = async (): Promise<Company[]> => {
  const { data } = await api.get('/api/companies');
  return data;
};

export default function App() { // Changed to default export for Next.js page convention
  const { data: fetchedCompanies, isLoading, isError, error: fetchError } = useQuery<Company[], Error>({
    queryKey: ['homePageCompanies'], // Unique queryKey
    queryFn: fetchCompanies,
  });

  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  useEffect(() => {
    if (fetchedCompanies) {
      setCompanies(fetchedCompanies);
    }
  }, [fetchedCompanies]);

  const handleSelectCompany = (company: Company) => {
    setSelectedCompany(company)
  }
  const handleUpdateCompany = (updatedCompany: Company) => {
    setCompanies(
      companies.map((company) =>
        company.id === updatedCompany.id ? updatedCompany : company,
      ),
    )
    setSelectedCompany(updatedCompany)
  }
  // const handleUpdateEvaluation = (
  //   companyId: string,
  //   scores: Partial<EvaluationScores>,
  //   notes: Partial<EvaluationNotes>,
  // ) => {
  //   setCompanies(
  //     companies.map((company) =>
  //       company.id === companyId
  //         ? {
  //             ...company,
  //             evaluationScores: {
  //               ...company.evaluationScores,
  //               ...scores,
  //             },
  //             evaluationNotes: {
  //               ...company.evaluationNotes,
  //               ...notes,
  //             },
  //           } as Company // Ensure the updated object is of type Company
  //         : company,
  //     ),
  //   );
  //   if (selectedCompany && selectedCompany.id === companyId) {
  //     setSelectedCompany({
  //       ...selectedCompany,
  //       evaluationScores: {
  //           ...selectedCompany.evaluationScores,
  //           ...scores,
  //         },
  //         evaluationNotes: {
  //           ...selectedCompany.evaluationNotes,
  //           ...notes,
  //         },
  //       }); // End of setSelectedCompany call
  //     } // End of if (selectedCompany && selectedCompany.id === companyId)
  //   }; // End of const handleUpdateEvaluation = ...

  // const handleCloseDetail = () => {
  //   setSelectedCompany(null);
  // };

  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Loading companies...</p></div>;
  }

  if (isError) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Error fetching companies: {fetchError?.message || 'Unknown error'}</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {selectedCompany ? (
        <CompanyDetail
          company={selectedCompany}
          onBack={() => setSelectedCompany(null)}
          onUpdateCompany={handleUpdateCompany}
        />
      ) : (
        <BatchView
          companies={companies}
          onSelectCompany={handleSelectCompany}
        />
      )}
    </div>
  )
}
