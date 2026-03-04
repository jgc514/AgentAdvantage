/**
 * CSV importer — field map built from the actual MLS export column names.
 *
 * Handles quirks of this specific MLS format:
 *  - Address assembled from "Str #" + "Dir" + "Street Name" + City + State + Zip
 *  - Bathrooms computed from "FB" (full) + "HB" (half × 0.5)
 *  - Fireplace is a count ("# Fireplaces") — any value > 0 → true
 *  - Garage Parking is free text ("2 Car Attached") — first digit extracted
 *  - RESO standard names also accepted as fallbacks
 */

import { parse } from 'csv-parse/sync';
import { Property, PropertyStatus, Amenities } from '../types';

// ---------------------------------------------------------------------------
// Header normalisation
// Strip everything except lowercase letters, digits, $ and /
// Examples:
//   "MLS#"              → "mls"
//   "Str #"             → "str"
//   "# Fireplaces"      → "fireplaces"
//   "$/SqFt"            → "$/sqft"
//   "TotBth(F+H)"       → "totbthfh"
//   "Subdivision(Legal)"→ "subdivisionlegal"
//   "Pool/Spa"          → "pool/spa"
// ---------------------------------------------------------------------------
function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9$\/]/g, '');
}

// ---------------------------------------------------------------------------
// Field map — canonical app field → all accepted CSV header names
// (each alias is pre-normalised — run normaliseHeader() on them mentally)
// ---------------------------------------------------------------------------
const FIELD_MAP: Record<string, string[]> = {
  // ── Identifiers ──────────────────────────────────────────────────────────
  mlsNumber: [
    'mls',          // MLS#
    'mlsnumber', 'mls_number', 'listingid', 'listingkey',
  ],

  // ── Address parts ────────────────────────────────────────────────────────
  // Full address (RESO / other feeds)
  address: ['unparsedaddress', 'fulladdress', 'address', 'propertyaddress'],
  // Split address fields from this MLS
  streetNumber: ['str'],           // "Str #"
  streetDir:    ['dir'],           // "Dir"
  street:       ['streetname', 'street', 'streetaddress'],  // "Street Name"
  city:         ['city', 'postalcity'],
  state:        ['state', 'stateorprovince'],
  zipCode:      ['zip', 'zipcode', 'postalcode', 'zip_code'],   // "Zip"

  // ── Location / school ────────────────────────────────────────────────────
  neighborhood:   ['area', 'neighborhood', 'mlsarea'],   // "Area"
  subdivision:    [
    'subdivisionlegal',   // "Subdivision(Legal)"
    'subdivisioncommon',  // "Subdivision(Common)"
    'subdivisionname', 'subdivision', 'sub',
  ],
  schoolDistrict: ['schldist', 'schooldistrict', 'schooldist', 'district'],  // "Schl Dist"

  // ── Status & dates ───────────────────────────────────────────────────────
  status:         ['status', 'standardstatus', 'mlsstatus', 'propertystatus'],
  listDate:       ['lstdate', 'listdate', 'listingcontractdate', 'list_date', 'onmarketdate'],  // "Lst Date"
  soldDate:       ['closedate', 'solddate', 'sold_date', 'closingdate'],   // "Close Date"
  expirationDate: ['expdate', 'expirationdate', 'expiration_date'],        // "Exp Date"

  // ── Pricing ──────────────────────────────────────────────────────────────
  listPrice:         ['listprice', 'list_price', 'lastlist$', 'currentprice'],  // "List Price" / "Last List$"
  soldPrice:         ['soldprice', 'sold_price', 'closeprice', 'salesprice'],   // "Sold Price"
  sellerConcessions: ['sellconesamt', 'concessions', 'sellerconcessions'],      // "SellConces Amt"
  originalListPrice: ['origprice', 'originallistprice', 'originalprice'],       // "Orig Price"
  pricePerSqft:      ['$/sqft', 'sold/sqft', 'pricepersqft', 'pricepersqft'],  // "$/SqFt" / "Sold/SqFt"

  // ── Property details ─────────────────────────────────────────────────────
  sqft:          ['sqft', 'livingarea', 'squarefeet', 'sqfttotal'],   // "SqFt"
  lotSize:       ['lotsize', 'lot_size', 'lotsizeacres'],             // "Lot Size"
  bedrooms:      ['br', 'bedrooms', 'bedroomstotal', 'beds'],         // "BR"
  fullBaths:     ['fb', 'fullbaths', 'fullbathrooms'],                // "FB"
  halfBaths:     ['hb', 'halfbaths', 'halfbathrooms'],                // "HB"
  bathrooms:     ['totbthfh', 'bathroomstotal', 'bathrooms', 'baths'], // "TotBth(F+H)" / "TotBth(F.H)"
  stories:       ['stry', 'stories', 'storiestotal', 'levels'],       // "# stry"
  yearBuilt:     ['yrblt', 'yearbuilt', 'year_built'],                // "Yr Blt"
  newConstruction: ['newconstruction', 'new_construction', 'isnewconstruction'],
  daysOnMarket:  ['dom', 'cdom', 'daysonmarket', 'cumulativedaysonmarket'], // "DOM" / "CDOM"

  // Garage: free-text in this MLS ("2 Car Attached") — first digit extracted below
  garageParking: ['garageparking', 'garage', 'garagespaces', 'garagecarspaces'], // "Garage Parking"

  // ── Amenities ─────────────────────────────────────────────────────────────
  numFireplaces: ['fireplaces', 'fireplace', 'numberoffireplaces'], // "# Fireplaces" / "Fireplace"
  pool:          ['pool', 'privatepool', 'haspool'],
  poolSpa:       ['pool/spa', 'poolspa', 'spahottub'],   // "Pool/Spa"
  hotTub:        ['hottub', 'spa', 'hashottub'],
  adu:           ['adu', 'accessorydwellingunit'],
  shop:          ['shop', 'workshop'],
  pond:          ['pond'],
  solarPanels:   ['solarpanels', 'solar'],
  coveredPatio:  ['coveredpatio', 'patio'],
  outdoorKitchen:['outdoorkitchen'],
  barnOrStable:  ['barn', 'stable', 'barnstable'],
  waterFeature:  ['waterfeature'],
  greenbeltView: ['greenbeltview', 'greenbelt'],
  waterView:     ['waterview', 'lakeview'],

  // ── Content ───────────────────────────────────────────────────────────────
  description: ['remarks', 'publicremarks', 'description', 'agtrmrks'],  // "Remarks"
  images:      ['media', 'photos', 'images', 'photourl'],
};

