import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { format, getDate, eachMonthOfInterval } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useTheme, lightTheme, darkTheme } from '@/hooks/useTheme';
import Svg, { Path, Circle, Line as SvgLine, Text as SvgText } from 'react-native-svg';

interface DataPoint {
  date: Date;
  value: number;
}

interface Props {
  data: DataPoint[];
  timeRange: 'week' | 'month' | 'year';
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

// Helper functions for native chart
const getMinMaxValues = (data: { value: number }[], limit?: number) => {
  const values = data.map(d => d.value);
  if (limit !== undefined) values.push(limit);
  return {
    min: Math.min(0, ...values),
    max: Math.max(...values)
  };
};

const createPath = (points: { x: number; y: number }[]) => {
  if (points.length === 0) return '';
  const start = points[0];
  return `M ${start.x} ${start.y} ` + points.slice(1)
    .map(point => `L ${point.x} ${point.y}`)
    .join(' ');
};

// Helper to determine if we should show the label for a specific date
const shouldShowLabel = (date: Date, timeRange: 'week' | 'month' | 'year', index: number, total: number) => {
  if (timeRange === 'week') return true;
  if (timeRange === 'month') {
    const dayOfMonth = getDate(date);
    return dayOfMonth === 1 || index === total - 1 || dayOfMonth % 5 === 0;
  }
  if (timeRange === 'year') {
    // For mobile, show fewer labels
    if (Platform.OS !== 'web') {
      return index % 2 === 0; // Show every other month
    }
    return true; // Show all months on web
  }
  return false;
};

// Helper to aggregate data by month for year view
const aggregateDataByMonth = (data: DataPoint[], startDate: Date, endDate: Date) => {
  const monthlyData = new Map<string, { total: number; count: number }>();
  
  data.forEach(point => {
    const monthKey = format(point.date, 'yyyy-MM');
    const existing = monthlyData.get(monthKey) || { total: 0, count: 0 };
    monthlyData.set(monthKey, {
      total: existing.total + point.value,
      count: existing.count + 1
    });
  });

  // Get all months in the range
  const months = eachMonthOfInterval({
    start: startDate,
    end: endDate
  });

  return months.map(month => {
    const monthKey = format(month, 'yyyy-MM');
    const monthData = monthlyData.get(monthKey);
    return {
      date: month,
      value: monthData ? Math.round(monthData.total / monthData.count) : 0
    };
  });
};

const CustomTooltip = ({ active, payload, label, theme }: any) => {
  if (active && payload && payload.length) {
    return (
      <View style={[styles.tooltip, { 
        backgroundColor: theme.colors.card,
        borderColor: theme.colors.cardBorder,
      }]}>
        <View style={styles.tooltipRow}>
          <View style={styles.tooltipDot} />
          <View>
            <View style={styles.tooltipLabel}>
              <Text style={[styles.tooltipText, { color: theme.colors.text }]}>
                {label}
              </Text>
            </View>
            <Text style={[styles.tooltipValue, { color: theme.colors.text }]}>
              {payload[0].value} portioner
            </Text>
          </View>
        </View>
      </View>
    );
  }
  return null;
};

export function LineChart({ data, timeRange, limit, startDate, endDate }: Props) {
  const { theme } = useTheme();
  const currentTheme = theme === 'light' ? lightTheme : darkTheme;
  const { width: windowWidth } = useWindowDimensions();

  // Transform and aggregate data based on timeRange
  const processedData = useMemo(() => {
    if (timeRange === 'year' && startDate && endDate) {
      return aggregateDataByMonth(data, startDate, endDate);
    }
    return data;
  }, [data, timeRange, startDate, endDate]);

  // Transform data for charts
  const chartData = processedData.map((point, index) => {
    const isWeb = Platform.OS === 'web';
    const showLabel = shouldShowLabel(point.date, timeRange, index, processedData.length);
    
    let dateFormat = timeRange === 'week' ? 'EEE' :
                    timeRange === 'month' ? 'd' :
                    isWeb ? 'MMM yyyy' : 'MMM'; // Simpler format for mobile

    return {
      date: format(point.date, dateFormat, { locale: sv }),
      fullDate: format(point.date, 'MMM yyyy', { locale: sv }), // For tooltip
      value: point.value,
      color: point.value > (limit || Infinity) ? currentTheme.colors.error : currentTheme.colors.primary,
      showLabel
    };
  });

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: currentTheme.colors.cardBackground }]}>
        <ResponsiveContainer width="100%" height={250}>
          <RechartsLineChart 
            data={chartData} 
            margin={{ 
              top: 20, 
              right: 20, 
              bottom: 40,
              left: 40 
            }}
          >
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={currentTheme.colors.primary} stopOpacity={0.1}/>
                <stop offset="95%" stopColor={currentTheme.colors.primary} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={currentTheme.colors.cardBorder}
              vertical={false}
              opacity={0.5}
            />
            <XAxis
              dataKey="date"
              tick={{ 
                fill: currentTheme.colors.textSecondary, 
                fontSize: 12,
                fontFamily: 'Inter-Regular'
              }}
              stroke={currentTheme.colors.cardBorder}
              tickLine={false}
              axisLine={{ stroke: currentTheme.colors.cardBorder }}
              interval={0}
              angle={timeRange === 'year' ? -45 : 0}
              textAnchor={timeRange === 'year' ? 'end' : 'middle'}
              height={60}
            />
            <YAxis
              tick={{ 
                fill: currentTheme.colors.textSecondary, 
                fontSize: 12,
                fontFamily: 'Inter-Regular'
              }}
              stroke={currentTheme.colors.cardBorder}
              tickLine={false}
              axisLine={{ stroke: currentTheme.colors.cardBorder }}
              width={35}
              dx={-8}
            />
            <Tooltip
              content={<CustomTooltip theme={currentTheme} />}
              cursor={{ 
                stroke: currentTheme.colors.cardBorder,
                strokeWidth: 1,
                strokeDasharray: "4 4"
              }}
            />
            {limit && (
              <Line
                type="monotone"
                dataKey={() => limit}
                stroke={currentTheme.colors.warning}
                strokeDasharray="5 5"
                dot={false}
                strokeWidth={1}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={currentTheme.colors.primary}
              strokeWidth={2}
              dot={{ 
                fill: currentTheme.colors.card,
                stroke: currentTheme.colors.primary,
                strokeWidth: 1.5,
                r: 3
              }}
              activeDot={{ 
                r: 4,
                fill: currentTheme.colors.primary,
                stroke: currentTheme.colors.card,
                strokeWidth: 1.5
              }}
              fill="url(#colorValue)"
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </View>
    );
  }

  // Native chart calculations
  const nativeChart = useMemo(() => {
    const CHART_WIDTH = windowWidth - 48;
    const CHART_HEIGHT = 200;
    const PADDING = { 
      top: 20, 
      right: 20, 
      bottom: 30,
      left: 40 
    };
    const GRAPH_WIDTH = CHART_WIDTH - PADDING.left - PADDING.right;
    const GRAPH_HEIGHT = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    const { min, max } = getMinMaxValues(chartData, limit);
    const yRange = max - min;
    
    const yMin = Math.floor(min - (yRange * 0.1));
    const yMax = Math.ceil(max + (yRange * 0.1));

    const points = chartData.map((d, i) => ({
      x: PADDING.left + (i * (GRAPH_WIDTH / (chartData.length - 1))),
      y: PADDING.top + GRAPH_HEIGHT - ((d.value - yMin) / (yMax - yMin) * GRAPH_HEIGHT),
      showLabel: d.showLabel,
      label: d.date,
      value: d.value
    }));

    const limitPoints = limit ? [
      { x: PADDING.left, y: PADDING.top + GRAPH_HEIGHT - ((limit - yMin) / (yMax - yMin) * GRAPH_HEIGHT) },
      { x: PADDING.left + GRAPH_WIDTH, y: PADDING.top + GRAPH_HEIGHT - ((limit - yMin) / (yMax - yMin) * GRAPH_HEIGHT) }
    ] : null;

    const yGridLines = [];
    const numYLines = 5;
    for (let i = 0; i <= numYLines; i++) {
      const y = PADDING.top + (i * (GRAPH_HEIGHT / numYLines));
      const value = yMax - (i * ((yMax - yMin) / numYLines));
      yGridLines.push({ y, value });
    }

    return {
      width: CHART_WIDTH,
      height: CHART_HEIGHT,
      points,
      limitPoints,
      yGridLines,
      padding: PADDING
    };
  }, [chartData, windowWidth, limit]);

  return (
    <View style={styles.container}>
      <Svg width={nativeChart.width} height={nativeChart.height}>
        {/* Grid lines */}
        {nativeChart.yGridLines.map((line, i) => (
          <React.Fragment key={i}>
            <SvgLine
              x1={nativeChart.padding.left}
              y1={line.y}
              x2={nativeChart.width - nativeChart.padding.right}
              y2={line.y}
              stroke={currentTheme.colors.cardBorder}
              strokeWidth="1"
              strokeDasharray="3,3"
              opacity={0.5}
            />
            <SvgText
              x={nativeChart.padding.left - 5}
              y={line.y}
              textAnchor="end"
              alignmentBaseline="middle"
              fontSize="10"
              fill={currentTheme.colors.textSecondary}
              fontFamily="Inter-Regular"
            >
              {Math.round(line.value)}
            </SvgText>
          </React.Fragment>
        ))}

        {/* X-axis labels */}
        {nativeChart.points.map((point, i) => (
          point.showLabel && (
            <SvgText
              key={i}
              x={point.x}
              y={nativeChart.height - nativeChart.padding.bottom + 15}
              textAnchor="middle"
              fontSize="10"
              fill={currentTheme.colors.textSecondary}
              fontFamily="Inter-Regular"
            >
              {point.label}
            </SvgText>
          )
        ))}

        {/* Limit line */}
        {nativeChart.limitPoints && (
          <SvgLine
            x1={nativeChart.limitPoints[0].x}
            y1={nativeChart.limitPoints[0].y}
            x2={nativeChart.limitPoints[1].x}
            y2={nativeChart.limitPoints[1].y}
            stroke={currentTheme.colors.warning}
            strokeWidth="1"
            strokeDasharray="5,5"
          />
        )}

        {/* Data line */}
        <Path
          d={createPath(nativeChart.points)}
          stroke={currentTheme.colors.primary}
          strokeWidth="2"
          fill="none"
        />

        {/* Data points */}
        {nativeChart.points.map((point, i) => (
          <Circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={currentTheme.colors.card}
            stroke={currentTheme.colors.primary}
            strokeWidth="1.5"
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 'auto',
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tooltip: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  tooltipLabel: {
    marginBottom: 4,
  },
  tooltipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
  },
  tooltipValue: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
});