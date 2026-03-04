import { Property, StatsResult } from '../types';

export function linearRegression(points: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  r2: number;
  predict: (x: number) => number;
} {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0, predict: () => 0 };

  const xBar = points.reduce((s, p) => s + p.x, 0) / n;
  const yBar = points.reduce((s, p) => s + p.y, 0) / n;

  const Sxx = points.reduce((s, p) => s + (p.x - xBar) ** 2, 0);
  const Sxy = points.reduce((s, p) => s + (p.x - xBar) * (p.y - yBar), 0);
  const Syy = points.reduce((s, p) => s + (p.y - yBar) ** 2, 0);

  const slope = Sxx === 0 ? 0 : Sxy / Sxx;
  const intercept = yBar - slope * xBar;

  const SSR = slope * Sxy;
  const r2 = Syy === 0 ? 1 : SSR / Syy;

  return {
    slope,
    intercept,
    r2,
    predict: (x: number) => slope * x + intercept,
  };
}

export function confidenceBands(
  points: { x: number; y: number }[],
  xValues: number[],
  alpha = 0.05
): { x: number; upper: number; lower: number }[] {
  const n = points.length;
  if (n < 3) return [];

  const { slope, intercept } = linearRegression(points);
  const xBar = points.reduce((s, p) => s + p.x, 0) / n;
  const Sxx = points.reduce((s, p) => s + (p.x - xBar) ** 2, 0);

  const residuals = points.map(p => p.y - (slope * p.x + intercept));
  const SSE = residuals.reduce((s, r) => s + r ** 2, 0);
  const MSE = SSE / (n - 2);
  const s = Math.sqrt(MSE);

  // t critical value approximation for 95% CI (df = n-2)
  const df = n - 2;
  const tCrit = tDistInverse(1 - alpha / 2, df);

  return xValues.map(x => {
    const yHat = slope * x + intercept;
    const se = s * Math.sqrt(1 / n + (x - xBar) ** 2 / Sxx);
    const margin = tCrit * se;
    return { x, upper: yHat + margin, lower: yHat - margin };
  });
}

// Approximation of t-distribution inverse CDF (Abramowitz and Stegun)
function tDistInverse(p: number, df: number): number {
  if (df >= 120) return normalInverse(p);
  // Simple approximation
  const z = normalInverse(p);
  const correction = (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df ** 2);
  return z + correction;
}

function normalInverse(p: number): number {
  // Rational approximation (Beasley-Springer-Moro)
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  const t = p < 0.5 ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p));
  const num = a[0] + a[1] * t + a[2] * t ** 2;
  const den = 1 + b[0] * t + b[1] * t ** 2 + b[2] * t ** 3;
  const result = t - num / den;
  return p < 0.5 ? -result : result;
}

export function computeStats(properties: Property[]): StatsResult {
  const sold = properties.filter(p => p.status === 'Sold' && p.soldPrice > 0);
  const active = properties.filter(p => ['Active', 'New', 'Price Change'].includes(p.status));

  const avgSoldPrice = sold.length > 0
    ? sold.reduce((s, p) => s + p.trueSoldPrice, 0) / sold.length : 0;
  const avgListPrice = active.length > 0
    ? active.reduce((s, p) => s + p.listPrice, 0) / active.length : 0;
  const avgPricePerSqft = sold.length > 0
    ? sold.reduce((s, p) => s + p.pricePerSqft, 0) / sold.length : 0;
  const avgDOM = properties.length > 0
    ? properties.reduce((s, p) => s + p.daysOnMarket, 0) / properties.length : 0;

  const listSoldRatios = sold.map(p => p.soldPrice / p.originalListPrice);
  const listSoldRatio = listSoldRatios.length > 0
    ? listSoldRatios.reduce((s, r) => s + r, 0) / listSoldRatios.length : 0;

  // Months inventory = active listings / (sold per month)
  const soldPrices = sold.map(p => p.trueSoldPrice).sort((a, b) => a - b);
  const medianSoldPrice = soldPrices.length > 0
    ? soldPrices[Math.floor(soldPrices.length / 2)] : 0;

  const ppsqfts = sold.map(p => p.pricePerSqft).sort((a, b) => a - b);
  const medianPricePerSqft = ppsqfts.length > 0
    ? ppsqfts[Math.floor(ppsqfts.length / 2)] : 0;

  const totalVolume = sold.reduce((s, p) => s + p.trueSoldPrice, 0);

  // Rough months inventory: assume sold over ~24 months
  const soldPerMonth = sold.length / 24;
  const monthsInventory = soldPerMonth > 0 ? active.length / soldPerMonth : 0;

  return {
    avgSoldPrice: Math.round(avgSoldPrice),
    avgListPrice: Math.round(avgListPrice),
    avgPricePerSqft: Math.round(avgPricePerSqft * 100) / 100,
    avgDOM: Math.round(avgDOM * 10) / 10,
    listSoldRatio: Math.round(listSoldRatio * 10000) / 10000,
    monthsInventory: Math.round(monthsInventory * 10) / 10,
    totalProperties: properties.length,
    medianSoldPrice: Math.round(medianSoldPrice),
    medianPricePerSqft: Math.round(medianPricePerSqft * 100) / 100,
    totalVolume: Math.round(totalVolume),
  };
}

