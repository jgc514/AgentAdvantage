import { Router, Response, Request } from 'express';
import multer from 'multer';
import { AuthRequest } from '../middleware/auth';
import { getProperties, importProperties, getDataSourceInfo } from '../data/store';
import { parseCsv } from '../data/csvImport';
import { filterProperties, computeStats, linearRegression, confidenceBands } from '../utils/stats';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseFilters(query: Record<string, unknown>): Record<string, unknown> {
  const parsed: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(query)) {
    if (typeof val === 'string' && val.includes(',')) {
      parsed[key] = val.split(',');
    } else if (key === 'stories' && typeof val === 'string') {
      parsed[key] = val.split(',').map(Number);
    } else if ([
      'minSqft','maxSqft','minPrice','maxPrice','minBedrooms','maxBedrooms',
      'minBathrooms','minLotSize','maxLotSize','minYearBuilt','maxYearBuilt',
      'lat','lng','radiusMiles',
    ].includes(key)) {
      parsed[key] = parseFloat(val as string);
    } else if (key === 'newConstruction') {
      parsed[key] = val === 'true' ? true : val === 'false' ? false : undefined;
    } else {
      parsed[key] = val;
    }
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// GET /api/properties
// ---------------------------------------------------------------------------
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = await getProperties();
    const filtered = filterProperties(data, parseFilters(req.query as Record<string, unknown>));
    const stats = computeStats(filtered);
    res.json({ properties: filtered, stats, total: filtered.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/properties/meta
// ---------------------------------------------------------------------------
router.get('/meta', async (_req: AuthRequest, res: Response) => {
  try {
    const data = await getProperties();
    res.json({
      zipCodes:        [...new Set(data.map(p => p.zipCode))].sort(),
      schoolDistricts: [...new Set(data.map(p => p.schoolDistrict))].sort(),
      neighborhoods:   [...new Set(data.map(p => p.neighborhood))].sort(),
      subdivisions:    [...new Set(data.map(p => p.subdivision))].sort(),
      streets:         [...new Set(data.map(p => p.street))].sort(),
      statuses:        [...new Set(data.map(p => p.status))].sort(),
      dataSource:      getDataSourceInfo(),
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch metadata' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/properties/regression
// ---------------------------------------------------------------------------
router.get('/regression', async (req: AuthRequest, res: Response) => {
  try {
    const data = await getProperties();
    const parsed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(req.query as Record<string, unknown>)) {
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
  } catch (e) {
    res.status(500).json({ error: 'Failed to compute regression' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/properties/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const data = await getProperties();
    const property = data.find(p => p.id === req.params.id);
    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    res.json(property);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/properties/import
//
// Accepts either:
//   - multipart/form-data with a file field named "file"
//   - text/csv raw body
// ---------------------------------------------------------------------------
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let csvText: string;

    if (req.file) {
      // multipart upload
      csvText = req.file.buffer.toString('utf-8');
    } else if (typeof req.body === 'string' && req.body.length > 0) {
      // raw text/csv body
      csvText = req.body;
    } else {
      res.status(400).json({
        error: 'No CSV data received. Send a multipart file field named "file" or a raw text/csv body.',
      });
      return;
    }

    const { properties, skipped, errors } = parseCsv(csvText);

    if (properties.length === 0) {
      res.status(422).json({ error: 'No valid properties found in CSV', errors });
      return;
    }

    const { count, source } = await importProperties(properties);

    res.json({
      success: true,
      imported: count,
      skipped,
      source,
      errors: errors.length ? errors : undefined,
    });
  } catch (e) {
    res.status(500).json({ error: `Import failed: ${e instanceof Error ? e.message : String(e)}` });
  }
});

export default router;
