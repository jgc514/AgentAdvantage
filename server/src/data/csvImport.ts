/**
 * CSV importer with flexible column mapping.
 *
 * Handles both RESO Web API standard field names and common MLS export variants.
 * Unknown columns are silently ignored — only the fields we know about are mapped.
 *
 * To add a new column alias, add it to the FIELD_MAP below.
 */

import { parse } from 'csv-parse/sync';
import { Property, PropertyStatus, Amenities } from '../types';

// ---------------------------------------------------------------------------
// Column alias map: canonical field name → list of accepted CSV header names
// (case-insensitive, spaces/underscores normalised)
// ---------------------------------------------------------------------------
const FIELD_MAP: Record<string, string[]> = {
  mlsNumber:           ['listingid', 'mlsnumber', 'mls_number', 'mls#', 'listingkey'],
  address:             ['unparsedaddress', 'fulladdress', 'address', 'propertyaddress'],
  street:              ['streetname', 'street', 'streetaddress', 'street_address'],
  city:                ['city', 'postalcity'],
  state:               ['stateorprovince', 'state', 'stateprovince'],
  zipCode:             ['postalcode', 'zipcode', 'zip', 'zip_code'],
  neighborhood:        ['neighborhood', 'area', 'mlsarea', 'markingarea'],
  subdivision:         ['subdivisionname', 'subdivision', 'sub', 'subname'],
  schoolDistrict:      ['schooldistrict', 'schooldist', 'district'],
  status:              ['standardstatus', 'status', 'mlsstatus', 'propertystatus', 'majorchangetype'],
  listPrice:           ['listprice', 'list_price', 'currentprice'],
  soldPrice:           ['closeprice', 'soldprice', 'sold_price', 'salesprice'],
  sellerConcessions:   ['concessions', 'sellerconcessions', 'closingcosts', 'buyerclosingcosts'],
  originalListPrice:   ['originallistprice', 'originalprice', 'orig_list_price'],
  priceChanges:        ['pricechangecount', 'pricechanges', 'numberofpricechanges'],
  sqft:                ['livingarea', 'squarefeet', 'sqft', 'sqfttotal', 'totallivingarea', 'abovegroundsqft'],
  lotSize:             ['lotsizeacres', 'lotsize', 'lot_size', 'lotsquarefeet'],
  bedrooms:            ['bedroomstotal', 'bedrooms', 'beds', 'numbedrooms'],
  bathrooms:           ['bathroomstotaldecimal', 'bathroomstotal', 'bathrooms', 'baths', 'numbathrooms'],
  stories:             ['storiestotal', 'stories', 'levels', 'numstories'],
  yearBuilt:           ['yearbuilt', 'year_built'],
  newConstruction:     ['newconstruction', 'new_construction', 'isnewconstruction'],
  garageSpaces:        ['garagespaces', 'garage_spaces', 'numgarage', 'garagecarspaces'],
  daysOnMarket:        ['daysonmarket', 'dom', 'days_on_market', 'cumulativedaysonmarket'],
  listDate:            ['listingcontractdate', 'listdate', 'list_date', 'onmarketdate'],
  soldDate:            ['closedate', 'solddate', 'sold_date', 'closingdate'],
  expirationDate:      ['expirationdate', 'expdate', 'expiration_date'],
  lat:                 ['latitude', 'lat'],
  lng:                 ['longitude', 'lng', 'lon', 'long'],
  description:         ['publicremarks', 'description', 'remarks'],
  images:              ['media', 'photos', 'images', 'photourl', 'mainphoto'],
  // Amenities as individual boolean columns
  pool:                ['pool', 'privatepool', 'haspool'],
  adu:                 ['adu', 'accessorydwellingunit', 'guesthouse', 'has_adu'],
  shop:                ['shop', 'workshop', 'hasshop'],
  pond:                ['pond', 'haspond'],
  fireplace:           ['fireplace', 'fireplaces', 'hasfireplace', 'fireplaceyn'],
  hotTub:              ['hottub', 'spa', 'spahottub', 'hashottub'],
  solarPanels:         ['solarpanels', 'solar', 'hassolar'],
  coveredPatio:        ['coveredpatio', 'patio', 'hascoveredpatio'],
  outdoorKitchen:      ['outdoorkitchen', 'hasoutdoorkitchen'],
  barnOrStable:        ['barn', 'stable', 'barnstable', 'hasbarn'],
  waterFeature:        ['waterfeature', 'haswaterfeature'],
  greenbeltView:       ['greenbeltview', 'greenbelt', 'view_greenbelt'],
  waterView:           ['waterview', 'lakeview', 'view_water'],
};

