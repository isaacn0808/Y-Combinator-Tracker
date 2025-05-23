"use client";

import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';
import { Filters, SortDirection, SortField } from '@/types';

type ViewMode = 'card' | 'table';

interface FilterContextType {
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  sortField: SortField;
  setSortField: Dispatch<SetStateAction<SortField>>;
  sortDirection: SortDirection;
  setSortDirection: Dispatch<SetStateAction<SortDirection>>;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<Filters>({
    search: '',
    sectors: [],
    stages: [],
    status: [],
    metWith: null,
  });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  return (
    <FilterContext.Provider
      value={{
        filters,
        setFilters,
        sortField,
        setSortField,
        sortDirection,
        setSortDirection,
        viewMode,
        setViewMode,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilterContext = (): FilterContextType => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
};
