export interface Point { x: number; y: number }
export interface RegressionResult { slope: number; intercept: number; r2: number }
export interface BandPoint { x: number; yHat: number; upper: number; lower: number }

export function linearRegression(points: Point[]): RegressionResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
  const xBar = points.reduce((s, p) => s + p.x, 0) / n;
  const yBar = points.reduce((s, p) => s + p.y, 0) / n;
  const Sxx = points.reduce((s, p) => s + (p.x - xBar) ** 2, 0);
  const Sxy = points.reduce((s, p) => s + (p.x - xBar) * (p.y - yBar), 0);
  const Syy = points.reduce((s, p) => s + (p.y - yBar) ** 2, 0);
  const slope = Sxx === 0 ? 0 : Sxy / Sxx;
  const intercept = yBar - slope * xBar;
  const SSR = slope * Sxy;
  const r2 = Syy === 0 ? 1 : Math.max(0, Math.min(1, SSR / Syy));
  return { slope, intercept, r2 };
}

export function computeConfidenceBands(
  points: Point[],
  numSteps = 60,
  alpha = 0.05
): BandPoint[] {
  const n = points.length;
  if (n < 3) return [];
  const { slope, intercept } = linearRegression(points);
  const xBar = points.reduce((s, p) => s + p.x, 0) / n;
  const Sxx = points.reduce((s, p) => s + (p.x - xBar) ** 2, 0);
  const residuals = points.map(p => p.y - (slope * p.x + intercept));
  const SSE = residuals.reduce((s, r) => s + r ** 2, 0);
  const MSE = n > 2 ? SSE / (n - 2) : SSE;
  const s = Math.sqrt(MSE);
  const df = n - 2;
  const tCrit = tInv(1 - alpha / 2, df);

  const xs = points.map(p => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);

  return Array.from({ length: numSteps }, (_, i) => {
    const x = xMin + (xMax - xMin) * i / (numSteps - 1);
    const yHat = slope * x + intercept;
    const se = s * Math.sqrt(1 / n + (x - xBar) ** 2 / (Sxx || 1));
    const margin = tCrit * se;
    return { x, yHat, upper: yHat + margin, lower: yHat - margin };
  });
}

function tInv(p: number, df: number): number {
  if (df >= 120) return normalInv(p);
  const z = normalInv(p);
  return z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df * df);
}

function normalInv(p: number): number {
  const a = [2.515517, 0.802853, 0.010328];
  const b = [1.432788, 0.189269, 0.001308];
  const t = p < 0.5 ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p));
  const num = a[0] + a[1] * t + a[2] * t * t;
  const den = 1 + b[0] * t + b[1] * t * t + b[2] * t * t * t;
  const result = t - num / den;
  return p < 0.5 ? -result : result;
}

export function getRegressionLine(
  points: Point[],
  numSteps = 60
): { x: number; y: number }[] {
  const { slope, intercept } = linearRegression(points);
  if (!points.length) return [];
  const xs = points.map(p => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  return Array.from({ length: numSteps }, (_, i) => {
    const x = xMin + (xMax - xMin) * i / (numSteps - 1);
    return { x, y: slope * x + intercept };
  });
}

export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function formatFullCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(n));
}

export function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function histogramBins<T>(
  data: T[],
  getValue: (d: T) => number,
  numBins: number
): { label: string; min: number; max: number; count: number; items: T[] }[] {
  if (!data.length) return [];
  const values = data.map(getValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return [{ label: String(min), min, max, count: data.length, items: data }];
  const binSize = range / numBins;
  const bins = Array.from({ length: numBins }, (_, i) => ({
    label: '',
    min: min + i * binSize,
    max: min + (i + 1) * binSize,
    count: 0,
    items: [] as T[],
  }));
  data.forEach(d => {
    const v = getValue(d);
    const idx = Math.min(numBins - 1, Math.floor((v - min) / binSize));
    bins[idx].count++;
    bins[idx].items.push(d);
  });
  return bins.map(b => ({
    ...b,
    label: `${formatCurrency(b.min)}-${formatCurrency(b.max)}`,
  }));
}

export function groupBy<T>(arr: T[], key: (d: T) => string): Record<string, T[]> {
  return arr.reduce((acc, d) => {
    const k = key(d);
    if (!acc[k]) acc[k] = [];
    acc[k].push(d);
    return acc;
  }, {} as Record<string, T[]>);
}

export function mean(arr: number[]): number {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}
