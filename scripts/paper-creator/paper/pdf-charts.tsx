import React from "react";
import { Svg, Rect, Circle, Line, Text as SvgText, G, Path } from "@react-pdf/renderer";
import { colors } from "./pdf-styles";

// ── Horizontal Bar Chart ─────────────────────────────────────────────────────

interface BarData {
  label: string;
  value: number;
  color?: string;
  count?: number;
  rawValue?: number;
}

function trimTrailingZeros(value: string): string {
  return value.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function formatAxisValue(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000) return formatCompact(n);
  if (abs >= 100) return String(Math.round(n));
  if (abs >= 1) return trimTrailingZeros(n.toFixed(1));
  if (abs === 0) return "0";
  return trimTrailingZeros(n.toFixed(2));
}

function wrapText(value: string, maxChars: number): string[] {
  const text = String(value ?? "").trim();
  if (!text) return [""];
  if (text.length <= maxChars) return [text];

  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines;
}

export function HorizontalBarChart({
  data,
  width = 480,
  barHeight = 20,
  gap = 6,
  labelWidth = 100,
  showValues = true,
  maxValue: forceMax,
  labelFontSize = 8,
  labelMaxChars = 24,
  valueFormatter,
  showCounts = false,
  lowCountThreshold = 50,
}: {
  data: BarData[];
  width?: number;
  barHeight?: number;
  gap?: number;
  labelWidth?: number;
  showValues?: boolean;
  maxValue?: number;
  labelFontSize?: number;
  labelMaxChars?: number;
  valueFormatter?: (value: number, datum: BarData) => string;
  showCounts?: boolean;
  lowCountThreshold?: number;
}) {
  const safeData = data.map(d => ({
    ...d,
    value: isNaN(d.value) || d.value == null ? 0 : d.value,
    count: d.count == null || isNaN(Number(d.count)) ? undefined : Number(d.count),
    rawValue: d.rawValue ?? d.value,
  }));
  const maxVal = forceMax ?? Math.max(...safeData.map((d) => d.value), 1);
  const valueGutterWidth = showValues ? (showCounts ? 98 : 52) : 0;
  const chartWidth = Math.max(width - labelWidth - valueGutterWidth, 40);
  const lineHeight = labelFontSize + 2;

  let totalHeight = 0;
  const rows = safeData.map((d) => {
    const lines = wrapText(d.label, labelMaxChars);
    const rowHeight = Math.max(barHeight, lines.length * lineHeight);
    const y = totalHeight;
    totalHeight += rowHeight + gap;
    return { ...d, lines, rowHeight, y };
  });
  const height = Math.max(totalHeight - gap, 0);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {rows.map((d, i) => {
        const y = d.y;
        const rawBarW = maxVal > 0 ? (d.value / maxVal) * chartWidth : 0;
        const barW = d.value > 0 ? Math.max(rawBarW, 2) : 0;
        const color = d.color ?? colors.chartSecondary;
        const barY = y + (d.rowHeight - barHeight) / 2;
        const labelY = y + (d.rowHeight - d.lines.length * lineHeight) / 2 + labelFontSize;
        const valueText = valueFormatter ? valueFormatter(d.value, d) : formatCompact(d.value);
        const valueX = showCounts ? width - 44 : width - 2;
        const countText = d.count != null ? `(n=${formatCompact(d.count)})` : null;
        const countColor = (d.count ?? 0) < lowCountThreshold ? colors.chartYellow : colors.textMuted;

        return (
          <G key={i}>
            {d.lines.map((line, lineIndex) => (
              <SvgText
                key={`${i}-line-${lineIndex}`}
                x={0}
                y={labelY + lineIndex * lineHeight}
                style={{ fontSize: labelFontSize, fontFamily: "Helvetica" }}
                fill={colors.textSecondary}
              >
                {line}
              </SvgText>
            ))}
            {barW > 0 && <Rect x={labelWidth} y={barY + 2} width={barW} height={barHeight - 4} rx={3} fill={color} />}
            {showValues && (
              <>
                <SvgText
                  x={valueX}
                  y={barY + barHeight / 2 + 3}
                  textAnchor="end"
                  style={{ fontSize: 8, fontFamily: "Helvetica", fontWeight: "bold" }}
                  fill={colors.textPrimary}
                >
                  {valueText}
                </SvgText>
                {showCounts && countText && (
                  <SvgText
                    x={width - 2}
                    y={barY + barHeight / 2 + 3}
                    textAnchor="end"
                    style={{ fontSize: 6.5, fontFamily: "Helvetica" }}
                    fill={countColor}
                  >
                    {countText}
                  </SvgText>
                )}
              </>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

// ── Stacked Bar Chart ────────────────────────────────────────────────────────

interface StackedSegment {
  value: number;
  color: string;
  label: string;
}

export function StackedBar({
  segments,
  width = 480,
  height = 32,
  showLabels = true,
}: {
  segments: StackedSegment[];
  width?: number;
  height?: number;
  showLabels?: boolean;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  let x = 0;

  return (
    <Svg width={width} height={height + (showLabels ? 16 : 0)} viewBox={`0 0 ${width} ${height + (showLabels ? 16 : 0)}`}>
      {segments.map((seg, i) => {
        const segW = (seg.value / total) * width;
        const curX = x;
        x += segW;
        const pct = ((seg.value / total) * 100).toFixed(1);

        return (
          <G key={i}>
            <Rect x={curX} y={0} width={Math.max(segW, 1)} height={height} fill={seg.color} rx={i === 0 ? 4 : 0} />
            {showLabels && segW > 40 && (
              <SvgText
                x={curX + segW / 2}
                y={height + 12}
                textAnchor="middle"
                style={{ fontSize: 7, fontFamily: "Helvetica" }}
                fill={colors.textMuted}
              >
                {seg.label} {pct}%
              </SvgText>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

// ── Donut Chart ──────────────────────────────────────────────────────────────

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

export function DonutChart({
  segments,
  size = 140,
  strokeWidth = 18,
}: {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
}) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const safeSegs = segments.filter(s => s.value > 0 && !isNaN(s.value));
  const total = safeSegs.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  let cumulative = 0;

  const rotateAroundCenter = (angle: number) =>
    `translate(${center}, ${center}) rotate(${angle}) translate(${-center}, ${-center})`;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={center} cy={center} r={radius} stroke={colors.borderLight} strokeWidth={strokeWidth} fill="none" />
      {safeSegs.map((seg, i) => {
        const pct = (seg.value / total) * 100;
        if (pct < 0.5) return null;

        const segLen = (pct / 100) * circumference;
        const startAngle = (cumulative / 100) * 360;
        const rotation = -90 + startAngle;
        cumulative += pct;

        const gap = Math.max(circumference - segLen, 0.1);

        return (
          <Circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            stroke={seg.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${segLen} ${gap}`}
            transform={rotateAroundCenter(rotation)}
          />
        );
      })}
    </Svg>
  );
}

// ── Simple Area Chart ────────────────────────────────────────────────────────

interface AreaPoint {
  label: string;
  value: number;
}

export function AreaChart({
  data,
  width = 480,
  height = 140,
  fillColor = colors.chartSecondary,
  strokeColor = colors.chartPrimary,
  yLabel,
  yTickFormatter,
}: {
  data: AreaPoint[];
  width?: number;
  height?: number;
  fillColor?: string;
  strokeColor?: string;
  yLabel?: string;
  yTickFormatter?: (value: number) => string;
}) {
  if (data.length < 2) return null;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const padding = { top: 10, bottom: 20, left: 40, right: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const rawY = padding.top + chartH - ((d.value ?? 0) / maxVal) * chartH;
    const y = isNaN(rawY) ? padding.top + chartH : rawY;
    return { x, y };
  });

  // Line path
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Fill path (close to bottom)
  const fillPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
        const y = padding.top + chartH * (1 - frac);
        return (
          <Line key={i} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={colors.borderLight} strokeWidth={0.5} />
        );
      })}
      {[0, 0.5, 1].map((frac, i) => {
        const y = padding.top + chartH * (1 - frac);
        const tickValue = maxVal * frac;
        return (
          <SvgText
            key={`yt-${i}`}
            x={padding.left - 4}
            y={y + 3}
            textAnchor="end"
            style={{ fontSize: 6.5, fontFamily: "Helvetica" }}
            fill={colors.textMuted}
          >
            {yTickFormatter ? yTickFormatter(tickValue) : formatAxisValue(tickValue)}
          </SvgText>
        );
      })}
      {yLabel && (
        <SvgText
          x={10}
          y={padding.top + chartH / 2}
          textAnchor="middle"
          style={{ fontSize: 7, fontFamily: "Helvetica" }}
          fill={colors.textMuted}
          transform={`rotate(-90, 10, ${padding.top + chartH / 2})`}
        >
          {yLabel}
        </SvgText>
      )}
      {/* Fill */}
      <Path d={fillPath} fill={fillColor} opacity={0.15} />
      {/* Line */}
      <Path d={linePath} stroke={strokeColor} strokeWidth={2} fill="none" />
      {/* Dots */}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill={strokeColor} />
      ))}
      {/* X labels */}
      {data.map((d, i) => (
        <SvgText
          key={i}
          x={points[i].x}
          y={height - 2}
          textAnchor="middle"
          style={{ fontSize: 7, fontFamily: "Helvetica" }}
          fill={colors.textMuted}
        >
          {d.label}
        </SvgText>
      ))}
    </Svg>
  );
}

// ── Grouped Bar Chart ────────────────────────────────────────────────────────

interface GroupedBarGroup {
  label: string;
  values: { value: number; color: string; label: string }[];
}

export function GroupedBarChart({
  groups,
  width = 480,
  height = 160,
  yLabel,
  xLabel,
  yTickFormatter,
}: {
  groups: GroupedBarGroup[];
  width?: number;
  height?: number;
  yLabel?: string;
  xLabel?: string;
  yTickFormatter?: (value: number) => string;
}) {
  const padding = { top: 10, bottom: xLabel ? 34 : 24, left: 40, right: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const allValues = groups.flatMap((g) => g.values.map((v) => v.value));
  const maxVal = Math.max(...allValues, 1);

  const groupW = chartW / groups.length;
  const barW = Math.min(groupW / (groups[0]?.values.length ?? 1) - 4, 20);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Grid */}
      {[0, 0.5, 1].map((frac, i) => {
        const y = padding.top + chartH * (1 - frac);
        return <Line key={i} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={colors.borderLight} strokeWidth={0.5} />;
      })}
      {[0, 0.5, 1].map((frac, i) => {
        const y = padding.top + chartH * (1 - frac);
        const tickValue = maxVal * frac;
        return (
          <SvgText
            key={`gb-y-${i}`}
            x={padding.left - 4}
            y={y + 3}
            textAnchor="end"
            style={{ fontSize: 6.5, fontFamily: "Helvetica" }}
            fill={colors.textMuted}
          >
            {yTickFormatter ? yTickFormatter(tickValue) : formatAxisValue(tickValue)}
          </SvgText>
        );
      })}
      {yLabel && (
        <SvgText
          x={10}
          y={padding.top + chartH / 2}
          textAnchor="middle"
          style={{ fontSize: 7, fontFamily: "Helvetica" }}
          fill={colors.textMuted}
          transform={`rotate(-90, 10, ${padding.top + chartH / 2})`}
        >
          {yLabel}
        </SvgText>
      )}
      {groups.map((group, gi) => {
        const groupX = padding.left + gi * groupW;
        return (
          <G key={gi}>
            {group.values.map((v, vi) => {
              const barH = (v.value / maxVal) * chartH;
              const x = groupX + (groupW - group.values.length * barW) / 2 + vi * barW;
              const y = padding.top + chartH - barH;
              return <Rect key={vi} x={x} y={y} width={barW - 2} height={barH} fill={v.color} rx={2} />;
            })}
            <SvgText
              x={groupX + groupW / 2}
              y={height - 4}
              textAnchor="middle"
              style={{ fontSize: 7, fontFamily: "Helvetica" }}
              fill={colors.textMuted}
            >
              {group.label}
            </SvgText>
          </G>
        );
      })}
      {xLabel && (
        <SvgText
          x={padding.left + chartW / 2}
          y={height - 2}
          textAnchor="middle"
          style={{ fontSize: 7, fontFamily: "Helvetica" }}
          fill={colors.textMuted}
        >
          {xLabel}
        </SvgText>
      )}
    </Svg>
  );
}

// ── Heatmap Chart ────────────────────────────────────────────────────────────

interface HeatmapCell {
  row: string;
  col: string;
  value: number;
}

export function HeatmapChart({
  rows,
  cols,
  cells,
  width = 480,
  cellSize = 28,
  labelWidth = 100,
  topLabelHeight = 40,
  minColor = "#F1F5F9",
  maxColor = "#5F4364",
}: {
  rows: string[];
  cols: string[];
  cells: HeatmapCell[];
  width?: number;
  cellSize?: number;
  labelWidth?: number;
  topLabelHeight?: number;
  minColor?: string;
  maxColor?: string;
}) {
  const height = topLabelHeight + rows.length * cellSize;
  const availW = width - labelWidth;
  const cw = Math.min(cellSize, availW / cols.length);

  // Find min/max for color scaling
  const values = cells.map((c) => c.value).filter((v) => !isNaN(v));
  const minVal = Math.min(...values, 0);
  const maxVal = Math.max(...values, 1);

  function interpolateColor(value: number): string {
    const t = maxVal === minVal ? 0.5 : (value - minVal) / (maxVal - minVal);
    // Simple hex interpolation
    const r1 = parseInt(minColor.slice(1, 3), 16);
    const g1 = parseInt(minColor.slice(3, 5), 16);
    const b1 = parseInt(minColor.slice(5, 7), 16);
    const r2 = parseInt(maxColor.slice(1, 3), 16);
    const g2 = parseInt(maxColor.slice(3, 5), 16);
    const b2 = parseInt(maxColor.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  const cellMap = new Map(cells.map((c) => [`${c.row}:${c.col}`, c.value]));

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Column headers */}
      {cols.map((col, ci) => {
        const lines = wrapText(col, Math.max(6, Math.floor(cw / 5)));
        return lines.map((line, li) => (
          <SvgText
            key={`ch-${ci}-${li}`}
            x={labelWidth + ci * cw + cw / 2}
            y={topLabelHeight - 6 - (lines.length - li - 1) * 7}
            textAnchor="middle"
            style={{ fontSize: 6, fontFamily: "Helvetica" }}
            fill={colors.textMuted}
          >
            {line}
          </SvgText>
        ));
      })}
      {/* Rows */}
      {rows.map((row, ri) => (
        <G key={`r-${ri}`}>
          {wrapText(row, Math.max(12, Math.floor(labelWidth / 6))).map((line, li, lines) => (
            <SvgText
              key={`r-label-${ri}-${li}`}
              x={labelWidth - 4}
              y={topLabelHeight + ri * cellSize + cellSize / 2 + 3 - ((lines.length - 1) * 3.5) + li * 7}
              textAnchor="end"
              style={{ fontSize: 7, fontFamily: "Helvetica" }}
              fill={colors.textSecondary}
            >
              {line}
            </SvgText>
          ))}
          {cols.map((col, ci) => {
            const val = cellMap.get(`${row}:${col}`);
            const fill = val !== undefined ? interpolateColor(val) : "#F8FAFC";
            const textColor = val !== undefined && val > (maxVal - minVal) * 0.6 + minVal ? "#FFFFFF" : colors.textPrimary;
            return (
              <G key={`c-${ci}`}>
                <Rect
                  x={labelWidth + ci * cw + 1}
                  y={topLabelHeight + ri * cellSize + 1}
                  width={cw - 2}
                  height={cellSize - 2}
                  rx={2}
                  fill={fill}
                />
                {val !== undefined && cw >= 20 && (
                  <SvgText
                    x={labelWidth + ci * cw + cw / 2}
                    y={topLabelHeight + ri * cellSize + cellSize / 2 + 3}
                    textAnchor="middle"
                    style={{ fontSize: 6, fontFamily: "Helvetica", fontWeight: "bold" }}
                    fill={textColor}
                  >
                    {typeof val === "number" ? (Math.abs(val) >= 100 ? Math.round(val) : val.toFixed(1)) : val}
                  </SvgText>
                )}
              </G>
            );
          })}
        </G>
      ))}
    </Svg>
  );
}

// ── Scatter Plot ─────────────────────────────────────────────────────────────

interface ScatterPoint {
  x: number;
  y: number;
  cluster?: number;
  color?: string;
}

const CLUSTER_COLORS = [colors.chartPrimary, colors.chartCyan, colors.chartYellow, colors.chartGreen, colors.chartTertiary, colors.chartRed];

export function ScatterPlot({
  points,
  width = 480,
  height = 200,
  xLabel = "PC1",
  yLabel = "PC2",
  xTickFormatter,
  yTickFormatter,
  pointRadius = 2.8,
  pointOpacity = 0.82,
}: {
  points: ScatterPoint[];
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  xTickFormatter?: (value: number) => string;
  yTickFormatter?: (value: number) => string;
  pointRadius?: number;
  pointOpacity?: number;
}) {
  if (points.length === 0) return null;

  const pad = { top: 10, right: 10, bottom: 24, left: 34 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Grid */}
      <Line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + ch} stroke={colors.borderLight} strokeWidth={0.5} />
      <Line x1={pad.left} y1={pad.top + ch} x2={pad.left + cw} y2={pad.top + ch} stroke={colors.borderLight} strokeWidth={0.5} />
      {[0, 0.5, 1].map((frac, i) => {
        const x = pad.left + cw * frac;
        const tickValue = xMin + xRange * frac;
        return (
          <G key={`x-tick-${i}`}>
            <Line x1={x} y1={pad.top + ch} x2={x} y2={pad.top + ch + 3} stroke={colors.borderLight} strokeWidth={0.5} />
            <SvgText
              x={x}
              y={height - 10}
              textAnchor="middle"
              style={{ fontSize: 6, fontFamily: "Helvetica" }}
              fill={colors.textMuted}
            >
              {xTickFormatter ? xTickFormatter(tickValue) : formatAxisValue(tickValue)}
            </SvgText>
          </G>
        );
      })}
      {[0, 0.5, 1].map((frac, i) => {
        const y = pad.top + ch * (1 - frac);
        const tickValue = yMin + yRange * frac;
        return (
          <G key={`y-tick-${i}`}>
            <Line x1={pad.left - 3} y1={y} x2={pad.left} y2={y} stroke={colors.borderLight} strokeWidth={0.5} />
            <SvgText
              x={pad.left - 5}
              y={y + 2}
              textAnchor="end"
              style={{ fontSize: 6, fontFamily: "Helvetica" }}
              fill={colors.textMuted}
            >
              {yTickFormatter ? yTickFormatter(tickValue) : formatAxisValue(tickValue)}
            </SvgText>
          </G>
        );
      })}
      {/* Points */}
      {points.map((p, i) => {
        const px = pad.left + ((p.x - xMin) / xRange) * cw;
        const py = pad.top + ch - ((p.y - yMin) / yRange) * ch;
        const clr = p.color ?? CLUSTER_COLORS[p.cluster ?? 0] ?? colors.chartSecondary;
        return <Circle key={i} cx={px} cy={py} r={pointRadius} fill={clr} opacity={pointOpacity} />;
      })}
      {/* Axis labels */}
      <SvgText x={pad.left + cw / 2} y={height - 2} textAnchor="middle" style={{ fontSize: 7, fontFamily: "Helvetica" }} fill={colors.textMuted}>
        {xLabel}
      </SvgText>
      <SvgText x={8} y={pad.top + ch / 2} textAnchor="middle" style={{ fontSize: 7, fontFamily: "Helvetica" }} fill={colors.textMuted} transform={`rotate(-90, 8, ${pad.top + ch / 2})`}>
        {yLabel}
      </SvgText>
    </Svg>
  );
}

// ── Box Plot ─────────────────────────────────────────────────────────────────

interface BoxData {
  label: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export function BoxPlot({
  data,
  width = 480,
  height = 120,
  maxValue: forceMax,
  normalize = false,
}: {
  data: BoxData[];
  width?: number;
  height?: number;
  maxValue?: number;
  normalize?: boolean;
}) {
  const pad = { top: 10, bottom: 20, left: 90, right: 20 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;
  const rowH = ch / data.length;
  const maxVal = forceMax ?? Math.max(...data.map((d) => d.p90), 1);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {data.map((d, i) => {
        const y = pad.top + i * rowH;
        const cy = y + rowH / 2;
        const rowMax = normalize ? Math.max(d.p90, d.p75, d.p50, d.p25, d.p10, 1) : maxVal;
        const scale = (v: number) => pad.left + (v / rowMax) * cw;

        return (
          <G key={i}>
            {/* Label */}
            <SvgText x={pad.left - 4} y={cy + 3} textAnchor="end" style={{ fontSize: 7, fontFamily: "Helvetica" }} fill={colors.textSecondary}>
              {d.label}
            </SvgText>
            {/* Whisker line (p10 to p90) */}
            <Line x1={scale(d.p10)} y1={cy} x2={scale(d.p90)} y2={cy} stroke={colors.chartSecondary} strokeWidth={1} />
            {/* Box (p25 to p75) */}
            <Rect x={scale(d.p25)} y={cy - 6} width={scale(d.p75) - scale(d.p25)} height={12} fill={colors.chartSecondary} opacity={0.3} rx={2} />
            {/* Median line */}
            <Line x1={scale(d.p50)} y1={cy - 6} x2={scale(d.p50)} y2={cy + 6} stroke={colors.chartPrimary} strokeWidth={2} />
            {/* Whisker caps */}
            <Line x1={scale(d.p10)} y1={cy - 3} x2={scale(d.p10)} y2={cy + 3} stroke={colors.chartSecondary} strokeWidth={1} />
            <Line x1={scale(d.p90)} y1={cy - 3} x2={scale(d.p90)} y2={cy + 3} stroke={colors.chartSecondary} strokeWidth={1} />
          </G>
        );
      })}
    </Svg>
  );
}

// ── Multi-Line Chart ─────────────────────────────────────────────────────────

interface MultiLineSeries {
  label: string;
  color: string;
  values: number[];
}

export function MultiLineChart({
  series,
  xLabels,
  width = 480,
  height = 160,
}: {
  series: MultiLineSeries[];
  xLabels: string[];
  width?: number;
  height?: number;
}) {
  if (series.length === 0 || xLabels.length < 2) return null;

  const pad = { top: 10, bottom: 20, left: 10, right: 10 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;
  const allVals = series.flatMap((s) => s.values.filter((v) => !isNaN(v) && v != null));
  const maxVal = Math.max(...allVals, 1);

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Grid */}
      {[0, 0.5, 1].map((f, i) => {
        const y = pad.top + ch * (1 - f);
        return <Line key={i} x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke={colors.borderLight} strokeWidth={0.5} />;
      })}
      {/* Lines */}
      {series.map((s, si) => {
        const pts = s.values.map((v, i) => ({
          x: pad.left + (i / (xLabels.length - 1)) * cw,
          y: pad.top + ch - ((v ?? 0) / maxVal) * ch,
        }));
        const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${isNaN(p.y) ? pad.top + ch : p.y}`).join(" ");
        return <Path key={si} d={path} stroke={s.color} strokeWidth={1.5} fill="none" />;
      })}
      {/* X labels */}
      {xLabels.map((label, i) => (
        <SvgText
          key={i}
          x={pad.left + (i / (xLabels.length - 1)) * cw}
          y={height - 2}
          textAnchor="middle"
          style={{ fontSize: 6, fontFamily: "Helvetica" }}
          fill={colors.textMuted}
        >
          {label}
        </SvgText>
      ))}
    </Svg>
  );
}

// ── Utility ──────────────────────────────────────────────────────────────────

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

export { formatCompact, CLUSTER_COLORS };
