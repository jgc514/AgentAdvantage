import { Property, PropertyStatus, Amenities } from '../types';

const streets = [
  'Oak Ridge Dr', 'Maple Creek Ln', 'Sunset Blvd', 'Cedar Park Way',
  'Bluebonnet Trail', 'Stone Gate Ct', 'Rolling Hills Dr', 'Pecan Grove Rd',
  'Lake View Dr', 'Canyon Creek Blvd', 'Heritage Oak Ln', 'Willow Bend Rd',
  'Summit View Dr', 'Copper Ridge Ct', 'Longhorn Trail', 'Texas Star Blvd',
  'Hill Country Dr', 'Vineyard Way', 'Meadowbrook Ln', 'Silver Creek Dr',
  'Tuscany Hills Ct', 'Riverbend Rd', 'Prairie View Ln', 'Chimney Rock Dr',
  'Windmill Way', 'Saddleback Ct', 'Lone Star Dr', 'Creekside Dr',
];

const subdivisions = [
  'Stone Gate', 'Cedar Creek Estates', 'Rolling Hills', 'Lakewood Estates',
  'Pecan Grove', 'Canyon Ridge', 'Summit View', 'Willow Bend',
  'Heritage Park', 'Oak Hollow', 'Tuscany Hills', 'Copper Ridge',
  'Hill Country Estates', 'Silver Creek', 'Meadowbrook',
];

const neighborhoods = [
  'North Austin', 'South Lake Travis', 'Bee Cave', 'Westlake',
  'Cedar Park', 'Lakeway', 'Dripping Springs', 'Buda', 'Kyle',
];

const schoolDistricts = [
  'Eanes ISD', 'Austin ISD', 'Lake Travis ISD',
  'Dripping Springs ISD', 'Round Rock ISD', 'Hays CISD',
];

const zipCodes = ['78735', '78738', '78746', '78750', '78759', '78613', '78669', '78620'];

