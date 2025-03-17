import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LZString from 'lz-string';
import { useDatabase } from './useDatabase';

const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_BACKUPS = 7; // Keep a week of backups

export const useBackup = () => {
  const db = useDatabase();

  const createBackup = async () => {
    try {
      if (Platform.OS === 'web') return null;

      // Export data
      const data = await db.exportData();
      if (!data) throw new Error('No data to backup');

      // Compress data
      const compressed = LZString.compressToUTF16(data);

      // For web, we'll just store in AsyncStorage
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const key = `backup-${timestamp}`;
      await AsyncStorage.setItem(key, compressed);

      // Clean old backups
      await cleanOldBackups();

      return key;
    } catch (error) {
      console.error('Backup creation failed:', error);
      return null;
    }
  };

  const restoreBackup = async (key: string) => {
    try {
      if (Platform.OS === 'web') {
        const compressed = await AsyncStorage.getItem(key);
        if (!compressed) throw new Error('Backup not found');
        
        // Decompress data
        const data = LZString.decompressFromUTF16(compressed);
        if (!data) throw new Error('Invalid backup data');

        // Import data
        return await db.importData(data);
      }
      return false;
    } catch (error) {
      console.error('Backup restoration failed:', error);
      return false;
    }
  };

  const listBackups = async () => {
    try {
      if (Platform.OS === 'web') {
        const keys = await AsyncStorage.getAllKeys();
        return keys
          .filter(key => key.startsWith('backup-'))
          .sort()
          .reverse();
      }
      return [];
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  };

  const cleanOldBackups = async () => {
    try {
      if (Platform.OS === 'web') {
        const files = await listBackups();
        
        // Keep only the most recent backups
        const filesToDelete = files.slice(MAX_BACKUPS);
        
        for (const file of filesToDelete) {
          await AsyncStorage.removeItem(file);
        }
      }
    } catch (error) {
      console.error('Failed to clean old backups:', error);
    }
  };

  return {
    createBackup,
    restoreBackup,
    listBackups,
  };
};