import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  isToday,
  isBefore,
  isAfter,
  isSameDay,
  addWeeks,
  subWeeks,
  subYears
} from 'date-fns';
import { sv } from 'date-fns/locale';
import { 
  DollarSign, 
  CircleDollarSign, 
  Zap, 
  Calendar, 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  TrendingDown, 
  Target, 
  Timer, 
  History, 
  Hourglass, 
  Wallet, 
  Activity, 
  Heart, 
  Package2, 
  ChevronDown, 
  TrendingUp, 
  Clock, 
  Award, 
  TriangleAlert as AlertTriangle 
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, lightTheme, darkTheme } from '@/hooks/useTheme';
import { useDatabase } from '@/hooks/useDatabase';
import { useStats } from '@/hooks/useStats';
import { useSettingsSync } from '@/hooks/useSettingsSync';
import { LineChart } from '@/components/charts/LineChart';

type TimeRange = 'week' | 'month' | 'year';

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours < 24) {
    return remainingMinutes > 0 ? 
      `${hours}h ${remainingMinutes}m` : 
      `${hours}h`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  return remainingHours > 0 ? 
    `${days}d ${remainingHours}h` : 
    `${days}d`;
};

export default function StatisticsScreen() {
  const { theme } = useTheme();
  const currentTheme = theme === 'light' ? lightTheme : darkTheme;
  const { loadSettings, loadDailyStats } = useDatabase();
  const [settings, setSettings] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  
  const {
    isLoading,
    error,
    dailyStats,
    weeklyStats,
    monthlyStats,
    yearlyStats,
    consumptionStats,
    progressStats,
    savingsStats,
    healthStats,
    refresh
  } = useStats();

  useSettingsSync(async () => {
    const updatedSettings = await loadSettings();
    if (updatedSettings) {
      setSettings(updatedSettings);
      refresh();
    }
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayStats, setSelectedDayStats] = useState<any>(null);
  const [daysInRange, setDaysInRange] = useState<Date[]>([]);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  useEffect(() => {
    let start: Date;
    let end: Date;

    switch (timeRange) {
      case 'week':
        start = startOfWeek(currentDate, { weekStartsOn: 1 });
        end = endOfWeek(currentDate, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
        break;
      case 'year':
        end = currentDate;
        start = subYears(end, 1);
        break;
    }

    setDaysInRange(eachDayOfInterval({ start, end }));
  }, [currentDate, timeRange]);

  useEffect(() => {
    loadSelectedDayStats();
  }, [selectedDate]);

  const loadSelectedDayStats = async () => {
    const stats = await loadDailyStats(format(selectedDate, 'yyyy-MM-dd'));
    setSelectedDayStats(stats);
  };

  const navigateTime = (direction: 'prev' | 'next') => {
    let newDate: Date;

    switch (timeRange) {
      case 'week':
        newDate = direction === 'prev' 
          ? subWeeks(currentDate, 1)
          : addWeeks(currentDate, 1);
        break;
      case 'month':
        newDate = direction === 'prev'
          ? subMonths(currentDate, 1)
          : addMonths(currentDate, 1);
        break;
      case 'year':
        newDate = direction === 'prev'
          ? subMonths(currentDate, 1)
          : addMonths(currentDate, 1);
        break;
    }

    setCurrentDate(newDate);
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'week':
        return `Vecka ${format(currentDate, 'w', { locale: sv })}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: sv });
      case 'year':
        const end = currentDate;
        const start = subYears(end, 1);
        return `${format(start, 'MMM yyyy', { locale: sv })} - ${format(end, 'MMM yyyy', { locale: sv })}`;
    }
  };

  const formatCurrency = (amount: number): string => {
    return `${amount.toFixed(0)} kr`;
  };

  const formatNicotine = (amount: number): string => {
    return `${amount.toFixed(1)} mg`;
  };

  const renderStatCard = (icon: React.ReactNode, value: string | number, isOverLimit: boolean = false) => (
    <View style={[styles.statCard, { 
      backgroundColor: currentTheme.colors.cardBackground,
      borderColor: currentTheme.colors.cardBorder,
      borderWidth: 1,
    }]}>
      {icon}
      <Text style={[
        styles.statValue,
        { color: currentTheme.colors.text },
        isOverLimit && { color: currentTheme.colors.error },
        styles.smallerStatValue
      ]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );

  const renderSectionHeader = (title: string, color: string) => (
    <View style={[styles.sectionHeader, { backgroundColor: color }]}>
      <LinearGradient
        colors={[color, theme === 'light' ? 
          `${color}dd` : 
          `${color}aa`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.sectionHeaderGradient}
      >
        <Text style={styles.sectionHeaderText}>{title}</Text>
      </LinearGradient>
    </View>
  );

  const renderLabelHeader = (label: string, color: string) => (
    <View style={[styles.labelHeader, { backgroundColor: color }]}>
      <LinearGradient
        colors={[color, theme === 'light' ? 
          `${color}dd` : 
          `${color}aa`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.labelHeaderGradient}
      >
        <Text style={styles.labelHeaderText}>{label}</Text>
      </LinearGradient>
    </View>
  );

  const renderConsumptionSection = () => {
    const sectionColor = currentTheme.colors.primary;
    return (
      <View style={[styles.section, { 
        backgroundColor: currentTheme.colors.card,
        borderColor: currentTheme.colors.cardBorder,
        borderWidth: 1,
      }]}>
        {renderSectionHeader('Förbrukning', sectionColor)}

        <View style={styles.subsection}>
          <Text style={[styles.subsectionTitle, { color: currentTheme.colors.textSecondary }]}>
            Antal snusade portioner
          </Text>
          <View style={styles.labeledStatsGrid}>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Dag', sectionColor)}
              {renderStatCard(
                <History size={24} color={sectionColor} />,
                consumptionStats?.daily.count || 0
              )}
            </View>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Vecka', sectionColor)}
              {renderStatCard(
                <Calendar size={24} color={sectionColor} />,
                consumptionStats?.weekly.count || 0
              )}
            </View>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Månad', sectionColor)}
              {renderStatCard(
                <CalendarDays size={24} color={sectionColor} />,
                consumptionStats?.monthly.count || 0
              )}
            </View>
          </View>
        </View>

        <View style={styles.subsection}>
          <Text style={[styles.subsectionTitle, { color: currentTheme.colors.textSecondary }]}>
            Antal sparade portioner
          </Text>
          <View style={styles.labeledStatsGrid}>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Dag', sectionColor)}
              {renderStatCard(
                <History size={24} color={sectionColor} />,
                consumptionStats?.daily.saved || 0
              )}
            </View>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Vecka', sectionColor)}
              {renderStatCard(
                <Calendar size={24} color={sectionColor} />,
                consumptionStats?.weekly.saved || 0
              )}
            </View>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Månad', sectionColor)}
              {renderStatCard(
                <CalendarDays size={24} color={sectionColor} />,
                consumptionStats?.monthly.saved || 0
              )}
            </View>
          </View>
        </View>

        <View style={styles.subsection}>
          <Text style={[styles.subsectionTitle, { color: currentTheme.colors.textSecondary }]}>
            Snitt antal portioner
          </Text>
          <View style={styles.labeledStatsGrid}>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Dag', sectionColor)}
              {renderStatCard(
                <Activity size={24} color={sectionColor} />,
                (consumptionStats?.weekly.averagePerDay || 0).toFixed(1)
              )}
            </View>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Vecka', sectionColor)}
              {renderStatCard(
                <Clock size={24} color={sectionColor} />,
                Math.round(consumptionStats?.weekly.count || 0)
              )}
            </View>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Trend', sectionColor)}
              {renderStatCard(
                <TrendingDown size={24} color={sectionColor} />,
                `${progressStats?.trend.percentage || 0}%`
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderStreaksSection = () => {
    const sectionColor = currentTheme.colors.success;
    return (
      <View style={[styles.section, { 
        backgroundColor: currentTheme.colors.card,
        borderColor: currentTheme.colors.cardBorder,
        borderWidth: 1,
      }]}>
        {renderSectionHeader('Streaks & Pauser', sectionColor)}

        <View style={styles.subsection}>
          <Text style={[styles.subsectionTitle, { color: currentTheme.colors.textSecondary }]}>
            Dagar under gränsen
          </Text>
          <View style={styles.labeledStatsGrid}>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Nuvarande streak', sectionColor)}
              {renderStatCard(
                <Award size={24} color={sectionColor} />,
                `${progressStats?.currentStreak || 0}`
              )}
            </View>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Längsta streak', sectionColor)}
              {renderStatCard(
                <Award size={24} color={sectionColor} />,
                `${progressStats?.longestStreak || 0}`
              )}
            </View>
          </View>
        </View>

        <View style={styles.subsection}>
          <Text style={[styles.subsectionTitle, { color: currentTheme.colors.textSecondary }]}>
            Tid utan snus
          </Text>
          <View style={styles.labeledStatsGrid}>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Nuvarande paus', sectionColor)}
              {renderStatCard(
                <Clock size={24} color={sectionColor} />,
                formatTime(healthStats?.currentPause || 0)
              )}
            </View>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Längsta paus', sectionColor)}
              {renderStatCard(
                <Hourglass size={24} color={sectionColor} />,
                formatTime(weeklyStats?.bestPause || 0)
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderEconomySection = () => {
    const sectionColor = currentTheme.colors.warning;
    const pricePerPortion = settings ? (settings.costPerCan / settings.portionsPerCan).toFixed(2) : '0.00';
    
    return (
      <View style={[styles.section, { 
        backgroundColor: currentTheme.colors.card,
        borderColor: currentTheme.colors.cardBorder,
        borderWidth: 1,
      }]}>
        {renderSectionHeader('Ekonomi', sectionColor)}

        <View style={styles.subsection}>
          <View style={styles.costHeader}>
            <Text style={[styles.subsectionTitle, { color: currentTheme.colors.textSecondary }]}>
              Kostnader
            </Text>
            <Text style={[styles.pricePerPortion, { color: currentTheme.colors.textSecondary }]}>
              Pris per prilla: {pricePerPortion} kr
            </Text>
          </View>
          <View style={styles.labeledStatsGrid}>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Spenderat idag', sectionColor)}
              {renderStatCard(
                <Wallet size={24} color={sectionColor} />,
                formatCurrency(consumptionStats?.daily.cost || 0)
              )}
            </View>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Spenderat totalt', sectionColor)}
              {renderStatCard(
                <CircleDollarSign size={24} color={sectionColor} />,
                formatCurrency(yearlyStats?.totalCost || 0)
              )}
            </View>
          </View>
        </View>

        <View style={styles.subsection}>
          <Text style={[styles.subsectionTitle, { color: currentTheme.colors.textSecondary }]}>
            Besparingar
          </Text>
          <View style={styles.labeledStatsGrid}>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Idag', sectionColor)}
              {renderStatCard(
                <DollarSign size={24} color={sectionColor} />,
                formatCurrency(savingsStats?.daily || 0)
              )}
            </View>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Totalt', sectionColor)}
              {renderStatCard(
                <CircleDollarSign size={24} color={sectionColor} />,
                formatCurrency(savingsStats?.total || 0)
              )}
            </View>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Prognos/år', sectionColor)}
              {renderStatCard(
                <TrendingUp size={24} color={sectionColor} />,
                formatCurrency(savingsStats?.projected.oneYear || 0)
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderHealthSection = () => {
    const sectionColor = currentTheme.colors.error;
    return (
      <View style={[styles.section, { 
        backgroundColor: currentTheme.colors.card,
        borderColor: currentTheme.colors.cardBorder,
        borderWidth: 1,
      }]}>
        {renderSectionHeader('Hälsa', sectionColor)}

        <View style={styles.subsection}>
          <Text style={[styles.subsectionTitle, { color: currentTheme.colors.textSecondary }]}>
            Nikotin och framsteg
          </Text>
          <View style={styles.labeledStatsGrid}>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Nikotin idag', sectionColor)}
              {renderStatCard(
                <Zap size={24} color={sectionColor} />,
                formatNicotine(healthStats?.nicotineDaily || 0),
                (consumptionStats?.daily.count || 0) > (settings?.dailyIntake || 10)
              )}
            </View>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Dagar under gräns', sectionColor)}
              {renderStatCard(
                <Heart size={24} color={sectionColor} />,
                progressStats?.daysWithinLimit || 0
              )}
            </View>
          </View>
        </View>

        <View style={styles.subsection}>
          <Text style={[styles.subsectionTitle, { color: currentTheme.colors.textSecondary }]}>
            Tidshantering
          </Text>
          <View style={styles.labeledStatsGrid}>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Genomsnittlig tid med snus', sectionColor)}
              {renderStatCard(
                <Timer size={24} color={sectionColor} />,
                formatTime(healthStats?.averageSessionTime || 0)
              )}
            </View>
            <View style={styles.labeledStatColumn}>
              {renderLabelHeader('Genomsnittlig tid mellan snus', sectionColor)}
              {renderStatCard(
                <Clock size={24} color={sectionColor} />,
                formatTime(healthStats?.averageWaitTime || 0)
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const getChartData = () => {
    return daysInRange.map(day => ({
      date: day,
      value: weeklyStats?.dailyCounts?.[format(day, 'yyyy-MM-dd')] || 0
    }));
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: currentTheme.colors.text }}>Laddar statistik...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={{ color: currentTheme.colors.error }}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={currentTheme.colors.background}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TrendingUp size={32} color={currentTheme.colors.text} />
          <Text style={[styles.title, { color: currentTheme.colors.text }]}>Statistik</Text>
        </View>

        <View style={[styles.section, { 
          backgroundColor: currentTheme.colors.card,
          borderColor: currentTheme.colors.cardBorder,
          borderWidth: 1,
        }]}>
          <View style={[styles.overviewHeader, { borderBottomColor: currentTheme.colors.cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
              Översikt
            </Text>
            <View style={styles.timeNavigation}>
              <TouchableOpacity 
                onPress={() => navigateTime('prev')}
                style={[styles.navButton, { backgroundColor: currentTheme.colors.cardBackground }]}
              >
                <ChevronLeft size={20} color={currentTheme.colors.text} />
              </TouchableOpacity>
              <View style={[styles.timeLabel, { backgroundColor: currentTheme.colors.cardBackground }]}>
                <Text style={[styles.timeLabelText, { color: currentTheme.colors.text }]}>
                  {getTimeRangeLabel()}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => navigateTime('next')}
                style={[styles.navButton, { backgroundColor: currentTheme.colors.cardBackground }]}
              >
                <ChevronRight size={20} color={currentTheme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.timeRangeSelector}>
            {(['week', 'month', 'year'] as TimeRange[]).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.timeRangeButton,
                  { 
                    backgroundColor: currentTheme.colors.cardBackground,
                    borderColor: currentTheme.colors.cardBorder,
                  },
                  timeRange === range && {
                    backgroundColor: currentTheme.colors.primary,
                  }
                ]}
                onPress={() => setTimeRange(range)}
              >
                <Text style={[
                  styles.timeRangeText,
                  { color: currentTheme.colors.text },
                  timeRange === range && { color: '#fff' }
                ]}>
                  {range === 'week' ? 'Vecka' : range === 'month' ? 'Månad' : 'År'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.chartContainer}>
            <LineChart 
              data={getChartData()}
              timeRange={timeRange}
              limit={weeklyStats?.limit}
              startDate={timeRange === 'year' ? subYears(currentDate, 1) : undefined}
              endDate={timeRange === 'year' ? currentDate : undefined}
            />
          </View>
        </View>

        {renderConsumptionSection()}
        {renderStreaksSection()}
        {renderEconomySection()}
        {renderHealthSection()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  subsection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: -16,
    marginTop: -16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  sectionHeaderGradient: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  sectionHeaderText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#fff',
  },
  labelHeader: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: 'hidden',
    marginBottom: -1,
  },
  labelHeaderGradient: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  labelHeaderText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    marginBottom: 0,
  },
  subsectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginBottom: 16,
  },
  timeNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeLabel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeLabelText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 13,
  },
  navButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRangeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  timeRangeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  labeledStatsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  labeledStatColumn: {
    flex: 1,
  },
  statCard: {
    borderRadius: 12,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    minHeight: 80,
  },
  statValue: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    lineHeight: 28,
    textAlign: 'center',
  },
  smallerStatValue: {
    fontSize: 18,
    lineHeight: 22,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartContainer: {
    marginTop: 16,
    width: '100%',
    height: 'auto',
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    gap: 24,
  },
  costHeader: {
    flexDirection: 'column',
    gap: 4,
    marginBottom: 16,
  },
  pricePerPortion: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginTop: -12,
  },
});