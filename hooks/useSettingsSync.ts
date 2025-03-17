import { useEffect, useCallback } from 'react';
import EventEmitter from 'eventemitter3';
import { useDatabase } from './useDatabase';

const settingsEmitter = new EventEmitter();
const SETTINGS_UPDATED = 'settings_updated';

export function emitSettingsUpdate() {
  settingsEmitter.emit(SETTINGS_UPDATED);
}

export function useSettingsSync(onUpdate?: () => void) {
  const { loadSettings } = useDatabase();

  const refreshSettings = useCallback(async () => {
    try {
      if (onUpdate) {
        onUpdate();
      } else {
        // Om ingen callback tillhandahålls, ladda om inställningarna direkt
        await loadSettings();
      }
    } catch (error) {
      console.error('Failed to refresh settings:', error);
    }
  }, [loadSettings, onUpdate]);

  useEffect(() => {
    settingsEmitter.on(SETTINGS_UPDATED, refreshSettings);
    return () => {
      settingsEmitter.off(SETTINGS_UPDATED, refreshSettings);
    };
  }, [refreshSettings]);

  return {
    refreshSettings
  };
}