// Build reverse lookup: normalised header → canonical field
const REVERSE_MAP = new Map<string, string>();
for (const [field, aliases] of Object.entries(FIELD_MAP)) {
  for (const alias of aliases) {
    REVERSE_MAP.set(normaliseHeader(alias), field);
  }
}

function normaliseHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-#]+/g, '');
}

// ---------------------------------------------------------------------------
// Status normalisation (RESO StandardStatus → PropertyStatus)
// ---------------------------------------------------------------------------
const STATUS_MAP: Record<string, PropertyStatus> = {
  active:      'Active',
  closed:      'Sold',
  sold:        'Sold',
  pending:     'Pending',
  expired:     'Expired',
  canceled:    'Canceled',
  cancelled:   'Canceled',
  withdrawn:   'Withdrawn',
  comingsoon:  'Coming Soon',
  backup:      'Backup',
  new:         'New',
  pricechange: 'Price Change',
  activeundercontract: 'Pending',
};

function parseStatus(raw: string): PropertyStatus {
  const key = raw.toLowerCase().replace(/[\s_]+/g, '');
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
  // Accept YYYY-MM-DD, M/D/YYYY, MM/DD/YYYY
  const iso = v.trim().match(/^\d{4}-\d{2}-\d{2}$/);
  if (iso) return v.trim();
  const d = new Date(v.trim());
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
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

  // Build column → canonical field mapping from the actual headers in this file
  const headers = Object.keys(rows[0]);
  const colMap = new Map<string, string>(); // raw header → canonical field
  for (const h of headers) {
    const canonical = REVERSE_MAP.get(normaliseHeader(h));
    if (canonical) colMap.set(h, canonical);
  }

  const properties: Property[] = [];

  rows.forEach((row, idx) => {
    // Flatten row into canonical fields
    const f: Record<string, string> = {};
    for (const [rawCol, val] of Object.entries(row)) {
      const canonical = colMap.get(rawCol);
      if (canonical) f[canonical] = val;
    }

    // Require at minimum: some identifier + a price or sqft
    if (!f.mlsNumber && !f.address) {
      skipped++;
      return;
    }

    try {
      const listPrice = num(f.listPrice);
      const soldPrice = num(f.soldPrice);
      const sellerConcessions = num(f.sellerConcessions);
      const trueSoldPrice = soldPrice > 0 ? soldPrice - sellerConcessions : 0;
      const sqft = num(f.sqft);
      const pricePerSqft = trueSoldPrice > 0 && sqft > 0
        ? Math.round((trueSoldPrice / sqft) * 100) / 100
        : listPrice > 0 && sqft > 0
        ? Math.round((listPrice / sqft) * 100) / 100
        : 0;

      const amenities: Amenities = {
        pool:           bool(f.pool),
        adu:            bool(f.adu),
        shop:           bool(f.shop),
        pond:           bool(f.pond),
        fireplace:      bool(f.fireplace),
        hotTub:         bool(f.hotTub),
        solarPanels:    bool(f.solarPanels),
        coveredPatio:   bool(f.coveredPatio),
        outdoorKitchen: bool(f.outdoorKitchen),
        guestHouse:     false, // kept for type compat; map from 'adu' col if needed
        barnOrStable:   bool(f.barnOrStable),
        waterFeature:   bool(f.waterFeature),
        greenbeltView:  bool(f.greenbeltView),
        waterView:      bool(f.waterView),
      };

      const property: Property = {
        id:                String(idx + 1),
        mlsNumber:         str(f.mlsNumber) || `IMPORT-${idx + 1}`,
        address:           str(f.address),
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
        priceChanges:      num(f.priceChanges),
        sqft,
        lotSize:           num(f.lotSize),
        bedrooms:          num(f.bedrooms),
        bathrooms:         num(f.bathrooms),
        stories:           num(f.stories) || 1,
        yearBuilt:         num(f.yearBuilt),
        newConstruction:   bool(f.newConstruction),
        garageSpaces:      num(f.garageSpaces),
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
