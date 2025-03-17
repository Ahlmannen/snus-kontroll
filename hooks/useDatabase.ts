import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { emitSettingsUpdate } from './useSettingsSync';
import { format } from 'date-fns';

// Web implementation using AsyncStorage
const webDb = {
  initDatabase: async () => {
    try {
      const settings = await webDb.loadSettings();
      if (!settings) {
        await webDb.saveSettings({
          portionsPerCan: 24,
          goal: 'reduce',
          pace: 'medium',
          dailyIntake: 10,
          costPerCan: 50,
          snusTime: 30,
          waitTime: 30,
          nicotineContent: 8.0,
        });
      }
      return true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      return false;
    }
  },
  
  saveSettings: async (settings: any) => {
    try {
      await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
      emitSettingsUpdate();
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  },
  
  loadSettings: async () => {
    try {
      const settings = await AsyncStorage.getItem('userSettings');
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return null;
    }
  },
  
  saveDailyStats: async (stats: any) => {
    try {
      if (!stats.date) {
        throw new Error('Stats must include a date');
      }

      const date = stats.date;
      const settings = await webDb.loadSettings();
      
      const existingStats = await webDb.loadDailyStats(date);
      const longestPause = Math.max(
        existingStats?.longestPause || 0,
        stats.longestPause || 0
      );
      
      const updatedStats = {
        ...stats,
        date,
        limit: settings?.dailyIntake || 10,
        longestPause
      };
      
      await AsyncStorage.setItem(`dailyStats_${date}`, JSON.stringify(updatedStats));
      
      const weekKey = getWeekKey(date);
      let weeklyStats = await webDb.loadWeeklyStats(weekKey);
      
      if (!weeklyStats) {
        weeklyStats = {};
      }
      
      weeklyStats[date] = {
        count: updatedStats.count,
        limit: updatedStats.limit,
        longestPause: updatedStats.longestPause,
        currentSnusStartTime: updatedStats.currentSnusStartTime,
        lastSnusEndTime: updatedStats.lastSnusEndTime,
        nextAllowed: updatedStats.nextAllowed
      };
      
      await AsyncStorage.setItem(`weekStats_${weekKey}`, JSON.stringify(weeklyStats));
      
      const weeksKey = 'statsWeeks';
      let weeks = await AsyncStorage.getItem(weeksKey);
      let weeksList = weeks ? JSON.parse(weeks) : [];
      
      if (!weeksList.includes(weekKey)) {
        weeksList.push(weekKey);
        await AsyncStorage.setItem(weeksKey, JSON.stringify(weeksList));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save daily stats:', error);
      return false;
    }
  },
  
  loadDailyStats: async (date: string) => {
    try {
      const dailyStats = await AsyncStorage.getItem(`dailyStats_${date}`);
      if (dailyStats) {
        const parsedStats = JSON.parse(dailyStats);
        const settings = await webDb.loadSettings();
        return {
          ...parsedStats,
          date,
          limit: settings?.dailyIntake || 10,
          longestPause: parsedStats.longestPause || 0
        };
      }

      const weekKey = getWeekKey(date);
      const weeklyStats = await webDb.loadWeeklyStats(weekKey);
      if (weeklyStats && weeklyStats[date]) {
        return {
          ...weeklyStats[date],
          date
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to load daily stats:', error);
      return null;
    }
  },

  loadWeeklyStats: async (weekKey: string) => {
    try {
      const weekStats = await AsyncStorage.getItem(`weekStats_${weekKey}`);
      return weekStats ? JSON.parse(weekStats) : null;
    } catch (error) {
      console.error('Failed to load weekly stats:', error);
      return null;
    }
  },

  getAllWeeks: async () => {
    try {
      const weeksKey = 'statsWeeks';
      const weeks = await AsyncStorage.getItem(weeksKey);
      return weeks ? JSON.parse(weeks) : [];
    } catch (error) {
      console.error('Failed to load weeks list:', error);
      return [];
    }
  },

  clearAllStats: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const statsKeys = keys.filter(key => 
        key.startsWith('dailyStats_') || 
        key.startsWith('weekStats_') ||
        key === 'userSettings' ||
        key === 'trophyProgress' ||
        key === 'statsWeeks'
      );
      await AsyncStorage.multiRemove(statsKeys);
      return true;
    } catch (error) {
      console.error('Failed to clear stats:', error);
      return false;
    }
  },

  exportData: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const result: Record<string, any> = {};
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          result[key] = JSON.parse(value);
        }
      }
      
      return JSON.stringify(result);
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  },

  importData: async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      await AsyncStorage.clear();
      
      for (const [key, value] of Object.entries(data)) {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  },

  loadTrophyProgress: async () => {
    try {
      const progress = await AsyncStorage.getItem('trophyProgress');
      if (!progress) {
        const defaultProgress = {
          '24h': { progress: 0, unlocked: false },
          'quick_start': { progress: 0, unlocked: false },
          'focused': { progress: 0, unlocked: false },
          'streak': { progress: 0, unlocked: false },
          'month': { progress: 0, unlocked: false },
          'master': { progress: 0, unlocked: false },
          'reduction': { progress: 0, unlocked: false },
          'champion': { progress: 0, unlocked: false }
        };
        await AsyncStorage.setItem('trophyProgress', JSON.stringify(defaultProgress));
        return defaultProgress;
      }
      return JSON.parse(progress);
    } catch (error) {
      console.error('Failed to load trophy progress:', error);
      return null;
    }
  },

  saveTrophyProgress: async (progress: any) => {
    try {
      await AsyncStorage.setItem('trophyProgress', JSON.stringify(progress));
      return true;
    } catch (error) {
      console.error('Failed to save trophy progress:', error);
      return false;
    }
  }
};

// Helper function to get the week key for a given date
function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(date.setDate(diff));
  return format(monday, 'yyyy-MM-dd');
}

// Database instance cache
let dbInstance: any = null;
let dbInitialized = false;

export const useDatabase = () => {
  const getDatabase = async () => {
    if (!dbInstance) {
      if (Platform.OS === 'web') {
        dbInstance = webDb;
      } else {
        try {
          // Dynamically import expo-sqlite and nativeDb
          const SQLite = await import('expo-sqlite');
          const { default: nativeDb } = await import('./nativeDb');
          
          if (!SQLite) {
            console.warn('SQLite not available, falling back to web implementation');
            dbInstance = webDb;
          } else {
            dbInstance = nativeDb;
          }
        } catch (error) {
          console.error('Failed to load native database:', error);
          dbInstance = webDb;
        }
      }
    }

    if (!dbInitialized && dbInstance) {
      try {
        await dbInstance.initDatabase();
        dbInitialized = true;
      } catch (error) {
        console.error('Failed to initialize database:', error);
        // If native DB initialization fails, fall back to web implementation
        if (dbInstance !== webDb) {
          console.warn('Falling back to web implementation');
          dbInstance = webDb;
          await dbInstance.initDatabase();
          dbInitialized = true;
        }
      }
    }

    return dbInstance;
  };

  // Return a proxy that ensures the database is initialized before any method calls
  return new Proxy({} as any, {
    get: (target, prop) => {
      return async (...args: any[]) => {
        const db = await getDatabase();
        if (typeof db[prop] === 'function') {
          return db[prop](...args);
        }
        throw new Error(`Method ${String(prop)} not found in database implementation`);
      };
    }
  });
};

export { useDatabase };