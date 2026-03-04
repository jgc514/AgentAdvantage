import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getSampleData } from '../data/sampleData';
import { filterProperties, computeStats, linearRegression, confidenceBands } from '../utils/stats';

const router = Router();

router.get('/', (req: AuthRequest, res: Response) => {
  const data = getSampleData();
  const filters = req.query as Record<string, unknown>;

  // Parse array params
  const parsed: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(filters)) {
    if (typeof val === 'string' && val.includes(',')) {
      parsed[key] = val.split(',');
    } else if (key === 'stories' && typeof val === 'string') {
      parsed[key] = val.split(',').map(Number);
    } else if (['minSqft','maxSqft','minPrice','maxPrice','minBedrooms','maxBedrooms',
                 'minBathrooms','minLotSize','maxLotSize','minYearBuilt','maxYearBuilt',
                 'lat','lng','radiusMiles'].includes(key)) {
      parsed[key] = parseFloat(val as string);
    } else if (key === 'newConstruction') {
      parsed[key] = val === 'true' ? true : val === 'false' ? false : undefined;
    } else {
      parsed[key] = val;
    }
  }

  const filtered = filterProperties(data, parsed);
  const stats = computeStats(filtered);

  res.json({ properties: filtered, stats, total: filtered.length });
});

router.get('/meta', (_req: AuthRequest, res: Response) => {
  const data = getSampleData();
  const zipCodes = [...new Set(data.map(p => p.zipCode))].sort();
  const schoolDistricts = [...new Set(data.map(p => p.schoolDistrict))].sort();
  const neighborhoods = [...new Set(data.map(p => p.neighborhood))].sort();
  const subdivisions = [...new Set(data.map(p => p.subdivision))].sort();
  const streets = [...new Set(data.map(p => p.street))].sort();
  const statuses = [...new Set(data.map(p => p.status))].sort();

  res.json({ zipCodes, schoolDistricts, neighborhoods, subdivisions, streets, statuses });
});

router.get('/regression', (req: AuthRequest, res: Response) => {
  const data = getSampleData();
  const filters = req.query as Record<string, unknown>;
  const parsed: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(filters)) {
    if (typeof val === 'string' && val.includes(',')) {
      parsed[key] = val.split(',');
    } else if (['minSqft','maxSqft','minPrice','maxPrice'].includes(key)) {
      parsed[key] = parseFloat(val as string);
    } else {
      parsed[key] = val;
    }
  }

  const filtered = filterProperties(data, parsed);
  const sold = filtered.filter(p => p.status === 'Sold' && p.trueSoldPrice > 0);
  const points = sold.map(p => ({ x: p.sqft, y: p.trueSoldPrice }));
  const reg = linearRegression(points);

  const xMin = Math.min(...points.map(p => p.x));
  const xMax = Math.max(...points.map(p => p.x));
  const xValues = Array.from({ length: 50 }, (_, i) => xMin + (xMax - xMin) * i / 49);
  const bands = confidenceBands(points, xValues);

  res.json({ regression: reg, confidenceBands: bands, pointCount: points.length });
});

router.get('/:id', (req: AuthRequest, res: Response) => {
  const data = getSampleData();
  const property = data.find(p => p.id === req.params.id);
  if (!property) {
    res.status(404).json({ error: 'Property not found' });
    return;
  }
  res.json(property);
});

// CSV import endpoint (stub - in production would parse and store CSV)
router.post('/import', (req: AuthRequest, res: Response) => {
  res.json({ message: 'CSV import endpoint ready. Connect your MLS export here.', received: req.body?.length || 0 });
});

export default router;
