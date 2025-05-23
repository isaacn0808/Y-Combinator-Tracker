import React from 'react'
import { useState } from 'react';
import { Filters as FiltersType, SortField, SortDirection } from '@/types';
import { SearchIcon, FilterIcon, SortAscIcon, SortDescIcon, X } from 'lucide-react'
interface FiltersProps {
  filters: FiltersType
  setFilters: React.Dispatch<React.SetStateAction<FiltersType>>
  sortField: SortField
  setSortField: React.Dispatch<React.SetStateAction<SortField>>
  sortDirection: SortDirection
  setSortDirection: React.Dispatch<React.SetStateAction<SortDirection>>
  availableSectors: string[]
  availableStages: string[]
  availableStatuses: string[]
}
export const Filters: React.FC<FiltersProps> = ({
  filters,
  setFilters,
  sortField,
  setSortField,
  sortDirection,
  setSortDirection,
  availableSectors,
  availableStages,
  availableStatuses,
}) => {
  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false);
  const [stageDropdownOpen, setStageDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
  }
  const toggleMetWith = () => {
    if (filters.metWith === true) {
      setFilters({
        ...filters,
        metWith: false,
      })
    } else if (filters.metWith === false) {
      setFilters({
        ...filters,
        metWith: null,
      })
    } else {
      setFilters({
        ...filters,
        metWith: true,
      })
    }
  }
  const toggleSector = (sector: string) => {
    setFilters({
      ...filters,
      sectors: filters.sectors.includes(sector)
        ? filters.sectors.filter((s) => s !== sector)
        : [...filters.sectors, sector],
    })
  }
  const toggleStage = (stage: string) => {
    setFilters({
      ...filters,
      stages: filters.stages.includes(stage)
        ? filters.stages.filter((s) => s !== stage)
        : [...filters.stages, stage],
    })
  }
  const toggleStatus = (status: string) => {
    setFilters({
      ...filters,
      status: filters.status.includes(status)
        ? filters.status.filter((s) => s !== status)
        : [...filters.status, status],
    })
  }
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search companies..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={filters.search}
            onChange={(e) =>
              setFilters({
                ...filters,
                search: e.target.value,
              })
            }
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
          >
            <option value="name">Company Name</option>
            <option value="overall">Overall Score</option>
            <option value="problem">Problem Score</option>
            <option value="solution">Solution Score</option>
            <option value="team">Team Score</option>
            <option value="market">Market Score</option>

            <option value="traction">Traction Score</option>
            <option value="competition">Competition Score</option>
            <option value="differentiation">Differentiation Score</option>
            <option value="investmentPotential">Investment Potential</option>
          </select>
          <button
            type="button"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={toggleSortDirection}
          >
            {sortDirection === 'asc' ? (
              <SortAscIcon className="h-4 w-4" />
            ) : (
              <SortDescIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${filters.metWith === true ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            onClick={toggleMetWith}
          >
            Met
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-b border-r ${filters.metWith === false ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            onClick={toggleMetWith}
          >
            Not Met
          </button>
        </div>
        <div className="relative inline-block">
          <button
            type="button"
            className={`inline-flex items-center px-4 py-2 border ${filters.sectors.length > 0 ? 'bg-blue-50 text-blue-700 border-blue-300' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            onClick={() => setSectorDropdownOpen(!sectorDropdownOpen)}
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            Sectors{' '}
            {filters.sectors.length > 0 && `(${filters.sectors.length})`}
          </button>
          {sectorDropdownOpen && (
            <div className="absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
              <div className="flex justify-between items-center px-4 py-2 border-b">
                <h3 className="text-sm font-medium">Filter by Sector</h3>
                <button
                  onClick={() => setSectorDropdownOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  {availableSectors.map((sector, index) => (
                    <label
                      key={`${sector}-${index}`}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={filters.sectors.includes(sector)}
                        onChange={() => toggleSector(sector)}
                      />
                      {sector}
                    </label>
                  ))}
                </div>
              </div>
              {filters.sectors.length > 0 && (
                <div className="border-t px-4 py-2">
                  <button
                    onClick={() => setFilters({...filters, sectors: []})} 
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="relative inline-block">
          <button
            type="button"
            className={`inline-flex items-center px-4 py-2 border ${filters.stages.length > 0 ? 'bg-blue-50 text-blue-700 border-blue-300' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            onClick={() => setStageDropdownOpen(!stageDropdownOpen)}
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            Stages {filters.stages.length > 0 && `(${filters.stages.length})`}
          </button>
          {stageDropdownOpen && (
            <div className="absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
              <div className="flex justify-between items-center px-4 py-2 border-b">
                <h3 className="text-sm font-medium">Filter by Stage</h3>
                <button
                  onClick={() => setStageDropdownOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  {availableStages.map((stage, index) => (
                    <label
                      key={`${stage}-${index}`}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={filters.stages.includes(stage)}
                        onChange={() => toggleStage(stage)}
                      />
                      {stage}
                    </label>
                  ))}
                </div>
              </div>
              {filters.stages.length > 0 && (
                <div className="border-t px-4 py-2">
                  <button
                    onClick={() => setFilters({...filters, stages: []})} 
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="relative inline-block">
          <button
            type="button"
            className={`inline-flex items-center px-4 py-2 border ${filters.status.length > 0 ? 'bg-blue-50 text-blue-700 border-blue-300' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'} rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
          >
            <FilterIcon className="h-4 w-4 mr-2" />
            Status {filters.status.length > 0 && `(${filters.status.length})`}
          </button>
          {statusDropdownOpen && (
            <div className="absolute z-10 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
              <div className="flex justify-between items-center px-4 py-2 border-b">
                <h3 className="text-sm font-medium">Filter by Status</h3>
                <button
                  onClick={() => setStatusDropdownOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  {availableStatuses.map((status, index) => (
                    <label
                      key={`${status}-${index}`}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={filters.status.includes(status)}
                        onChange={() => toggleStatus(status)}
                      />
                      {status}
                    </label>
                  ))}
                </div>
              </div>
              {filters.status.length > 0 && (
                <div className="border-t px-4 py-2">
                  <button
                    onClick={() => setFilters({...filters, status: []})} 
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
