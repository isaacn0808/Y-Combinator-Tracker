import React, { useMemo } from 'react'
import { Company } from '../types'
import { CompanyCard } from '@/components/CompanyCard'
import { CompanyTable } from '@/components/CompanyTable'
import { Filters as FiltersComponent } from '@/components/Filters'
import { LayoutGrid, Table } from 'lucide-react'
import { useFilterContext } from '@/context/FilterContext'
interface BatchViewProps {
  companies: Company[]
  onSelectCompany: (company: Company) => void
}

export const BatchView: React.FC<BatchViewProps> = ({
  companies,
  onSelectCompany,
}) => {
  const { 
    viewMode, 
    setViewMode, 
    filters, 
    setFilters, 
    sortField, 
    setSortField, 
    sortDirection, 
    setSortDirection 
  } = useFilterContext()
  const availableSectors = useMemo(() => {
    // Collect all sectors from all companies
    const allSectors = companies.flatMap(company => company.sectors || []).filter(Boolean);
    return Array.from(new Set(allSectors));
  }, [companies])
  const availableStages = useMemo(() => {
    return Array.from(
      new Set(companies.map((company) => company.developmentStage)),
    )
  }, [companies])
  const availableStatuses = useMemo(() => {
    return Array.from(new Set(companies.map((company) => company.status)))
  }, [companies])
  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      // Search filter
      if (
        filters.search &&
        !company.name.toLowerCase().includes(filters.search.toLowerCase()) &&
        !company.oneLiner.toLowerCase().includes(filters.search.toLowerCase())
      ) {
        return false
      }
      // Sector filter
      if (filters.sectors.length > 0) {
        // Handle multiple sectors per company
        const companySectors = company.sectors || [];
        if (!filters.sectors.some(sector => companySectors.includes(sector))) {
          return false;
        }
      }
      // Stage filter
      if (
        filters.stages.length > 0 &&
        !filters.stages.includes(company.developmentStage)
      ) {
        return false
      }
      // Status filter
      if (
        filters.status.length > 0 &&
        !filters.status.includes(company.status)
      ) {
        return false
      }
      // Met with filter
      if (filters.metWith !== null && company.metWith !== filters.metWith) {
        return false
      }
      return true
    })
  }, [companies, filters])
  // Helper function to calculate overall score
  const calculateOverallScore = (company: Company): number => {
    if (!company.evaluationScores) return 0;
    
    const scores = [
      company.evaluationScores.problem || 0,
      company.evaluationScores.solution || 0,
      company.evaluationScores.team || 0,
      company.evaluationScores.market || 0,
      company.evaluationScores.businessModel || 0,
      company.evaluationScores.traction || 0,
      company.evaluationScores.competition || 0,
      company.evaluationScores.differentiation || 0,
      company.evaluationScores.investmentPotential || 0
    ];
    
    // Filter out zeros to avoid skewing the average when some scores are missing
    const validScores = scores.filter(score => score > 0);
    if (validScores.length === 0) return 0;
    
    // Calculate the average of all valid scores
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  };

  const sortedCompanies = useMemo(() => {
    return [...filteredCompanies].sort((a, b) => {
      let valueA: string | number | undefined
      let valueB: string | number | undefined
      
      if (sortField === 'name') {
        valueA = a.name
        valueB = b.name
      } else if (sortField === 'overall') {
        // Calculate overall scores for both companies
        valueA = calculateOverallScore(a);
        valueB = calculateOverallScore(b);
      } else {
        valueA =
          a.evaluationScores?.[sortField as keyof typeof a.evaluationScores] ||
          0
        valueB =
          b.evaluationScores?.[sortField as keyof typeof b.evaluationScores] ||
          0
      }
      
      if (valueA < valueB) {
        return sortDirection === 'asc' ? -1 : 1
      }
      if (valueA > valueB) {
        return sortDirection === 'asc' ? 1 : -1
      }
      return 0
    })
  }, [filteredCompanies, sortField, sortDirection])
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            YC Spring 2025 Batch
          </h1>
          <div className="text-sm text-gray-500">
            {sortedCompanies.length} companies
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-md">
          <button
            onClick={() => setViewMode('card')}
            className={`flex items-center p-2 rounded ${viewMode === 'card' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            aria-label="Card view"
          >
            <LayoutGrid size={20} className={viewMode === 'card' ? 'text-blue-600' : 'text-gray-600'} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center p-2 rounded ${viewMode === 'table' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
            aria-label="Table view"
          >
            <Table size={20} className={viewMode === 'table' ? 'text-blue-600' : 'text-gray-600'} />
          </button>
        </div>
      </div>
      <FiltersComponent
        filters={filters}
        setFilters={setFilters}
        sortField={sortField}
        setSortField={setSortField}
        sortDirection={sortDirection}
        setSortDirection={setSortDirection}
        availableSectors={availableSectors}
        availableStages={availableStages}
        availableStatuses={availableStatuses}
      />
      {sortedCompanies.length > 0 ? (
        viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedCompanies.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onClick={() => onSelectCompany(company)}
              />
            ))}
          </div>
        ) : (
          <CompanyTable 
            companies={sortedCompanies} 
            onRowClick={onSelectCompany} 
          />
        )
      ) : (
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">
            No companies match your filters
          </p>
        </div>
      )}
    </div>
  )
}
