import React, { createContext, useContext, useState, useCallback } from 'react';
import { Filters, PropertyStatus, Amenities } from '../types';

const defaultFilters: Filters = {
  status: [],
  zipCodes: [],
  schoolDistricts: [],
  neighborhoods: [],
  subdivisions: [],
  minSqft: '',
  maxSqft: '',
  minPrice: '',
  maxPrice: '',
  minBedrooms: '',
  maxBedrooms: '',
  minBathrooms: '',
  minLotSize: '',
  maxLotSize: '',
  stories: [],
  newConstruction: '',
  minYearBuilt: '',
  maxYearBuilt: '',
  startDate: '',
  endDate: '',
  amenities: {},
  lat: '',
  lng: '',
  radiusMiles: '',
};

interface FilterContextType {
  filters: Filters;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  toggleStatus: (s: PropertyStatus) => void;
  toggleStory: (n: number) => void;
  toggleAmenity: (key: keyof Amenities) => void;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [isOpen, setIsOpen] = useState(false);

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => setFilters(defaultFilters), []);

  const toggleStatus = useCallback((s: PropertyStatus) => {
    setFilters(prev => ({
      ...prev,
      status: prev.status.includes(s) ? prev.status.filter(x => x !== s) : [...prev.status, s],
    }));
  }, []);

  const toggleStory = useCallback((n: number) => {
    setFilters(prev => ({
      ...prev,
      stories: prev.stories.includes(n) ? prev.stories.filter(x => x !== n) : [...prev.stories, n],
    }));
  }, []);

  const toggleAmenity = useCallback((key: keyof Amenities) => {
    setFilters(prev => ({
      ...prev,
      amenities: { ...prev.amenities, [key]: !prev.amenities[key] },
    }));
  }, []);

  return (
    <FilterContext.Provider value={{ filters, setFilter, resetFilters, toggleStatus, toggleStory, toggleAmenity, isOpen, setIsOpen }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be inside FilterProvider');
  return ctx;
}
