import { Metadata } from 'next';
import { Company } from '@/types';
import CompanyDetailClient from './client-page';

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateStaticParams() {
  // For static export, we'll pre-render paths for a set of IDs
  // You can adjust this range based on your needs
  return Array.from({ length: 100 }, (_, i) => ({
    id: (i + 1).toString(),
  }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  return {
    title: `Company ${resolvedParams.id}`,
  };
}

export default async function Page({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/companies/${resolvedParams.id}`, {
      next: { revalidate: 60 },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) throw new Error('Failed to fetch company');
    const company: Company = await res.json();
    return <CompanyDetailClient initialData={company} />;
  } catch (error) {
    // During static build, return a placeholder
    if (process.env.NODE_ENV === 'production') {
      const placeholderCompany: Company = {
        id: resolvedParams.id,
        name: 'Loading...',
        batch: 'Loading...',
        status: 'new',
        description: 'Company data will load client-side',
        website: '',
        sectors: [],
        oneLiner: 'Loading...',
        foundingDate: '',
        founders: [],
        productStatus: 'pre-launch',
        businessModel: 'Loading...',
        developmentStage: 'idea',
        metWith: false
      };
      return <CompanyDetailClient initialData={placeholderCompany} />;
    }
    throw error;
  }
}
