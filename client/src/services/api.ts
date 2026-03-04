import axios from 'axios';
import { Property, StatsResult, Filters, MetaData } from '../types';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('aa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('aa_token');
      localStorage.removeItem('aa_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export function buildQueryParams(filters: Partial<Filters>): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.status?.length) params.status = filters.status.join(',');
  if (filters.zipCodes?.length) params.zipCodes = filters.zipCodes.join(',');
  if (filters.schoolDistricts?.length) params.schoolDistricts = filters.schoolDistricts.join(',');
  if (filters.neighborhoods?.length) params.neighborhoods = filters.neighborhoods.join(',');
  if (filters.subdivisions?.length) params.subdivisions = filters.subdivisions.join(',');
  if (filters.minSqft) params.minSqft = filters.minSqft;
  if (filters.maxSqft) params.maxSqft = filters.maxSqft;
  if (filters.minPrice) params.minPrice = filters.minPrice;
  if (filters.maxPrice) params.maxPrice = filters.maxPrice;
  if (filters.minBedrooms) params.minBedrooms = filters.minBedrooms;
  if (filters.maxBedrooms) params.maxBedrooms = filters.maxBedrooms;
  if (filters.minBathrooms) params.minBathrooms = filters.minBathrooms;
  if (filters.minLotSize) params.minLotSize = filters.minLotSize;
  if (filters.maxLotSize) params.maxLotSize = filters.maxLotSize;
  if (filters.stories?.length) params.stories = filters.stories.join(',');
  if (filters.newConstruction) params.newConstruction = filters.newConstruction;
  if (filters.minYearBuilt) params.minYearBuilt = filters.minYearBuilt;
  if (filters.maxYearBuilt) params.maxYearBuilt = filters.maxYearBuilt;
  if (filters.startDate) params.startDate = filters.startDate;
  if (filters.endDate) params.endDate = filters.endDate;
  if (filters.lat) params.lat = filters.lat;
  if (filters.lng) params.lng = filters.lng;
  if (filters.radiusMiles) params.radiusMiles = filters.radiusMiles;
  return params;
}

export interface PropertiesResponse {
  properties: Property[];
  stats: StatsResult;
  total: number;
}

export const apiService = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    return res.data as { token: string; user: { id: string; name: string; email: string; role: string; agentId: string } };
  },

  getProperties: async (filters?: Partial<Filters>): Promise<PropertiesResponse> => {
    const params = filters ? buildQueryParams(filters) : {};
    const res = await api.get('/properties', { params });
    return res.data;
  },

  getProperty: async (id: string): Promise<Property> => {
    const res = await api.get(`/properties/${id}`);
    return res.data;
  },

  getMeta: async (): Promise<MetaData> => {
    const res = await api.get('/properties/meta');
    return res.data;
  },
};

export default apiService;
