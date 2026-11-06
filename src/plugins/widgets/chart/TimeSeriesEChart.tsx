// Spike only: the same chart widget drawn by ECharts (canvas), styled from the app's Mantine variables,
// to compare resize cost and look with Recharts. Not production code: no tests, no stories, no a11y.
import { useEffect, useEffectEvent, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { getFieldLabel, getUnitAffix, type DataFrame } from '@/core/data/DataFrame';
import { formatTime } from '@/core/time/timeRange';
import type { WidgetProps } from '@/plugins/WidgetPlugin';
import type { ChartOptions } from './chartOptions';
import classes from './TimeSeriesEChart.module.css';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

const DAY = 86_400_000;
const EMPTY: DataFrame = { length: 0, fields: [] };
const SERIES_COLORS = ['brand', 'info', 'success', 'warning'];
const FALLBACK_COLOR = '#4c6ef5';

/** Colours and font from the page's Mantine variables, the way @mantine/charts picks them. */
function readTheme(el: HTMLElement) {
  const root = getComputedStyle(document.documentElement);
  const v = (name: string) => root.getPropertyValue(name).trim();
  const isDark = document.documentElement.getAttribute('data-mantine-color-scheme') === 'dark';
  return {
    colors: SERIES_COLORS.map((c) => v(`--mantine-color-${c}-5`) || FALLBACK_COLOR),
    text: isDark ? v('--mantine-color-dark-1') : v('--mantine-color-gray-7'),
    grid: isDark ? 'rgba(105, 105, 105, 0.6)' : 'rgba(173, 181, 189, 0.6)',
    font: getComputedStyle(el).fontFamily,
    tooltipBg: v('--mantine-color-body'),
    tooltipBorder: v('--mantine-color-default-border'),
    tooltipText: v('--mantine-color-text'),
  };
}

type Theme = ReturnType<typeof readTheme>;

/** `#rrggbb` or `rgb(r, g, b)` with an alpha, for canvas fills. */
function withAlpha(color: string, alpha: number) {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
  if (hex) {
    const n = parseInt(hex, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  const rgb = /rgba?\(([^)]+)\)/.exec(color)?.[1]?.split(',').slice(0, 3).join(',');
  return rgb ? `rgba(${rgb}, ${alpha})` : color;
}

function toOption(frame: DataFrame, form: ChartOptions['form'], timeZone: string, theme: Theme) {
  const time = frame.fields.find((field) => field.type === 'time');
  const numbers = frame.fields.filter((field) => field.type === 'number');
  const times = (time?.values ?? []) as number[];
  const span = (times.at(-1) ?? 0) - (times[0] ?? 0);
  const format = span > 2 * DAY ? 'day' : span > DAY ? 'dayTime' : 'time';
  const labels = times.map((t) => formatTime(t, timeZone, format));
  const { prefix = '', suffix = '' } = getUnitAffix(numbers[0]?.config?.unit);
  const formatValue = (value: number) => `${prefix}${value.toLocaleString()}${suffix}`;
  const axisText = { color: theme.text, fontSize: 12, fontFamily: theme.font };
  return {
    animation: false,
    color: theme.colors,
    textStyle: { fontFamily: theme.font },
    grid: { left: 8, right: 16, top: 12, bottom: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText, fontSize: 12, fontFamily: theme.font },
      extraCssText: 'box-shadow: var(--mantine-shadow-md); border-radius: var(--mantine-radius-default);',
      valueFormatter: (value: number) => formatValue(value),
    },
    xAxis: {
      type: 'category',
      data: labels,
      boundaryGap: form === 'bar',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...axisText, hideOverlap: true },
      // @mantine/charts' gridAxis="y" draws the dashed lines at the x ticks.
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
      const color = theme.colors[i % theme.colors.length] ?? FALLBACK_COLOR;
      return {
        name: getFieldLabel(field),
        type: form === 'bar' ? 'bar' : 'line',
        showSymbol: false,
        smooth: form !== 'bar' ? 0.35 : undefined,
        smoothMonotone: 'x',
        lineStyle: { width: 2 },
        areaStyle:
          form === 'area'
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: withAlpha(color, 0.2) },
                  { offset: 1, color: withAlpha(color, 0) },
                ]),
              }
            : undefined,
        data: field.values as number[],
      };
    }),
  };
}

export function TimeSeriesEChart({ frames, options, timeZone }: WidgetProps<ChartOptions>) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  // Draws with the latest props: when the chart is created and when the colour scheme changes.
  const draw = useEffectEvent((instance: echarts.ECharts, el: HTMLElement) => {
    instance.setOption(toOption(frames[0] ?? EMPTY, options.form, timeZone, readTheme(el)), {
      notMerge: true,
    });
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const instance = echarts.init(el, undefined, { renderer: 'canvas' });
    chart.current = instance;
    draw(instance, el);
    const resize = new ResizeObserver(() => instance.resize());
    resize.observe(el);
    // Follow the colour scheme, as @mantine/charts does through its CSS variables.
    const scheme = new MutationObserver(() => draw(instance, el));
    scheme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-mantine-color-scheme'],
    });
    return () => {
      resize.disconnect();
      scheme.disconnect();
      instance.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !chart.current) return;
    chart.current.setOption(toOption(frames[0] ?? EMPTY, options.form, timeZone, readTheme(el)), {
      notMerge: true,
    });
  }, [frames, options.form, timeZone]);

  // data-chart marks a chart's root for the perf checks (docs/REVIEW/perf/shell-perf.mjs).
  return <div ref={ref} className={classes.host} data-chart="echarts" />;
}
