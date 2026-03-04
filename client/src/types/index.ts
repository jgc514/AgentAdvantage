export type PropertyStatus =
  | 'Sold'
  | 'Active'
  | 'New'
  | 'Price Change'
  | 'Pending'
  | 'Expired'
  | 'Canceled'
  | 'Withdrawn'
  | 'Backup'
  | 'Coming Soon';

export interface Amenities {
  pool: boolean;
  adu: boolean;
  shop: boolean;
  pond: boolean;
  fireplace: boolean;
  hotTub: boolean;
  solarPanels: boolean;
  coveredPatio: boolean;
  outdoorKitchen: boolean;
  guestHouse: boolean;
  barnOrStable: boolean;
  waterFeature: boolean;
  greenbeltView: boolean;
  waterView: boolean;
}

export interface Property {
  id: string;
  mlsNumber: string;
  address: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  neighborhood: string;
  subdivision: string;
  schoolDistrict: string;
  status: PropertyStatus;
  listPrice: number;
  soldPrice: number;
  sellerConcessions: number;
  trueSoldPrice: number;
  pricePerSqft: number;
  originalListPrice: number;
  priceChanges: number;
  sqft: number;
  lotSize: number;
  bedrooms: number;
  bathrooms: number;
  stories: number;
  yearBuilt: number;
  newConstruction: boolean;
  daysOnMarket: number;
  listDate: string;
  soldDate: string | null;
  expirationDate: string | null;
  amenities: Amenities;
  lat: number;
  lng: number;
  images: string[];
  garageSpaces: number;
  description: string;
}

export interface StatsResult {
  avgSoldPrice: number;
  avgListPrice: number;
  avgPricePerSqft: number;
  avgDOM: number;
  listSoldRatio: number;
  monthsInventory: number;
  totalProperties: number;
  medianSoldPrice: number;
  medianPricePerSqft: number;
  totalVolume: number;
}

export interface Filters {
  status: PropertyStatus[];
  zipCodes: string[];
  schoolDistricts: string[];
  neighborhoods: string[];
  subdivisions: string[];
  minSqft: string;
  maxSqft: string;
  minPrice: string;
  maxPrice: string;
  minBedrooms: string;
  maxBedrooms: string;
  minBathrooms: string;
  minLotSize: string;
  maxLotSize: string;
  stories: number[];
  newConstruction: '' | 'true' | 'false';
  minYearBuilt: string;
  maxYearBuilt: string;
  startDate: string;
  endDate: string;
  amenities: Partial<Amenities>;
  lat: string;
  lng: string;
  radiusMiles: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'broker' | 'agent';
  agentId: string;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

export interface BandPoint {
  x: number;
  upper: number;
  lower: number;
}

export interface MetaData {
  zipCodes: string[];
  schoolDistricts: string[];
  neighborhoods: string[];
  subdivisions: string[];
  streets: string[];
  statuses: string[];
}