const cityData: Record<string, { lat: number; lng: number; city: string }> = {
  '78735': { lat: 30.2721, lng: -97.8652, city: 'Austin' },
  '78738': { lat: 30.3321, lng: -97.9752, city: 'Bee Cave' },
  '78746': { lat: 30.2881, lng: -97.8152, city: 'Austin' },
  '78750': { lat: 30.4321, lng: -97.7652, city: 'Austin' },
  '78759': { lat: 30.3921, lng: -97.7352, city: 'Austin' },
  '78613': { lat: 30.5121, lng: -97.8152, city: 'Cedar Park' },
  '78669': { lat: 30.3521, lng: -98.0152, city: 'Lakeway' },
  '78620': { lat: 30.1921, lng: -98.0852, city: 'Dripping Springs' },
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

function generateAmenities(sqft: number, lotSize: number): Amenities {
  const hasPool = lotSize > 0.15 ? Math.random() < 0.45 : Math.random() < 0.15;
  const hasPond = lotSize > 0.5 ? Math.random() < 0.12 : false;
  const hasShop = lotSize > 0.4 ? Math.random() < 0.25 : false;
  const hasAdu = sqft > 2000 ? Math.random() < 0.15 : false;
  return {
    pool: hasPool,
    adu: hasAdu,
    shop: hasShop,
    pond: hasPond,
    fireplace: Math.random() < 0.55,
    hotTub: Math.random() < 0.2,
    solarPanels: Math.random() < 0.18,
    coveredPatio: Math.random() < 0.7,
    outdoorKitchen: Math.random() < 0.22,
    guestHouse: Math.random() < 0.08,
    barnOrStable: lotSize > 1 ? Math.random() < 0.15 : false,
    waterFeature: Math.random() < 0.12,
    greenbeltView: Math.random() < 0.2,
    waterView: Math.random() < 0.08,
  };
}

function generateProperty(id: number, status: PropertyStatus, dateRange: { start: Date; end: Date }): Property {
  const zip = pick(zipCodes);
  const cityInfo = cityData[zip];
  const sqft = Math.round(randomBetween(900, 4800) / 50) * 50;
  const stories = sqft < 1500 ? (Math.random() < 0.8 ? 1 : 2) : sqft < 2500 ? (Math.random() < 0.5 ? 1 : 2) : (Math.random() < 0.2 ? 1 : 2);
  const bedrooms = sqft < 1200 ? randomInt(2, 3) : sqft < 2000 ? randomInt(3, 4) : sqft < 3000 ? randomInt(3, 5) : randomInt(4, 6);
  const bathrooms = Math.max(1, bedrooms - 1 + (Math.random() < 0.4 ? 0.5 : 0));
  const lotSize = parseFloat((randomBetween(0.08, 2.5)).toFixed(2));
  const yearBuilt = randomInt(1975, 2024);
  const newConstruction = yearBuilt >= 2022 && Math.random() < 0.6;

  // Base price model: ~$220/sqft with variance by district and amenities
  const schoolDistrict = pick(schoolDistricts);
  const schoolMultiplier: Record<string, number> = {
    'Eanes ISD': 1.28,
    'Austin ISD': 1.0,
    'Lake Travis ISD': 1.18,
    'Dripping Springs ISD': 1.08,
    'Round Rock ISD': 1.05,
    'Hays CISD': 0.95,
  };
  const mult = schoolMultiplier[schoolDistrict] || 1.0;
  const basePrice = sqft * randomBetween(185, 285) * mult;
  const amenities = generateAmenities(sqft, lotSize);
  let amenityBonus = 0;
  if (amenities.pool) amenityBonus += randomBetween(15000, 45000);
  if (amenities.adu) amenityBonus += randomBetween(30000, 80000);
  if (amenities.shop) amenityBonus += randomBetween(20000, 50000);
  if (amenities.pond) amenityBonus += randomBetween(10000, 30000);
  if (amenities.outdoorKitchen) amenityBonus += randomBetween(5000, 20000);
  if (amenities.greenbeltView) amenityBonus += randomBetween(8000, 25000);
  if (amenities.waterView) amenityBonus += randomBetween(20000, 60000);
  if (newConstruction) amenityBonus += randomBetween(10000, 30000);

  const marketNoise = randomBetween(0.92, 1.08);
  const roundedPrice = Math.round((basePrice + amenityBonus) * marketNoise / 1000) * 1000;

  const originalListPrice = roundedPrice;
  const priceChanges = status === 'Expired' || status === 'Canceled' ? 0
    : status === 'Sold' ? randomInt(0, 2)
    : randomInt(0, 3);

  const listPriceAfterChanges = priceChanges === 0 ? originalListPrice
    : Math.round(originalListPrice * (1 - randomBetween(0.01, 0.06) * priceChanges) / 500) * 500;

  let soldPrice = 0;
  let sellerConcessions = 0;
  let trueSoldPrice = 0;
  let dom = 0;
  let soldDate: string | null = null;

  const listDate = randomDate(dateRange.start, dateRange.end);

  if (status === 'Sold') {
    const overUnder = Math.random() < 0.55 ? 1 : -1;
    const pct = randomBetween(0.97, 1.035);
    soldPrice = Math.round(listPriceAfterChanges * pct / 500) * 500;
    sellerConcessions = Math.random() < 0.45 ? Math.round(randomBetween(2000, 18000) / 500) * 500 : 0;
    trueSoldPrice = soldPrice - sellerConcessions;
    dom = randomInt(1, 120);
    const ld = new Date(listDate);
    ld.setDate(ld.getDate() + dom);
    soldDate = ld.toISOString().split('T')[0];
  } else if (status === 'Expired' || status === 'Canceled' || status === 'Withdrawn') {
    dom = randomInt(30, 180);
  } else {
    dom = randomInt(0, 90);
  }

  const pricePerSqft = trueSoldPrice > 0 ? Math.round((trueSoldPrice / sqft) * 100) / 100
    : Math.round((listPriceAfterChanges / sqft) * 100) / 100;

  const subdivision = pick(subdivisions);
  const street = pick(streets);
  const streetNum = randomInt(100, 9999);
  const neighborhood = pick(neighborhoods);

  const lat = cityInfo.lat + randomBetween(-0.05, 0.05);
  const lng = cityInfo.lng + randomBetween(-0.05, 0.05);

  const mlsNum = `MLS${String(900000 + id).padStart(7, '0')}`;

  const expirationDate = (status === 'Expired') ? (() => {
    const ld = new Date(listDate);
    ld.setDate(ld.getDate() + dom);
    return ld.toISOString().split('T')[0];
  })() : null;

  return {
    id: String(id),
    mlsNumber: mlsNum,
    address: `${streetNum} ${street}, ${cityInfo.city}, TX ${zip}`,
    street,
    city: cityInfo.city,
    state: 'TX',
    zipCode: zip,
    neighborhood,
    subdivision,
    schoolDistrict,
    status,
    listPrice: listPriceAfterChanges,
    soldPrice,
    sellerConcessions,
    trueSoldPrice,
    pricePerSqft,
    originalListPrice,
    priceChanges,
    sqft,
    lotSize,
    bedrooms,
    bathrooms,
    stories,
    yearBuilt,
    newConstruction,
    daysOnMarket: dom,
    listDate,
    soldDate,
    expirationDate,
    amenities,
    lat,
    lng,
    images: [
      `https://picsum.photos/seed/${mlsNum}a/800/600`,
      `https://picsum.photos/seed/${mlsNum}b/800/600`,
      `https://picsum.photos/seed/${mlsNum}c/800/600`,
    ],
    garageSpaces: randomInt(0, 4),
    description: `Beautiful ${stories === 1 ? 'single' : 'two'}-story home in ${subdivision}. ${bedrooms} bed, ${bathrooms} bath, ${sqft.toLocaleString()} sqft on ${lotSize} acres. Built ${yearBuilt}. ${amenities.pool ? 'Private pool. ' : ''}${amenities.adu ? 'ADU/Guest house. ' : ''}Located in ${schoolDistrict}.`,
  };
}

export function generateSampleData(): Property[] {
  const properties: Property[] = [];
  let id = 1;

  const endDate = new Date('2024-12-31');
  const startDate = new Date('2022-01-01');

  // Sold properties - majority of dataset (good for regression)
  for (let i = 0; i < 280; i++) {
    properties.push(generateProperty(id++, 'Sold', { start: startDate, end: endDate }));
  }

  // Active listings
  const activeStart = new Date('2024-06-01');
  for (let i = 0; i < 60; i++) {
    const status = pick(['Active', 'New', 'Price Change'] as PropertyStatus[]);
    properties.push(generateProperty(id++, status, { start: activeStart, end: endDate }));
  }

  // Expired / Canceled / Withdrawn
  for (let i = 0; i < 55; i++) {
    const status = pick(['Expired', 'Canceled', 'Withdrawn'] as PropertyStatus[]);
    properties.push(generateProperty(id++, status, { start: startDate, end: endDate }));
  }

  // Pending
  for (let i = 0; i < 20; i++) {
    properties.push(generateProperty(id++, 'Pending', { start: activeStart, end: endDate }));
  }

  // Coming Soon / Backup
  for (let i = 0; i < 10; i++) {
    const status = pick(['Coming Soon', 'Backup'] as PropertyStatus[]);
    properties.push(generateProperty(id++, status, { start: activeStart, end: endDate }));
  }

  return properties;
}

let _cachedData: Property[] | null = null;

export function getSampleData(): Property[] {
  if (!_cachedData) {
    // Use a seeded approach for consistency - reset Math.random seed via deterministic approach
    // We'll just generate once and cache
    const originalRandom = Math.random;
    let seed = 42;
    Math.random = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    _cachedData = generateSampleData();
    Math.random = originalRandom;
  }
  return _cachedData;
}
