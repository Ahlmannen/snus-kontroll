interface DailyStats {
  date: string;
  count: number;
  limit: number;
  longestPause: number;
  currentSnusStartTime: number | null;
  lastSnusEndTime: number | null;
  nextAllowed: number | null;
}

interface WeeklyStats {
  totalCount: number;
  averagePerDay: number;
  daysOverLimit: number;
  daysUnderLimit: number;
  longestStreak: number;
  bestPause: number;
  dailyCounts: { [key: string]: number };
  limit: number;
}

interface MonthlyStats {
  totalCount: number;
  averagePerDay: number;
  totalCost: number;
  totalNicotine: number;
  daysOverLimit: number;
  daysUnderLimit: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface YearlyStats {
  totalCount: number;
  totalCost: number;
  totalNicotine: number;
  averagePerDay: number;
  bestMonth: {
    month: string;
    count: number;
  };
  worstMonth: {
    month: string;
    count: number;
  };
}

interface ConsumptionStats {
  daily: {
    count: number;
    saved: number;
    cost: number;
    nicotine: number;
    averageSessionTime: number;
    averageWaitTime: number;
  };
  weekly: {
    count: number;
    saved: number;
    cost: number;
    nicotine: number;
    averagePerDay: number;
  };
  monthly: {
    count: number;
    saved: number;
    cost: number;
    nicotine: number;
    averagePerDay: number;
  };
  yearly: {
    count: number;
    cost: number;
    nicotine: number;
    averagePerDay: number;
  };
}

interface ProgressStats {
  currentStreak: number;
  longestStreak: number;
  daysWithinLimit: number;
  daysOverLimit: number;
  goalProgress: number;
  trend: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
}

interface SavingsStats {
  daily: number;
  total: number;
  projected: {
    threeMonths: number;
    sixMonths: number;
    oneYear: number;
  };
}

interface HealthStats {
  nicotineDaily: number;
  nicotineWeekly: number;
  nicotineMonthly: number;
  averageSessionTime: number;
  averageWaitTime: number;
  maxNicotineDay: {
    date: string;
    amount: number;
  };
  reductionDays: number;
  currentPause: number;
  longestPause: number;
}

export type {
  DailyStats,
  WeeklyStats,
  MonthlyStats,
  YearlyStats,
  ConsumptionStats,
  ProgressStats,
  SavingsStats,
  HealthStats
};