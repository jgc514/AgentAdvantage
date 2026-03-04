import { useState, useCallback, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Label,
} from 'recharts';
import { Property } from '../../types';
import { Point, linearRegression, computeConfidenceBands, getRegressionLine, formatFullCurrency } from '../../utils/statistics';
import PropertyCard from '../Common/PropertyCard';
import MLSModal from '../Common/MLSModal';

interface ScatterPlotChartProps {
  properties: Property[];
  getX: (p: Property) => number;
  getY: (p: Property) => number;
  getColor: (p: Property) => string;
  xLabel: string;
  yLabel: string;
  formatX?: (v: number) => string;
  formatY?: (v: number) => string;
  showRegression?: boolean;
  showConfidenceBands?: boolean;
  // Subject property overlay
  subjectSqft?: number;
  subjectPriceMin?: number;
  subjectPriceMax?: number;
  title?: string;
  height?: number;
  legendItems?: { color: string; label: string }[];
}

const CustomDot = (props: {
  cx?: number; cy?: number; payload?: Property & { __color: string };
  onHover: (p: Property | null, x: number, y: number) => void;
  onSelect: (p: Property) => void;
}) => {
  const { cx = 0, cy = 0, payload, onHover, onSelect } = props;
  if (!payload) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={payload.__color}
      fillOpacity={0.75}
      stroke={payload.__color}
      strokeWidth={1}
      strokeOpacity={0.9}
      className="cursor-pointer transition-all"
      onMouseEnter={() => onHover(payload, cx, cy)}
      onMouseLeave={() => onHover(null, 0, 0)}
      onClick={() => onSelect(payload)}
    />
  );
};