// Build reverse lookup: normalised header → canonical field
const REVERSE_MAP = new Map<string, string>();
for (const [field, aliases] of Object.entries(FIELD_MAP)) {
  for (const alias of aliases) {
    REVERSE_MAP.set(alias, field);
  }
}

// ---------------------------------------------------------------------------
// Status normalisation
// ---------------------------------------------------------------------------
const STATUS_MAP: Record<string, PropertyStatus> = {
  active:              'Active',
  closed:              'Sold',
  sold:                'Sold',
  pending:             'Pending',
  expired:             'Expired',
  canceled:            'Canceled',
  cancelled:           'Canceled',
  withdrawn:           'Withdrawn',
  comingsoon:          'Coming Soon',
  backup:              'Backup',
  new:                 'New',
  pricechange:         'Price Change',
  activeundercontract: 'Pending',
  contingent:          'Pending',
};

function parseStatus(raw: string): PropertyStatus {
  const key = raw.toLowerCase().replace(/[^a-z]/g, '');
  return STATUS_MAP[key] ?? (raw as PropertyStatus);
}

// ---------------------------------------------------------------------------
// Value coercions
// ---------------------------------------------------------------------------
function num(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function bool(v: string | undefined): boolean {
  if (!v) return false;
  return ['true', '1', 'yes', 'y'].includes(v.toLowerCase().trim());
}

function str(v: string | undefined): string {
  return (v ?? '').trim();
}

function dateStr(v: string | undefined): string | null {
  if (!v || v.trim() === '') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
  const d = new Date(v.trim());
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

/** Extract the first integer from free-text like "2 Car Attached" */
function garageNum(v: string | undefined): number {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[$,]/g, ''));
  if (!isNaN(n)) return n;
  const match = v.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------
export interface CsvImportResult {
  properties: Property[];
  skipped: number;
  errors: string[];
}

export function parseCsv(csvText: string): CsvImportResult {
  const errors: string[] = [];
  let skipped = 0;

  const rows: Record<string, string>[] = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (rows.length === 0) {
    return { properties: [], skipped: 0, errors: ['CSV file is empty or has no data rows'] };
  }

  // Map raw CSV headers → canonical field names
  const headers = Object.keys(rows[0]);
  const colMap = new Map<string, string>(); // raw header → canonical field
  for (const h of headers) {
    const canonical = REVERSE_MAP.get(normaliseHeader(h));
    if (canonical) colMap.set(h, canonical);
  }

  const properties: Property[] = [];

  rows.forEach((row, idx) => {
    const f: Record<string, string> = {};
    for (const [rawCol, val] of Object.entries(row)) {
      const canonical = colMap.get(rawCol);
      if (canonical) f[canonical] = val;
    }

    if (!f.mlsNumber && !f.address && !f.street) {
      skipped++;
      return;
    }

    try {
      // ── Address assembly ────────────────────────────────────────────────
      const address = str(f.address) ||
        [f.streetNumber, f.streetDir, f.street, f.city, f.state ? f.state + ' ' + str(f.zipCode) : str(f.zipCode)]
          .filter(Boolean).join(' ').trim();

      // ── Bathrooms: FB + HB×0.5, fallback to total bath column ───────────
      const fullBaths = num(f.fullBaths);
      const halfBaths = num(f.halfBaths);
      const bathrooms = fullBaths > 0
        ? fullBaths + halfBaths * 0.5
        : num(f.bathrooms);

      // ── Fireplace: count column → bool ──────────────────────────────────
      const fireplace = num(f.numFireplaces) > 0 || bool(f.numFireplaces);

      // ── Pricing ─────────────────────────────────────────────────────────
      const listPrice = num(f.listPrice);
      const soldPrice = num(f.soldPrice);
      const sellerConcessions = num(f.sellerConcessions);
      const trueSoldPrice = soldPrice > 0 ? soldPrice - sellerConcessions : 0;
      const sqft = num(f.sqft);
      const pricePerSqft = num(f.pricePerSqft) ||
        (trueSoldPrice > 0 && sqft > 0 ? Math.round((trueSoldPrice / sqft) * 100) / 100
          : listPrice > 0 && sqft > 0 ? Math.round((listPrice / sqft) * 100) / 100
          : 0);

      const amenities: Amenities = {
        pool:           bool(f.pool) || bool(f.poolSpa),
        adu:            bool(f.adu),
        shop:           bool(f.shop),
        pond:           bool(f.pond),
        fireplace,
        hotTub:         bool(f.hotTub) || bool(f.poolSpa),
        solarPanels:    bool(f.solarPanels),
        coveredPatio:   bool(f.coveredPatio),
        outdoorKitchen: bool(f.outdoorKitchen),
        guestHouse:     false,
        barnOrStable:   bool(f.barnOrStable),
        waterFeature:   bool(f.waterFeature),
        greenbeltView:  bool(f.greenbeltView),
        waterView:      bool(f.waterView),
      };

      const property: Property = {
        id:                String(idx + 1),
        mlsNumber:         str(f.mlsNumber) || `IMPORT-${idx + 1}`,
        address,
        street:            str(f.street),
        city:              str(f.city),
        state:             str(f.state) || 'TX',
        zipCode:           str(f.zipCode),
        neighborhood:      str(f.neighborhood),
        subdivision:       str(f.subdivision),
        schoolDistrict:    str(f.schoolDistrict),
        status:            parseStatus(str(f.status) || 'Active'),
        listPrice,
        soldPrice,
        sellerConcessions,
        trueSoldPrice,
        pricePerSqft,
        originalListPrice: num(f.originalListPrice) || listPrice,
        priceChanges:      0,
        sqft,
        lotSize:           num(f.lotSize),
        bedrooms:          num(f.bedrooms),
        bathrooms,
        stories:           num(f.stories) || 1,
        yearBuilt:         num(f.yearBuilt),
        newConstruction:   bool(f.newConstruction),
        garageSpaces:      garageNum(f.garageParking),
        daysOnMarket:      num(f.daysOnMarket),
        listDate:          dateStr(f.listDate) ?? '',
        soldDate:          dateStr(f.soldDate),
        expirationDate:    dateStr(f.expirationDate),
        lat:               num(f.lat),
        lng:               num(f.lng),
        images:            f.images ? f.images.split(/[|;,]/).map(s => s.trim()).filter(Boolean) : [],
        description:       str(f.description),
        amenities,
      };

      properties.push(property);
    } catch (e) {
      errors.push(`Row ${idx + 2}: ${e instanceof Error ? e.message : String(e)}`);
      skipped++;
    }
  });

  return { properties, skipped, errors };
}