export function filterProperties(properties: Property[], filters: Record<string, unknown>): Property[] {
  return properties.filter(p => {
    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      if (!filters.status.includes(p.status)) return false;
    }
    if (filters.zipCodes && Array.isArray(filters.zipCodes) && filters.zipCodes.length > 0) {
      if (!filters.zipCodes.includes(p.zipCode)) return false;
    }
    if (filters.schoolDistricts && Array.isArray(filters.schoolDistricts) && filters.schoolDistricts.length > 0) {
      if (!filters.schoolDistricts.includes(p.schoolDistrict)) return false;
    }
    if (filters.neighborhoods && Array.isArray(filters.neighborhoods) && filters.neighborhoods.length > 0) {
      if (!filters.neighborhoods.includes(p.neighborhood)) return false;
    }
    if (filters.subdivisions && Array.isArray(filters.subdivisions) && filters.subdivisions.length > 0) {
      if (!filters.subdivisions.includes(p.subdivision)) return false;
    }
    if (filters.minSqft && p.sqft < (filters.minSqft as number)) return false;
    if (filters.maxSqft && p.sqft > (filters.maxSqft as number)) return false;
    if (filters.minPrice) {
      const price = p.trueSoldPrice || p.listPrice;
      if (price < (filters.minPrice as number)) return false;
    }
    if (filters.maxPrice) {
      const price = p.trueSoldPrice || p.listPrice;
      if (price > (filters.maxPrice as number)) return false;
    }
    if (filters.minBedrooms && p.bedrooms < (filters.minBedrooms as number)) return false;
    if (filters.maxBedrooms && p.bedrooms > (filters.maxBedrooms as number)) return false;
    if (filters.minBathrooms && p.bathrooms < (filters.minBathrooms as number)) return false;
    if (filters.minLotSize && p.lotSize < (filters.minLotSize as number)) return false;
    if (filters.maxLotSize && p.lotSize > (filters.maxLotSize as number)) return false;
    if (filters.stories && Array.isArray(filters.stories) && filters.stories.length > 0) {
      if (!filters.stories.includes(p.stories)) return false;
    }
    if (filters.newConstruction !== undefined && filters.newConstruction !== null) {
      if (p.newConstruction !== filters.newConstruction) return false;
    }
    if (filters.minYearBuilt && p.yearBuilt < (filters.minYearBuilt as number)) return false;
    if (filters.maxYearBuilt && p.yearBuilt > (filters.maxYearBuilt as number)) return false;
    if (filters.startDate && p.listDate < (filters.startDate as string)) return false;
    if (filters.endDate && p.listDate > (filters.endDate as string)) return false;
    if (filters.amenities && typeof filters.amenities === 'object') {
      const am = filters.amenities as Record<string, boolean>;
      for (const [key, val] of Object.entries(am)) {
        if (val && !p.amenities[key as keyof typeof p.amenities]) return false;
      }
    }
    if (filters.lat && filters.lng && filters.radiusMiles) {
      const dist = haversineDistance(p.lat, p.lng, filters.lat as number, filters.lng as number);
      if (dist > (filters.radiusMiles as number)) return false;
    }
    return true;
  });
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return deg * Math.PI / 180;
}
