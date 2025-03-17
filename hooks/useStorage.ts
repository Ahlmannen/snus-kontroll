import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Current app data version - increment when data structure changes
const STORAGE_VERSION = 1;

interface StorageData {
  version: number;
  dailyStats: any;
  userSettings: any;
  trophyProgress: any;
  savingsData: any;
}

export const useStorage = () => {
  const validateData = (data: any): boolean => {
    if (!data) return false;
    if (typeof data !== 'object') return false;
    if (!('version' in data)) return false;
    return true;
  };

  const saveData = async (key: string, data: any) => {
    try {
      const storageData: StorageData = {
        version: STORAGE_VERSION,
        ...data
      };
      await AsyncStorage.setItem(key, JSON.stringify(storageData));
      return true;
    } catch (error) {
      console.error('Error saving data:', error);
      return false;
    }
  };

  const loadData = async (key: string) => {
    try {
      const data = await AsyncStorage.getItem(key);
      if (!data) return null;

      const parsedData = JSON.parse(data);
      if (!validateData(parsedData)) {
        console.warn('Invalid data structure detected');
        return null;
      }

      // Handle version migrations here if needed
      if (parsedData.version < STORAGE_VERSION) {
        // Implement migration logic
        console.log('Data migration needed');
      }

      return parsedData;
    } catch (error) {
      console.error('Error loading data:', error);
      return null;
    }
  };

  const exportData = async (): Promise<string | null> => {
    try {
      const keys = ['dailyStats', 'userSettings', 'trophyProgress', 'savingsData'];
      const data: Record<string, any> = {};
      
      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          data[key] = JSON.parse(value);
        }
      }

      return JSON.stringify({
        version: STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        data
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  };

  const importData = async (jsonData: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonData);
      if (!validateData(data)) {
        throw new Error('Invalid backup data');
      }

      // Clear existing data
      await AsyncStorage.multiRemove(['dailyStats', 'userSettings', 'trophyProgress', 'savingsData']);

      // Import new data
      for (const [key, value] of Object.entries(data.data)) {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      }

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  };

  return {
    saveData,
    loadData,
    exportData,
    importData
  };
};