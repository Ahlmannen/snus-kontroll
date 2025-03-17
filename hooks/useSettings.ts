import { useState, useCallback } from 'react';
import { UserSettings } from '@/types/settings';
import { useValidation } from './useValidation';
import { emitSettingsUpdate } from './useSettingsSync';
import { useDatabase } from './useDatabase';

export const useSettings = (initialSettings: UserSettings) => {
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const { validateField } = useValidation();
  const { saveSettings, loadSettings } = useDatabase();

  const updateSetting = useCallback(async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setError(null);

    // Validera det nya värdet
    const validationError = validateField(key, value);
    if (validationError) {
      setError(validationError);
      return false;
    }

    try {
      // Uppdatera state med prev för att garantera senaste värdet
      const newSettings = (prev: UserSettings) => ({
        ...prev,
        [key]: value
      });

      const updatedSettings = newSettings(settings);
      setSettings(updatedSettings);

      // Spara till databasen
      await saveSettings(updatedSettings);
      
      // Meddela andra komponenter om uppdateringen
      emitSettingsUpdate();
      
      return true;
    } catch (error) {
      console.error('Fel vid uppdatering av inställning:', error);
      setError('Kunde inte spara inställningen');
      return false;
    }
  }, [settings, validateField, saveSettings]);

  const updateMultipleSettings = useCallback(async (
    updates: Partial<UserSettings>
  ) => {
    setError(null);

    try {
      // Validera alla nya värden
      for (const [key, value] of Object.entries(updates)) {
        const validationError = validateField(key as keyof UserSettings, value);
        if (validationError) {
          setError(validationError);
          return false;
        }
      }

      // Uppdatera state med prev för att garantera senaste värdet
      const newSettings = (prev: UserSettings) => ({
        ...prev,
        ...updates
      });

      const updatedSettings = newSettings(settings);
      setSettings(updatedSettings);

      // Spara till databasen
      await saveSettings(updatedSettings);
      
      // Meddela andra komponenter om uppdateringen
      emitSettingsUpdate();
      
      return true;
    } catch (error) {
      console.error('Fel vid uppdatering av inställningar:', error);
      setError('Kunde inte spara inställningarna');
      return false;
    }
  }, [settings, validateField, saveSettings]);

  const loadStoredSettings = useCallback(async () => {
    try {
      const storedSettings = await loadSettings();
      if (storedSettings) {
        setSettings(storedSettings);
      }
    } catch (error) {
      console.error('Fel vid laddning av inställningar:', error);
      setError('Kunde inte ladda inställningarna');
    }
  }, [loadSettings]);

  return {
    settings,
    error,
    updateSetting,
    updateMultipleSettings,
    loadStoredSettings
  };
};