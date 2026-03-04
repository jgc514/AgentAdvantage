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
  lotSize: number; // in acres
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
  adu: boolean; // Accessory Dwelling Unit
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

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'broker' | 'agent';
  agentId: string;
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

export interface FilterParams {
  status?: PropertyStatus[];
  zipCodes?: string[];
  schoolDistricts?: string[];
  neighborhoods?: string[];
  subdivisions?: string[];
  minSqft?: number;
  maxSqft?: number;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minLotSize?: number;
  maxLotSize?: number;
  stories?: number[];
  newConstruction?: boolean;
  minYearBuilt?: number;
  maxYearBuilt?: number;
  startDate?: string;
  endDate?: string;
  amenities?: Partial<Amenities>;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
}
