import AsyncStorage from '@react-native-async-storage/async-storage';

const CURRENT_VERSION = 2;
const VERSION_KEY = 'dbVersion';

export const useMigrations = () => {
  const getCurrentVersion = async () => {
    try {
      const version = await AsyncStorage.getItem(VERSION_KEY);
      return version ? parseInt(version) : 0;
    } catch (error) {
      console.error('Failed to get current version:', error);
      return 0;
    }
  };

  const setCurrentVersion = async (version: number) => {
    try {
      await AsyncStorage.setItem(VERSION_KEY, version.toString());
    } catch (error) {
      console.error('Failed to set current version:', error);
    }
  };

  const runMigrations = async () => {
    const currentVersion = await getCurrentVersion();
    if (currentVersion >= CURRENT_VERSION) return;

    try {
      // Run web migrations
      if (currentVersion < 1) {
        const settings = await AsyncStorage.getItem('userSettings');
        if (settings) {
          const parsed = JSON.parse(settings);
          await AsyncStorage.setItem('userSettings', JSON.stringify(parsed));
        }
      }

      await setCurrentVersion(CURRENT_VERSION);
    } catch (error) {
      console.error('Migration failed:', error);
    }
  };

  return {
    runMigrations
  };
};