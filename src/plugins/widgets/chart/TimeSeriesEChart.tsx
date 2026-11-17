import { useComputedColorScheme } from '@mantine/core';
import { useEffect, useEffectEvent, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { AriaComponent, GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { getFieldLabel, type DataFrame } from '@/core/data/DataFrame';
import type { WidgetProps } from '@/plugins/WidgetPlugin';
import type { ChartOptions } from './chartOptions';
import { EMPTY_FRAME, toTimeSeries } from './timeSeries';
import classes from './TimeSeriesEChart.module.css';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, AriaComponent, CanvasRenderer]);

/** The same order as the Recharts renderer. */
const SERIES_COLORS = ['brand', 'info', 'success', 'warning'] as const;

/** ECharts cannot read CSS variables, so resolve the semantic tokens to real values on the host element. */
function readChartTheme(el: HTMLElement) {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    colors: SERIES_COLORS.map((c) => v(`--mantine-color-${c}-filled`)).filter(Boolean),
    text: v('--app-chart-text'),
    grid: v('--app-chart-grid'),
    font: css.fontFamily,
    tooltipBg: v('--mantine-color-body'),
    tooltipBorder: v('--mantine-color-default-border'),
    tooltipText: v('--mantine-color-text'),
  };
}

type ChartTheme = ReturnType<typeof readChartTheme>;

/** `#rrggbb` or `rgb(r, g, b)` with an alpha, for canvas fills; undefined for any other format. */
function withAlpha(color: string, alpha: number): string | undefined {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
  if (hex) {
    const n = parseInt(hex, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  const rgb = /rgba?\(([^)]+)\)/.exec(color)?.[1]?.split(',').slice(0, 3).join(',');
  return rgb ? `rgba(${rgb}, ${alpha})` : undefined;
}

function toOption(
  frame: DataFrame,
  form: ChartOptions['form'],
  timeZone: string,
  theme: ChartTheme,
): echarts.EChartsCoreOption {
  const { numbers, labels, formatValue } = toTimeSeries(frame, timeZone);
  const axisText = { color: theme.text, fontSize: 12, fontFamily: theme.font };
  return {
    animation: false,
    stateAnimation: { duration: 0 },
    aria: { enabled: true },
    color: theme.colors.length ? theme.colors : undefined,
    textStyle: { fontFamily: theme.font },
    grid: {
      left: 8,
      right: 16,
      top: 12,
      bottom: 8,
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },
    tooltip: {
      trigger: 'axis',
      transitionDuration: 0,
      className: classes.tooltip,
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText, fontSize: 12, fontFamily: theme.font },
      valueFormatter: (value: unknown) =>
        typeof value === 'number' ? formatValue(value) : typeof value === 'string' ? value : '',
    },
    axisPointer: { animation: false },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: form === 'bar',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...axisText, hideOverlap: true },
      // Like @mantine/charts' gridAxis="y": dashed lines at the x ticks.
      splitLine: { show: true, lineStyle: { color: theme.grid, type: [5, 5] } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...axisText, formatter: (value: number) => formatValue(value) },
      axisLine: { show: false },
      axisTick: { show: true, lineStyle: { color: theme.text } },
      splitLine: { show: false },
    },
    series: numbers.map((field, i) => {
      const color = theme.colors[i % Math.max(theme.colors.length, 1)];
      const top = color ? withAlpha(color, 0.2) : undefined;
      const bottom = color ? withAlpha(color, 0) : undefined;
      return {
        name: getFieldLabel(field),
        type: form === 'bar' ? 'bar' : 'line',
        showSymbol: false,
        smooth: form === 'bar' ? undefined : 0.35,
        smoothMonotone: 'x',
        lineStyle: { width: 2 },
        areaStyle:
          form !== 'area'
            ? undefined
            : top && bottom
              ? {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: top },
                    { offset: 1, color: bottom },
                  ]),
                }
              : { opacity: 0.2 },
        data: field.values as number[],
      };
    }),
  };
}

function getAccessibleName(frame: DataFrame) {
  const names = frame.fields
    .filter((field) => field.type === 'number')
    .map(getFieldLabel)
    .join(', ');
  return `Chart of ${names || 'no values'} over time`;
}

/** Number fields over the frame's time field, drawn by ECharts on a canvas. Fills its tile. */
export function TimeSeriesEChart({ frames, options, timeZone }: WidgetProps<ChartOptions>) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const scheme = useComputedColorScheme('light');
  const frame = frames[0] ?? EMPTY_FRAME;

  const draw = useEffectEvent(() => {
    const el = ref.current;
    if (!el || !chart.current) return;
    chart.current.setOption(toOption(frame, options.form, timeZone, readChartTheme(el)), { notMerge: true });
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const instance = echarts.init(el, undefined, { renderer: 'canvas' });
    chart.current = instance;
    draw();
    const resize = new ResizeObserver(() => instance.resize());
    resize.observe(el);
    return () => {
      resize.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  // Redraw on new data or options, and when the colour scheme changes so the resolved token values update.
  useEffect(() => {
    draw();
  }, [frame, options.form, timeZone, scheme]);

  return <div ref={ref} className={classes.host} role="img" aria-label={getAccessibleName(frame)} />;
}
