import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  subDays,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
  isToday,
  isBefore,
  isAfter,
  isSameDay,
  differenceInSeconds,
  startOfDay,
  endOfDay
} from 'date-fns';
import { sv } from 'date-fns/locale';
import { useDatabase } from './useDatabase';
import { useSettingsSync } from './useSettingsSync';
import type {
  DailyStats,
  WeeklyStats,
  MonthlyStats,
  YearlyStats,
  ConsumptionStats,
  ProgressStats,
  SavingsStats,
  HealthStats
} from '@/types/stats';

export const useStats = () => {
  const { loadSettings, loadDailyStats, saveDailyStats, clearAllStats, getAllWeeks, loadWeeklyStats } = useDatabase();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const settingsRef = useRef<any>(null);
  const loadingRef = useRef(false);
  const lastPauseUpdate = useRef<number>(0);
  const currentDateRef = useRef<string>(format(new Date(), 'yyyy-MM-dd'));
  const lastStatsUpdate = useRef<number>(Date.now());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [stats, setStats] = useState({
    dailyStats: null as DailyStats | null,
    weeklyStats: null as WeeklyStats | null,
    monthlyStats: null as MonthlyStats | null,
    yearlyStats: null as YearlyStats | null,
    consumptionStats: null as ConsumptionStats | null,
    progressStats: null as ProgressStats | null,
    savingsStats: null as SavingsStats | null,
    healthStats: null as HealthStats | null
  });

  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  useSettingsSync(async () => {
    const settings = await loadSettings();
    if (settings) {
      settingsRef.current = settings;
      await loadAllStats(true);
    }
  });

  const initializeDailyStats = useCallback((date: string): DailyStats => {
    return {
      count: 0,
      limit: settingsRef.current?.dailyIntake || 10,
      longestPause: 0,
      date: date,
      currentSnusStartTime: null,
      lastSnusEndTime: null,
      nextAllowed: null
    };
  }, []);

  const loadStatsForRange = useCallback(async (start: Date, end: Date) => {
    const days = eachDayOfInterval({ start, end });
    const allWeeks = await getAllWeeks();
    
    const dailyStats = await Promise.all(
      days.map(async (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const weekKey = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        
        // Try to load stats from the specific date first
        let stats = await loadDailyStats(dateStr);
        
        // If no stats found and the week exists in our records, try loading from weekly stats
        if (!stats && allWeeks.includes(weekKey)) {
          const weeklyStats = await loadWeeklyStats(weekKey);
          if (weeklyStats && weeklyStats[dateStr]) {
            stats = {
              ...weeklyStats[dateStr],
              date: dateStr
            };
          }
        }
        
        return {
          date: dateStr,
          stats: stats || initializeDailyStats(dateStr)
        };
      })
    );
    return dailyStats;
  }, [loadDailyStats, initializeDailyStats, getAllWeeks, loadWeeklyStats]);

  const calculatePause = useCallback((startTime: Date, endTime: Date): number => {
    return differenceInSeconds(endTime, startTime);
  }, []);

  const calculateCurrentPause = useCallback((stats: DailyStats | null): number => {
    if (!stats?.lastSnusEndTime) return 0;
    return calculatePause(new Date(stats.lastSnusEndTime), new Date());
  }, [calculatePause]);

  const calculateStreak = useCallback(async (date: Date, limit: number) => {
    const today = new Date();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const last30Days = await loadStatsForRange(subDays(today, 29), today);
    
    last30Days.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    
    for (const { stats, date: dateStr } of last30Days) {
      const currentDate = parseISO(dateStr);
      
      if (isAfter(currentDate, today)) continue;
      
      if (isSameDay(currentDate, today) && stats.count === 0) {
        const yesterday = last30Days[last30Days.length - 2];
        if (yesterday && yesterday.stats.count <= limit) {
          currentStreak = tempStreak;
        }
        break;
      }
      
      if (stats.count <= limit && stats.count > 0) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
        if (isSameDay(currentDate, today)) {
          currentStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
        if (isSameDay(currentDate, today)) {
          currentStreak = 0;
        }
      }
    }
    
    return {
      current: currentStreak,
      longest: longestStreak
    };
  }, [loadStatsForRange]);

  const calculateTrend = useCallback(async (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    
    const statsData = await loadStatsForRange(start, end);
    if (statsData.length < 2) return { direction: 'stable', percentage: 0 };
    
    const counts = statsData.map(({ stats }) => stats?.count || 0);
    const firstHalf = counts.slice(0, Math.floor(counts.length / 2));
    const secondHalf = counts.slice(Math.floor(counts.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (firstAvg === 0) return { direction: 'stable', percentage: 0 };
    
    const percentage = Math.abs(((secondAvg - firstAvg) / firstAvg) * 100);
    
    return {
      direction: secondAvg < firstAvg ? 'down' : secondAvg > firstAvg ? 'up' : 'stable',
      percentage: Math.round(percentage)
    };
  }, [loadStatsForRange]);

  const calculateSavedPortions = useCallback((actualCount: number, targetCount: number) => {
    return Math.max(0, targetCount - actualCount);
  }, []);

  const loadAllStats = useCallback(async (forceReload = false) => {
    const now = Date.now();
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }

    if (!forceReload && loadingRef.current) {
      updateTimeoutRef.current = setTimeout(() => loadAllStats(true), 100);
      return;
    }

    if (!forceReload && now - lastStatsUpdate.current < 100) {
      updateTimeoutRef.current = setTimeout(() => loadAllStats(true), 100);
      return;
    }
    
    loadingRef.current = true;
    lastStatsUpdate.current = now;

    try {
      if (!settingsRef.current) {
        const settings = await loadSettings();
        if (!settings) {
          setError('No settings found');
          setIsLoading(false);
          return;
        }
        settingsRef.current = settings;
      }

      const settings = settingsRef.current;
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      if (todayStr !== currentDateRef.current || forceReload) {
        currentDateRef.current = todayStr;
      }

      let todayStats = await loadDailyStats(todayStr);
      if (!todayStats) {
        todayStats = initializeDailyStats(todayStr);
        await saveDailyStats(todayStats);
      }
      
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      const yearStart = startOfYear(today);
      const yearEnd = endOfYear(today);
      
      const [weeklyData, monthlyData, yearlyData] = await Promise.all([
        loadStatsForRange(weekStart, weekEnd),
        loadStatsForRange(monthStart, monthEnd),
        loadStatsForRange(yearStart, yearEnd)
      ]);

      const dailyCounts: { [key: string]: number } = {};
      weeklyData.forEach(({ date, stats }) => {
        dailyCounts[date] = stats?.count || 0;
      });
      
      const portionCost = settings.costPerCan / settings.portionsPerCan;
      
      const weeklyTotal = weeklyData.reduce((sum, { stats }) => sum + (stats?.count || 0), 0);
      const weeklyOverLimit = weeklyData.filter(({ stats }) => (stats?.count || 0) > settings.dailyIntake).length;
      const weeklyUnderLimit = weeklyData.filter(({ stats }) => (stats?.count || 0) <= settings.dailyIntake && stats?.count > 0).length;
      
      const currentPauseSeconds = calculateCurrentPause(todayStats);
      const currentPauseMinutes = Math.floor(currentPauseSeconds / 60);

      if (currentPauseMinutes > todayStats.longestPause && now - lastPauseUpdate.current >= 1000) {
        todayStats = {
          ...todayStats,
          longestPause: currentPauseMinutes
        };
        await saveDailyStats(todayStats);
        lastPauseUpdate.current = now;
      }

      const monthlyTotal = monthlyData.reduce((sum, { stats }) => sum + (stats?.count || 0), 0);
      const monthlyAverage = monthlyTotal / monthlyData.length;
      
      const yearlyTotal = yearlyData.reduce((sum, { stats }) => sum + (stats?.count || 0), 0);
      const yearlyTotalCost = yearlyTotal * portionCost;

      const dailySavings = Math.max(0, (settings.dailyIntake - (todayStats?.count || 0)) * portionCost);

      const totalAccumulatedSavings = yearlyData
        .filter(({ stats }) => stats?.count > 0)
        .reduce((sum, { stats }) => 
          sum + Math.max(0, (settings.dailyIntake - (stats?.count || 0)) * portionCost), 0);

      const dailySaved = calculateSavedPortions(todayStats?.count || 0, settings.dailyIntake);
      const weeklySaved = weeklyData.reduce((sum, { stats }) => 
        sum + calculateSavedPortions(stats?.count || 0, settings.dailyIntake), 0);
      const monthlySaved = monthlyData.reduce((sum, { stats }) => 
        sum + calculateSavedPortions(stats?.count || 0, settings.dailyIntake), 0);

      const [streaks, trend] = await Promise.all([
        calculateStreak(today, settings.dailyIntake),
        calculateTrend(7)
      ]);

      const newStats = {
        dailyStats: todayStats,
        weeklyStats: {
          totalCount: weeklyTotal,
          averagePerDay: weeklyTotal / 7,
          daysOverLimit: weeklyOverLimit,
          daysUnderLimit: weeklyUnderLimit,
          longestStreak: streaks.longest,
          bestPause: todayStats.longestPause,
          dailyCounts,
          limit: settings.dailyIntake
        },
        monthlyStats: {
          totalCount: monthlyTotal,
          averagePerDay: monthlyAverage,
          totalCost: monthlyTotal * portionCost,
          totalNicotine: monthlyTotal * settings.nicotineContent,
          daysOverLimit: monthlyData.filter(({ stats }) => (stats?.count || 0) > settings.dailyIntake).length,
          daysUnderLimit: monthlyData.filter(({ stats }) => (stats?.count || 0) <= settings.dailyIntake && stats?.count > 0).length,
          trend: trend.direction
        },
        yearlyStats: {
          totalCount: yearlyTotal,
          totalCost: yearlyTotalCost,
          totalNicotine: yearlyTotal * settings.nicotineContent,
          averagePerDay: yearlyTotal / yearlyData.length,
          bestMonth: {
            month: format(monthStart, 'MMMM', { locale: sv }),
            count: monthlyTotal
          },
          worstMonth: {
            month: format(monthStart, 'MMMM', { locale: sv }),
            count: monthlyTotal
          }
        },
        consumptionStats: {
          daily: {
            count: todayStats.count,
            saved: dailySaved,
            cost: todayStats.count * portionCost,
            nicotine: todayStats.count * settings.nicotineContent,
            averageSessionTime: settings.snusTime,
            averageWaitTime: settings.waitTime
          },
          weekly: {
            count: weeklyTotal,
            saved: weeklySaved,
            cost: weeklyTotal * portionCost,
            nicotine: weeklyTotal * settings.nicotineContent,
            averagePerDay: weeklyTotal / 7
          },
          monthly: {
            count: monthlyTotal,
            saved: monthlySaved,
            cost: monthlyTotal * portionCost,
            nicotine: monthlyTotal * settings.nicotineContent,
            averagePerDay: monthlyAverage
          },
          yearly: {
            count: yearlyTotal,
            cost: yearlyTotalCost,
            nicotine: yearlyTotal * settings.nicotineContent,
            averagePerDay: yearlyTotal / yearlyData.length
          }
        },
        progressStats: {
          currentStreak: streaks.current,
          longestStreak: streaks.longest,
          daysWithinLimit: weeklyUnderLimit,
          daysOverLimit: weeklyOverLimit,
          goalProgress: settings.goal === 'reduce'
            ? Math.max(0, ((settings.dailyIntake - todayStats.count) / settings.dailyIntake) * 100)
            : 0,
          trend
        },
        savingsStats: {
          daily: dailySavings,
          total: totalAccumulatedSavings,
          projected: {
            threeMonths: dailySavings * 90,
            sixMonths: dailySavings * 180,
            oneYear: dailySavings * 365
          }
        },
        healthStats: {
          nicotineDaily: todayStats.count * settings.nicotineContent,
          nicotineWeekly: weeklyTotal * settings.nicotineContent,
          nicotineMonthly: monthlyTotal * settings.nicotineContent,
          averageSessionTime: settings.snusTime,
          averageWaitTime: settings.waitTime,
          maxNicotineDay: {
            date: todayStr,
            amount: todayStats.count * settings.nicotineContent
          },
          reductionDays: weeklyUnderLimit,
          currentPause: currentPauseSeconds,
          longestPause: todayStats.longestPause * 60
        }
      };

      setStats(newStats);
      setError(null);
    } catch (error) {
      console.error('Failed to load statistics:', error);
      setError(error instanceof Error ? error.message : 'Failed to load statistics');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [loadSettings, loadDailyStats, calculateCurrentPause, calculateSavedPortions, calculateStreak, calculateTrend, loadStatsForRange, initializeDailyStats, saveDailyStats]);

  useEffect(() => {
    const checkAndUpdate = () => {
      const now = new Date();
      const currentDate = format(now, 'yyyy-MM-dd');
      
      if (currentDate !== currentDateRef.current) {
        loadAllStats(true);
      } else {
        loadAllStats();
      }
    };

    const interval = setInterval(checkAndUpdate, 500);
    return () => clearInterval(interval);
  }, [loadAllStats]);

  return {
    isLoading,
    error,
    ...stats,
    refresh: () => loadAllStats(true),
    clearAllStats
  };
};

export { useStats };