export default function ScatterPlotChart({
  properties,
  getX,
  getY,
  getColor,
  xLabel,
  yLabel,
  formatX = v => v.toLocaleString(),
  formatY = v => formatFullCurrency(v),
  showRegression = true,
  showConfidenceBands = true,
  subjectSqft,
  subjectPriceMin,
  subjectPriceMax,
  title,
  height = 480,
  legendItems,
}: ScatterPlotChartProps) {
  const [hovered, setHovered] = useState<Property | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<Property | null>(null);

  const handleHover = useCallback((p: Property | null, x: number, y: number) => {
    setHovered(p);
    setTooltipPos({ x, y });
  }, []);

  // Build data for recharts (add color)
  const scatterData = useMemo(
    () => properties.map(p => ({ ...p, __x: getX(p), __y: getY(p), __color: getColor(p) })),
    [properties, getX, getY, getColor]
  );

  // Regression points (sold only typically)
  const regressionPoints: Point[] = useMemo(
    () => properties.map(p => ({ x: getX(p), y: getY(p) })).filter(p => p.x > 0 && p.y > 0),
    [properties, getX, getY]
  );

  const regression = useMemo(() => linearRegression(regressionPoints), [regressionPoints]);
  const regLine = useMemo(() => getRegressionLine(regressionPoints, 80), [regressionPoints]);
  const bands = useMemo(() => showConfidenceBands ? computeConfidenceBands(regressionPoints, 80) : [], [regressionPoints, showConfidenceBands]);

  const allX = scatterData.map(d => d.__x).filter(Boolean);
  const allY = scatterData.map(d => d.__y).filter(Boolean);
  const xMin = allX.length ? Math.min(...allX) * 0.95 : 0;
  const xMax = allX.length ? Math.max(...allX) * 1.05 : 5000;
  const yMin = allY.length ? Math.min(...allY) * 0.9 : 0;
  const yMax = allY.length ? Math.max(...allY) * 1.1 : 1000000;

  return (
    <div className="relative">
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-base">{title}</h2>
          {showRegression && regressionPoints.length > 2 && (
            <div className="text-xs text-slate-400">
              R² = <span className="text-emerald-400 font-mono">{regression.r2.toFixed(3)}</span>
              &nbsp;·&nbsp; Slope = <span className="text-sky-400 font-mono">${regression.slope.toFixed(0)}/sqft</span>
              &nbsp;·&nbsp; n = <span className="text-slate-300 font-mono">{regressionPoints.length}</span>
            </div>
          )}
        </div>
      )}

      <div style={{ height }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 30, bottom: 40, left: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="__x"
              type="number"
              domain={[xMin, xMax]}
              tickFormatter={formatX}
              stroke="#475569"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              name={xLabel}
            >
              <Label value={xLabel} offset={-10} position="insideBottom" fill="#64748b" fontSize={12} />
            </XAxis>
            <YAxis
              dataKey="__y"
              type="number"
              domain={[yMin, yMax]}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}K`}
              stroke="#475569"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              width={70}
              name={yLabel}
            >
              <Label value={yLabel} angle={-90} position="insideLeft" offset={10} fill="#64748b" fontSize={12} />
            </YAxis>

            {/* Confidence band (filled area as two reference areas) */}
            {showConfidenceBands && bands.length > 0 && (
              <>
                {bands.slice(0, -1).map((b, i) => {
                  const next = bands[i + 1];
                  return (
                    <ReferenceArea
                      key={`band-${i}`}
                      x1={b.x} x2={next.x}
                      y1={b.lower} y2={b.upper}
                      fill="#3b82f6"
                      fillOpacity={0.08}
                      strokeOpacity={0}
                    />
                  );
                })}
              </>
            )}

            {/* Subject property vertical line */}
            {subjectSqft && (
              <ReferenceLine
                x={subjectSqft}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="6 3"
                label={{ value: `Subject: ${subjectSqft.toLocaleString()} sqft`, fill: '#f59e0b', fontSize: 11, position: 'top' }}
              />
            )}

            {/* Subject price range horizontal band */}
            {subjectPriceMin && subjectPriceMax && (
              <ReferenceArea
                y1={subjectPriceMin}
                y2={subjectPriceMax}
                fill="#f59e0b"
                fillOpacity={0.08}
                stroke="#f59e0b"
                strokeOpacity={0.3}
                strokeDasharray="4 2"
                label={{ value: `Price range: ${formatFullCurrency(subjectPriceMin)}–${formatFullCurrency(subjectPriceMax)}`, fill: '#f59e0b', fontSize: 10 }}
              />
            )}

            <Tooltip content={() => null} />

            {/* Main scatter */}
            <Scatter
              data={scatterData}
              shape={(props: unknown) => (
                <CustomDot
                  {...(props as { cx?: number; cy?: number; payload?: Property & { __color: string } })}
                  onHover={handleHover}
                  onSelect={setSelected}
                />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>

        {/* Regression line rendered as SVG overlay - we do it via recharts CustomizedDot workaround */}
        {/* The regression line data is rendered inside a dedicated SVG layer below */}
      </div>

      {/* Regression line as absolute overlay (canvas hack) */}
      {showRegression && regLine.length > 1 && (
        <RegressionLineOverlay
          line={regLine}
          bands={bands}
          xMin={xMin} xMax={xMax} yMin={yMin} yMax={yMax}
          height={height}
        />
      )}

      {/* Legend */}
      {legendItems && (
        <div className="flex gap-4 mt-3 flex-wrap">
          {legendItems.map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hover tooltip */}
      {hovered && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 10 }}
        >
          <PropertyCard property={hovered} />
        </div>
      )}

      {/* MLS Modal on click */}
      {selected && (
        <MLSModal property={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// Renders a pure SVG regression line + CI band lines on top of the chart
// Uses a simple linear mapping from data space to pixel space
function RegressionLineOverlay({
  line, bands, xMin, xMax, yMin, yMax, height,
}: {
  line: { x: number; y: number }[];
  bands: { x: number; yHat: number; upper: number; lower: number }[];
  xMin: number; xMax: number; yMin: number; yMax: number; height: number;
}) {
  const marginLeft = 60 + 10; // approx recharts margin
  const marginRight = 30;
  const marginTop = 10;
  const marginBottom = 40;

  const toPixel = useCallback((x: number, y: number, width: number) => {
    const chartW = width - marginLeft - marginRight;
    const chartH = height - marginTop - marginBottom;
    const px = marginLeft + ((x - xMin) / (xMax - xMin)) * chartW;
    const py = marginTop + (1 - (y - yMin) / (yMax - yMin)) * chartH;
    return { px, py };
  }, [xMin, xMax, yMin, yMax, height]);

  const [containerWidth, setContainerWidth] = useState(800);
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (node) setContainerWidth(node.getBoundingClientRect().width);
  }, []);

  const linePath = useMemo(() => {
    if (!line.length) return '';
    return line.map((pt, i) => {
      const { px, py } = toPixel(pt.x, pt.y, containerWidth);
      return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
    }).join(' ');
  }, [line, toPixel, containerWidth]);

  const upperPath = useMemo(() => {
    if (!bands.length) return '';
    return bands.map((b, i) => {
      const { px, py } = toPixel(b.x, b.upper, containerWidth);
      return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
    }).join(' ');
  }, [bands, toPixel, containerWidth]);

  const lowerPath = useMemo(() => {
    if (!bands.length) return '';
    return bands.map((b, i) => {
      const { px, py } = toPixel(b.x, b.lower, containerWidth);
      return `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
    }).join(' ');
  }, [bands, toPixel, containerWidth]);

  return (
    <div ref={ref} className="absolute inset-0 pointer-events-none" style={{ top: 0 }}>
      <svg width="100%" height={height} className="absolute inset-0">
        {upperPath && (
          <path d={upperPath} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.5} />
        )}
        {lowerPath && (
          <path d={lowerPath} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.5} />
        )}
        {linePath && (
          <path d={linePath} fill="none" stroke="#22d3ee" strokeWidth={2.5} strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}
