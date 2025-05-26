import { Metadata } from 'next';
import { Company } from '@/types';
import CompanyDetailClient from './client-page';

type Props = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

// Set this page to be dynamically rendered
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return {
    title: `Company ${params.id}`,
  };
}

export default async function Page({ params }: Props) {
  const { id } = params;
  
  try {
    // Server-side data fetching
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8088'}/api/companies/${id}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      // This ensures the data is fresh
      cache: 'no-store'
    });

    if (!res.ok) throw new Error('Failed to fetch company');
    const company: Company = await res.json();
    
    // Pass the fetched data to the client component
    return <CompanyDetailClient initialData={company} />;
  } catch (error) {
    console.error('Error fetching company:', error);
    
    // Fallback data in case of error
    const fallbackCompany: Company = {
      id: id,
      name: 'Error Loading Data',
      batch: 'Unknown',
      status: 'new',
      description: 'There was an error loading the company data. Please try again later.',
      website: '',
      sectors: [],
      oneLiner: 'Error loading data',
      foundingDate: '',
      founders: [],
      productStatus: 'pre-launch',
      businessModel: 'Unknown',
      developmentStage: 'idea',
      metWith: false
    };
    
    return <CompanyDetailClient initialData={fallbackCompany} />;
  }
}
