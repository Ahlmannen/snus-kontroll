import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { emitSettingsUpdate } from './useSettingsSync';
import { format } from 'date-fns';

// Använd .db3 filändelse för bättre iOS-kompatibilitet
const DB_NAME = Platform.OS === 'ios' ? 'snuskontroll.db3' : 'snuskontroll.db';
let db: SQLite.WebSQLDatabase | null = null;

// Förbättrad felhantering för SQLite-operationer
const executeQuery = async (query: string, params: any[] = []): Promise<any> => {
  if (!db) {
    db = SQLite.openDatabase(DB_NAME);
  }

  return new Promise((resolve, reject) => {
    try {
      db!.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, result) => resolve(result),
          (_, error) => {
            console.error('SQL Error:', error);
            reject(error);
            return false;
          }
        );
      }, 
      (error) => {
        console.error('Transaction Error:', error);
        reject(error);
      },
      () => {
        // Transaction completed successfully
      });
    } catch (error) {
      console.error('Unexpected database error:', error);
      reject(error);
    }
  });
};

const nativeDb = {
  initDatabase: async () => {
    try {
      if (!db) {
        db = SQLite.openDatabase(DB_NAME);
      }

      // Skapa tabeller i en enda transaktion
      await new Promise<void>((resolve, reject) => {
        db!.transaction(
          tx => {
            // Settings table
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE,
                value TEXT
              );`,
              [],
              undefined,
              (_, error) => {
                console.error('Error creating settings table:', error);
                return false;
              }
            );

            // Daily stats table med DATETIME för bättre iOS-kompatibilitet
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS daily_stats (
                date TEXT PRIMARY KEY,
                count INTEGER DEFAULT 0,
                limit INTEGER DEFAULT 10,
                longest_pause INTEGER DEFAULT 0,
                current_snus_start INTEGER,
                last_snus_end INTEGER,
                next_allowed INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );`,
              [],
              undefined,
              (_, error) => {
                console.error('Error creating daily_stats table:', error);
                return false;
              }
            );

            // Trophy progress table
            tx.executeSql(
              `CREATE TABLE IF NOT EXISTS trophy_progress (
                id TEXT PRIMARY KEY,
                progress REAL DEFAULT 0,
                unlocked INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
              );`,
              [],
              undefined,
              (_, error) => {
                console.error('Error creating trophy_progress table:', error);
                return false;
              }
            );

            // Trigger för att uppdatera updated_at
            tx.executeSql(
              `CREATE TRIGGER IF NOT EXISTS update_daily_stats_timestamp 
               AFTER UPDATE ON daily_stats
               BEGIN
                 UPDATE daily_stats SET updated_at = CURRENT_TIMESTAMP WHERE date = NEW.date;
               END;`,
              []
            );

            tx.executeSql(
              `CREATE TRIGGER IF NOT EXISTS update_trophy_progress_timestamp 
               AFTER UPDATE ON trophy_progress
               BEGIN
                 UPDATE trophy_progress SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
               END;`,
              []
            );
          },
          error => {
            console.error('Transaction error:', error);
            reject(error);
          },
          () => resolve()
        );
      });

      // Kontrollera och initiera standardinställningar
      const settings = await nativeDb.loadSettings();
      if (!settings) {
        await nativeDb.saveSettings({
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
      await executeQuery(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['userSettings', JSON.stringify(settings)]
      );
      emitSettingsUpdate();
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  },

  loadSettings: async () => {
    try {
      const result = await executeQuery(
        'SELECT value FROM settings WHERE key = ?',
        ['userSettings']
      );
      if (result.rows.length > 0) {
        return JSON.parse(result.rows.item(0).value);
      }
      return null;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return null;
    }
  },

  saveDailyStats: async (stats: any) => {
    try {
      const settings = await nativeDb.loadSettings();
      const updatedStats = {
        ...stats,
        limit: settings?.dailyIntake || 10
      };

      await executeQuery(
        `INSERT OR REPLACE INTO daily_stats (
          date, count, limit, longest_pause, current_snus_start, last_snus_end, next_allowed
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          stats.date,
          updatedStats.count,
          updatedStats.limit,
          updatedStats.longestPause,
          updatedStats.currentSnusStartTime,
          updatedStats.lastSnusEndTime,
          updatedStats.nextAllowed
        ]
      );
      return true;
    } catch (error) {
      console.error('Failed to save daily stats:', error);
      return false;
    }
  },

  loadDailyStats: async (date: string) => {
    try {
      const result = await executeQuery(
        'SELECT * FROM daily_stats WHERE date = ?',
        [date]
      );
      if (result.rows.length > 0) {
        const item = result.rows.item(0);
        return {
          date: item.date,
          count: item.count,
          limit: item.limit,
          longestPause: item.longest_pause,
          currentSnusStartTime: item.current_snus_start,
          lastSnusEndTime: item.last_snus_end,
          nextAllowed: item.next_allowed
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
      const startDate = new Date(weekKey);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      const result = await executeQuery(
        'SELECT * FROM daily_stats WHERE date BETWEEN ? AND ? ORDER BY date',
        [format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')]
      );

      const stats: { [key: string]: any } = {};
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        stats[row.date] = {
          count: row.count,
          limit: row.limit,
          longestPause: row.longest_pause,
          currentSnusStartTime: row.current_snus_start,
          lastSnusEndTime: row.last_snus_end,
          nextAllowed: row.next_allowed
        };
      }
      return stats;
    } catch (error) {
      console.error('Failed to load weekly stats:', error);
      return null;
    }
  },

  getAllWeeks: async () => {
    try {
      const result = await executeQuery(
        'SELECT DISTINCT date FROM daily_stats ORDER BY date',
        []
      );
      const weeks = new Set<string>();
      for (let i = 0; i < result.rows.length; i++) {
        const date = new Date(result.rows.item(i).date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay() + 1);
        weeks.add(format(weekStart, 'yyyy-MM-dd'));
      }
      return Array.from(weeks);
    } catch (error) {
      console.error('Failed to load weeks:', error);
      return [];
    }
  },

  clearAllStats: async () => {
    try {
      // Använd en transaktion för att säkerställa att allt raderas eller inget
      await new Promise<void>((resolve, reject) => {
        db!.transaction(
          tx => {
            tx.executeSql('DELETE FROM daily_stats');
            tx.executeSql('DELETE FROM settings');
            tx.executeSql('DELETE FROM trophy_progress');
          },
          error => {
            console.error('Transaction error:', error);
            reject(error);
          },
          () => resolve()
        );
      });
      return true;
    } catch (error) {
      console.error('Failed to clear stats:', error);
      return false;
    }
  },

  exportData: async () => {
    try {
      const [settings, dailyStats, trophyProgress] = await Promise.all([
        nativeDb.loadSettings(),
        executeQuery('SELECT * FROM daily_stats ORDER BY date'),
        executeQuery('SELECT * FROM trophy_progress')
      ]);

      const formatRows = (result: any) => {
        const rows = [];
        for (let i = 0; i < result.rows.length; i++) {
          rows.push(result.rows.item(i));
        }
        return rows;
      };

      return JSON.stringify({
        settings,
        dailyStats: formatRows(dailyStats),
        trophyProgress: formatRows(trophyProgress)
      });
    } catch (error) {
      console.error('Failed to export data:', error);
      return null;
    }
  },

  importData: async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      
      // Använd en transaktion för att säkerställa att allt importeras eller inget
      await new Promise<void>((resolve, reject) => {
        db!.transaction(
          tx => {
            // Rensa existerande data
            tx.executeSql('DELETE FROM daily_stats');
            tx.executeSql('DELETE FROM settings');
            tx.executeSql('DELETE FROM trophy_progress');

            // Importera ny data
            if (data.settings) {
              tx.executeSql(
                'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                ['userSettings', JSON.stringify(data.settings)]
              );
            }

            if (data.dailyStats) {
              for (const stat of data.dailyStats) {
                tx.executeSql(
                  `INSERT OR REPLACE INTO daily_stats (
                    date, count, limit, longest_pause, current_snus_start, last_snus_end, next_allowed
                  ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [
                    stat.date,
                    stat.count,
                    stat.limit,
                    stat.longest_pause,
                    stat.current_snus_start,
                    stat.last_snus_end,
                    stat.next_allowed
                  ]
                );
              }
            }

            if (data.trophyProgress) {
              for (const trophy of data.trophyProgress) {
                tx.executeSql(
                  'INSERT OR REPLACE INTO trophy_progress (id, progress, unlocked) VALUES (?, ?, ?)',
                  [trophy.id, trophy.progress, trophy.unlocked]
                );
              }
            }
          },
          error => {
            console.error('Transaction error:', error);
            reject(error);
          },
          () => resolve()
        );
      });

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  },

  loadTrophyProgress: async () => {
    try {
      const result = await executeQuery('SELECT * FROM trophy_progress');
      const progress: { [key: string]: any } = {};
      
      for (let i = 0; i < result.rows.length; i++) {
        const row = result.rows.item(i);
        progress[row.id] = {
          progress: row.progress,
          unlocked: Boolean(row.unlocked)
        };
      }

      if (Object.keys(progress).length === 0) {
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

        await nativeDb.saveTrophyProgress(defaultProgress);
        return defaultProgress;
      }

      return progress;
    } catch (error) {
      console.error('Failed to load trophy progress:', error);
      return null;
    }
  },

  saveTrophyProgress: async (progress: any) => {
    try {
      // Använd en transaktion för att spara alla troféer
      await new Promise<void>((resolve, reject) => {
        db!.transaction(
          tx => {
            for (const [id, data] of Object.entries(progress)) {
              tx.executeSql(
                'INSERT OR REPLACE INTO trophy_progress (id, progress, unlocked) VALUES (?, ?, ?)',
                [id, (data as any).progress, (data as any).unlocked ? 1 : 0]
              );
            }
          },
          error => {
            console.error('Transaction error:', error);
            reject(error);
          },
          () => resolve()
        );
      });
      return true;
    } catch (error) {
      console.error('Failed to save trophy progress:', error);
      return false;
    }
  }
};

export default nativeDb;