import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBackup } from './useBackup';

const LAST_BACKUP_KEY = 'lastAutoBackup';
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export const useAutoBackup = () => {
  const { createBackup } = useBackup();

  useEffect(() => {
    checkAndCreateBackup();
  }, []);

  const checkAndCreateBackup = async () => {
    try {
      const lastBackup = await AsyncStorage.getItem(LAST_BACKUP_KEY);
      const lastBackupTime = lastBackup ? parseInt(lastBackup) : 0;
      const now = Date.now();

      if (now - lastBackupTime >= BACKUP_INTERVAL) {
        const backupFile = await createBackup();
        if (backupFile) {
          await AsyncStorage.setItem(LAST_BACKUP_KEY, now.toString());
        }
      }
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  };
};