import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings as SettingsIcon, Timer, Clock3, Package2, DollarSign, Zap, Goal, TrendingDown, TriangleAlert as AlertTriangle, Clock, Check, Sun, Moon, Bell } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettings } from '@/hooks/useSettings';
import { useTheme, lightTheme, darkTheme } from '@/hooks/useTheme';
import { useNotifications, NotificationSettings } from '@/hooks/useNotifications';
import { UserSettings } from '@/types/settings';

const goalLabels: Record<string, string> = {
  'quit': 'Sluta med snus',
  'reduce': 'Minska snusning',
  'track': 'Hålla statistik'
};

const paceLabels: Record<string, string> = {
  'fast': 'Snabb',
  'medium': 'Mellan',
  'slow': 'Långsam'
};

export default function SettingsScreen() {
  const { theme, setTheme } = useTheme();
  const currentTheme = theme === 'light' ? lightTheme : darkTheme;
  const { loadNotificationSettings, saveNotificationSettings } = useNotifications();
  
  const defaultSettings: UserSettings = {
    portionsPerCan: 24,
    goal: 'reduce',
    pace: 'medium',
    dailyIntake: 10,
    costPerCan: 50,
    snusTime: 30,
    waitTime: 30,
    nicotineContent: 8.0,
  };

  const {
    settings,
    error: settingsError,
    updateSetting,
    updateMultipleSettings
  } = useSettings(defaultSettings);
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [isResetting, setIsResetting] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    timerEnd: true,
    overtime: true,
    overtimeReminder: true,
    longestPause: true,
    achievements: true,
  });

  useEffect(() => {
    loadSettings();
    loadNotificationPreferences();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        updateMultipleSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const loadNotificationPreferences = async () => {
    const preferences = await loadNotificationSettings();
    setNotificationSettings(preferences);
  };

  const handleSaveValue = async (key: keyof UserSettings) => {
    let value: any;
    
    if (key === 'nicotineContent') {
      const normalizedValue = tempValue.replace(',', '.');
      value = parseFloat(normalizedValue);
    } else if (typeof settings[key] === 'number') {
      value = parseInt(tempValue) || settings[key];
    } else {
      value = tempValue;
    }

    const success = await updateSetting(key, value);
    if (success) {
      setIsEditing(null);
      setTempValue('');
    }
  };

  const handleStartEditing = (key: keyof UserSettings, value: string | number) => {
    setIsEditing(key);
    if (key === 'nicotineContent') {
      setTempValue(value.toString().replace('.', ','));
    } else if (key === 'goal') {
      setTempValue(goalLabels[value as string] || value.toString());
    } else if (key === 'pace') {
      setTempValue(paceLabels[value as string] || value.toString());
    } else {
      setTempValue(String(value));
    }
  };

  const handleResetProgress = async () => {
    try {
      await AsyncStorage.clear();
      router.replace('/onboarding');
    } catch (error) {
      console.error('Failed to reset progress:', error);
    }
  };

  const toggleNotificationSetting = async (key: keyof NotificationSettings) => {
    const newSettings = {
      ...notificationSettings,
      [key]: !notificationSettings[key]
    };
    setNotificationSettings(newSettings);
    await saveNotificationSettings(newSettings);
  };

  const renderEditableField = (
    key: keyof UserSettings,
    icon: React.ReactNode,
    label: string,
    value: string | number,
    type: 'text' | 'number' | 'decimal' | 'select' = 'text',
    options?: { label: string; value: string }[]
  ) => {
    const isCurrentlyEditing = isEditing === key;

    const handleTextChange = (text: string) => {
      if (type === 'decimal') {
        const filtered = text.replace(/[^0-9,]/g, '');
        const parts = filtered.split(',');
        if (parts.length > 2) return;
        if (parts[1]?.length > 1) return;
        setTempValue(filtered);
      } else if (type === 'number') {
        const filtered = text.replace(/[^0-9]/g, '');
        setTempValue(filtered);
      } else {
        setTempValue(text);
      }
    };

    const formatValue = (val: string | number): string => {
      if (type === 'decimal' && typeof val === 'number') {
        return val.toString().replace('.', ',');
      }
      if (key === 'goal') {
        return goalLabels[val.toString()] || val.toString();
      }
      if (key === 'pace') {
        return paceLabels[val.toString()] || val.toString();
      }
      return val.toString();
    };

    return (
      <View style={styles.settingItem}>
        <View style={styles.settingHeader}>
          {icon}
          <Text style={[styles.settingLabel, { color: currentTheme.colors.textSecondary }]}>
            {label}
          </Text>
        </View>
        
        {isCurrentlyEditing ? (
          <View style={styles.editContainer}>
            {type === 'select' && options ? (
              <View style={styles.optionsContainer}>
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      {
                        backgroundColor: currentTheme.colors.progressInner,
                        borderColor: currentTheme.colors.cardBorder
                      },
                      settings[key] === option.value && styles.selectedOption,
                    ]}
                    onPress={() => updateSetting(key, option.value as any)}
                  >
                    <Text style={[
                      styles.optionText,
                      { color: currentTheme.colors.text },
                      settings[key] === option.value && styles.selectedOptionText,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: currentTheme.colors.progressInner,
                      borderColor: currentTheme.colors.primary,
                      color: currentTheme.colors.text
                    }
                  ]}
                  value={tempValue}
                  keyboardType={type === 'decimal' ? 'decimal-pad' : type === 'number' ? 'numeric' : 'default'}
                  onChangeText={handleTextChange}
                  autoFocus
                  placeholderTextColor={currentTheme.colors.textSecondary}
                />
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => handleSaveValue(key)}
                >
                  <Check size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.valueContainer,
              {
                backgroundColor: currentTheme.colors.progressInner,
                borderColor: currentTheme.colors.cardBorder
              }
            ]}
            onPress={() => handleStartEditing(key, value)}
          >
            <Text style={[styles.value, { color: currentTheme.colors.text }]}>
              {type === 'decimal'
                ? `${formatValue(value)} mg`
                : type === 'number'
                ? key === 'costPerCan'
                  ? `${value} kr`
                  : key === 'snusTime' || key === 'waitTime'
                  ? `${value} min`
                  : value
                : formatValue(value)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderNotificationOption = (
    key: keyof NotificationSettings,
    title: string,
    description: string
  ) => (
    <TouchableOpacity
      style={[
        styles.notificationOption,
        {
          backgroundColor: currentTheme.colors.progressInner,
          borderColor: currentTheme.colors.cardBorder
        }
      ]}
      onPress={() => toggleNotificationSetting(key)}
    >
      <View style={styles.notificationOptionContent}>
        <Text style={[styles.notificationOptionTitle, { color: currentTheme.colors.text }]}>
          {title}
        </Text>
        <Text style={[styles.notificationOptionDescription, { color: currentTheme.colors.textSecondary }]}>
          {description}
        </Text>
      </View>
      <View style={[
        styles.checkbox,
        {
          borderColor: notificationSettings[key] ? currentTheme.colors.primary : currentTheme.colors.cardBorder,
          backgroundColor: notificationSettings[key] ? currentTheme.colors.primary : 'transparent'
        }
      ]}>
        {notificationSettings[key] && <Check size={16} color="#fff" />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={currentTheme.colors.background}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.header}>
          <SettingsIcon size={32} color={currentTheme.colors.text} />
          <Text style={[styles.title, { color: currentTheme.colors.text }]}>Inställningar</Text>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Utseende</Text>
          <TouchableOpacity
            style={[
              styles.themeToggle,
              {
                backgroundColor: currentTheme.colors.progressInner,
                borderColor: currentTheme.colors.cardBorder
              }
            ]}
            onPress={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            {theme === 'light' ? (
              <Sun size={24} color={currentTheme.colors.text} />
            ) : (
              <Moon size={24} color={currentTheme.colors.text} />
            )}
            <Text style={[styles.themeToggleText, { color: currentTheme.colors.text }]}>
              {theme === 'light' ? 'Ljust tema' : 'Mörkt tema'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Grundinställningar</Text>
          {renderEditableField('portionsPerCan', <Package2 size={24} color={currentTheme.colors.primary} />, 'Portioner per dosa', settings.portionsPerCan, 'number')}
          {renderEditableField('dailyIntake', <TrendingDown size={24} color={currentTheme.colors.success} />, 'Daglig gräns', settings.dailyIntake, 'number')}
          {renderEditableField('goal', <Goal size={24} color={currentTheme.colors.warning} />, 'Mål', settings.goal, 'select', [
            { label: 'Sluta med snus', value: 'quit' },
            { label: 'Minska snusning', value: 'reduce' },
            { label: 'Hålla statistik', value: 'track' }
          ])}
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Tidshantering</Text>
          {renderEditableField('snusTime', <Timer size={24} color="#ea580c" />, 'Snustid (minuter)', settings.snusTime, 'number')}
          {renderEditableField('waitTime', <Clock size={24} color="#7c3aed" />, 'Väntetid mellan portioner (minuter)', settings.waitTime, 'number')}
          {settings.goal !== 'track' && renderEditableField('pace', <Clock3 size={24} color="#0891b2" />, 'Minskningstakt', settings.pace, 'select', [
            { label: 'Snabb', value: 'fast' },
            { label: 'Mellan', value: 'medium' },
            { label: 'Långsam', value: 'slow' }
          ])}
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Kostnader & Innehåll</Text>
          {renderEditableField('costPerCan', <DollarSign size={24} color="#059669" />, 'Kostnad per dosa', settings.costPerCan, 'number')}
          {renderEditableField('nicotineContent', <Zap size={24} color="#7c3aed" />, 'Nikotinhalt per portion', settings.nicotineContent, 'decimal')}
        </View>

        <View style={[styles.section, { backgroundColor: currentTheme.colors.card, borderColor: currentTheme.colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Notiser</Text>
          <View style={styles.notificationSettings}>
            {renderNotificationOption(
              'timerEnd',
              'Timer slut',
              'När det är dags att spotta ut snusen'
            )}
            {renderNotificationOption(
              'overtime',
              'Övertid',
              'När du har snusen inne längre än rekommenderat'
            )}
            {renderNotificationOption(
              'overtimeReminder',
              'Övertidspåminnelse',
              '30 minuter efter övertid börjat'
            )}
            {renderNotificationOption(
              'longestPause',
              'Längsta paus',
              'När du slår ditt rekord för längsta paus'
            )}
            {renderNotificationOption(
              'achievements',
              'Prestationer',
              'När du uppnår mål och utmaningar'
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={handleResetProgress}
          activeOpacity={0.8}
        >
          <AlertTriangle size={24} color="#fff" />
          <Text style={styles.resetButtonText}>Återställ framsteg</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: currentTheme.colors.textSecondary }]}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 100 : 80,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    marginBottom: 16,
  },
  settingItem: {
    marginBottom: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  settingLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  valueContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  value: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  editContainer: {
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#2563eb',
    width: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedOption: {
    borderColor: '#2563eb',
    backgroundColor: '#1e40af',
  },
  optionText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#fff',
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  themeToggleText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  resetButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  resetButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#fff',
  },
  version: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  notificationSettings: {
    gap: 12,
  },
  notificationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  notificationOptionContent: {
    flex: 1,
    marginRight: 16,
  },
  notificationOptionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginBottom: 4,
  },
  notificationOptionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  }
});