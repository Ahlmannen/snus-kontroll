import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package2, Goal, Clock3, TrendingDown, DollarSign, Timer, Zap, ArrowRight, ArrowLeft, Clock, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, lightTheme, darkTheme } from '@/hooks/useTheme';
import { useDatabase } from '@/hooks/useDatabase';

type Goal = 'quit' | 'reduce' | 'track';
type Pace = 'fast' | 'medium' | 'slow';
type SetupType = 'quick' | 'detailed';

interface UserSettings {
  portionsPerCan: number;
  goal: Goal;
  pace: Pace;
  dailyIntake: number;
  targetDailyIntake?: number;
  costPerCan: number;
  snusTime: number;
  targetSnusTime?: number;
  waitTime: number;
  targetWaitTime?: number;
  nicotineContent: number;
}

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

export default function SetupScreen() {
  const { theme } = useTheme();
  const currentTheme = theme === 'light' ? lightTheme : darkTheme;
  const { saveSettings } = useDatabase();
  
  const [setupType, setSetupType] = useState<SetupType | null>(null);
  const [step, setStep] = useState(1);
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const validateNumber = (value: string, min: number = 0): boolean => {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min;
  };

  const saveAndContinue = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setError(null);

    try {
      const numericFields: Array<keyof UserSettings> = [
        'portionsPerCan',
        'dailyIntake',
        'costPerCan',
        'snusTime',
        'waitTime',
        'nicotineContent'
      ];

      for (const field of numericFields) {
        if (!validateNumber(String(settings[field]), 0)) {
          throw new Error(`Ogiltigt värde för ${field}`);
        }
      }

      if (settings.goal === 'reduce') {
        if (settings.targetDailyIntake && settings.targetDailyIntake >= settings.dailyIntake) {
          throw new Error('Målvärdet för daglig konsumtion måste vara lägre än nuvarande');
        }
        if (settings.targetWaitTime && settings.targetWaitTime <= settings.waitTime) {
          throw new Error('Målvärdet för väntetid måste vara högre än nuvarande');
        }
      }

      await saveSettings({
        ...settings,
        onboardingComplete: true
      });

      router.replace('/(tabs)');
    } catch (error) {
      console.error('Fel vid sparande av inställningar:', error);
      setError(error instanceof Error ? error.message : 'Ett fel uppstod när inställningarna skulle sparas');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    setError(null);

    if (setupType === 'quick') {
      switch (step) {
        case 2:
          if (!validateNumber(settings.dailyIntake.toString(), 1)) {
            setError('Ange ett giltigt antal (minst 1)');
            return;
          }
          break;
        case 3:
          if (!validateNumber(settings.costPerCan.toString(), 1)) {
            setError('Ange ett giltigt pris (minst 1 kr)');
            return;
          }
          break;
      }
    } else if (setupType === 'detailed') {
      switch (step) {
        case 2:
          if (settings.goal !== 'track' && !settings.pace) {
            setError('Välj en minskningstakt');
            return;
          }
          break;
        case 3:
          if (!validateNumber(settings.portionsPerCan.toString(), 1)) {
            setError('Ange ett giltigt antal (minst 1)');
            return;
          }
          break;
        case 4:
          if (!validateNumber(settings.costPerCan.toString(), 1)) {
            setError('Ange ett giltigt pris (minst 1 kr)');
            return;
          }
          break;
        case 5:
          if (!validateNumber(settings.dailyIntake.toString(), 1)) {
            setError('Ange ett giltigt antal (minst 1)');
            return;
          }
          if (settings.goal === 'reduce' && !validateNumber(settings.targetDailyIntake?.toString() || '', 1)) {
            setError('Ange ett giltigt målvärde (minst 1)');
            return;
          }
          break;
        case 6:
          if (!validateNumber(settings.snusTime.toString(), 1)) {
            setError('Ange en giltig tid (minst 1 minut)');
            return;
          }
          if (settings.goal === 'reduce' && !validateNumber(settings.targetSnusTime?.toString() || '', 1)) {
            setError('Ange en giltig måltid (minst 1 minut)');
            return;
          }
          break;
        case 7:
          if (!validateNumber(settings.waitTime.toString(), 1)) {
            setError('Ange en giltig tid (minst 1 minut)');
            return;
          }
          if (settings.goal === 'reduce' && !validateNumber(settings.targetWaitTime?.toString() || '', 1)) {
            setError('Ange en giltig måltid (minst 1 minut)');
            return;
          }
          break;
        case 8:
          if (!validateNumber(settings.nicotineContent.toString(), 0)) {
            setError('Ange ett giltigt nikotininnehåll');
            return;
          }
          break;
      }
    }

    const maxSteps = setupType === 'quick' ? 4 : 
      settings.goal === 'track' ? 7 : 8;
    
    if (settings.goal === 'track' && step === 2) {
      setStep(step + 2);
    } else if (step < maxSteps) {
      setStep(step + 1);
    } else {
      await saveAndContinue();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      if (settings.goal === 'track' && step === 4) {
        setStep(2);
      } else {
        setStep(step - 1);
      }
      setError(null);
    } else if (setupType) {
      setSetupType(null);
      setError(null);
    }
  };

  const renderSetupTypeSelection = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.question, { color: currentTheme.colors.text }]}>
        Vill du komma igång snabbt eller anpassa allt för noggrann statistik?
      </Text>
      <TouchableOpacity
        style={[styles.option, { 
          backgroundColor: currentTheme.colors.card,
          borderColor: currentTheme.colors.cardBorder
        }]}
        onPress={() => {
          setSetupType('quick');
          setStep(1);
        }}
      >
        <Text style={[styles.optionText, { color: currentTheme.colors.text }]}>
          Snabbstart
        </Text>
        <Text style={[styles.optionDescription, { color: currentTheme.colors.textSecondary }]}>
          Generiska värden används för att starta direkt
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.option, { 
          backgroundColor: currentTheme.colors.card,
          borderColor: currentTheme.colors.cardBorder
        }]}
        onPress={() => {
          setSetupType('detailed');
          setStep(1);
        }}
      >
        <Text style={[styles.optionText, { color: currentTheme.colors.text }]}>
          Noggrann inställning
        </Text>
        <Text style={[styles.optionDescription, { color: currentTheme.colors.textSecondary }]}>
          Anpassa alla detaljer för exakt statistik
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderQuickSetup = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme.colors.primary }]}>
              <Goal size={32} color="#fff" />
            </View>
            <Text style={[styles.question, { color: currentTheme.colors.text }]}>Vad är ditt mål?</Text>
            <TouchableOpacity
              style={[
                styles.option,
                { 
                  backgroundColor: currentTheme.colors.card,
                  borderColor: currentTheme.colors.cardBorder
                },
                settings.goal === 'quit' && {
                  borderColor: currentTheme.colors.primary,
                  backgroundColor: currentTheme.colors.progressInner
                }
              ]}
              onPress={() => setSettings({ ...settings, goal: 'quit' })}
            >
              <Text style={[styles.optionText, { color: currentTheme.colors.text }]}>Sluta snusa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.option,
                { 
                  backgroundColor: currentTheme.colors.card,
                  borderColor: currentTheme.colors.cardBorder
                },
                settings.goal === 'reduce' && {
                  borderColor: currentTheme.colors.primary,
                  backgroundColor: currentTheme.colors.progressInner
                }
              ]}
              onPress={() => setSettings({ ...settings, goal: 'reduce' })}
            >
              <Text style={[styles.optionText, { color: currentTheme.colors.text }]}>Minska snusning</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.option,
                { 
                  backgroundColor: currentTheme.colors.card,
                  borderColor: currentTheme.colors.cardBorder
                },
                settings.goal === 'track' && {
                  borderColor: currentTheme.colors.primary,
                  backgroundColor: currentTheme.colors.progressInner
                }
              ]}
              onPress={() => setSettings({ ...settings, goal: 'track' })}
            >
              <Text style={[styles.optionText, { color: currentTheme.colors.text }]}>Hålla statistik</Text>
            </TouchableOpacity>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme.colors.primary }]}>
              <TrendingDown size={32} color="#fff" />
            </View>
            <Text style={[styles.question, { color: currentTheme.colors.text }]}>
              Hur ofta snusar du nu?
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: currentTheme.colors.card,
                borderColor: error ? currentTheme.colors.error : currentTheme.colors.cardBorder,
                color: currentTheme.colors.text
              }]}
              keyboardType="numeric"
              value={settings.dailyIntake.toString()}
              onChangeText={(text) =>
                setSettings({ ...settings, dailyIntake: parseInt(text) || 0 })
              }
              placeholder="Antal portioner per dag"
              placeholderTextColor={currentTheme.colors.textSecondary}
            />
            {error && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>}
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme.colors.primary }]}>
              <DollarSign size={32} color="#fff" />
            </View>
            <Text style={[styles.question, { color: currentTheme.colors.text }]}>
              Vad kostar en dosa?
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: currentTheme.colors.card,
                borderColor: error ? currentTheme.colors.error : currentTheme.colors.cardBorder,
                color: currentTheme.colors.text
              }]}
              keyboardType="numeric"
              value={settings.costPerCan.toString()}
              onChangeText={(text) =>
                setSettings({ ...settings, costPerCan: parseInt(text) || 0 })
              }
              placeholder="Pris i kronor"
              placeholderTextColor={currentTheme.colors.textSecondary}
            />
            {error && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>}
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme.colors.success }]}>
              <Check size={32} color="#fff" />
            </View>
            <Text style={[styles.question, { color: currentTheme.colors.text }]}>
              Bra, nu är vi igång!
            </Text>
            <Text style={[styles.description, { color: currentTheme.colors.textSecondary }]}>
              Du kan alltid justera dina inställningar senare.
            </Text>
          </View>
        );
    }
  };

  const renderDetailedSetup = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme.colors.primary }]}>
              <Goal size={32} color="#fff" />
            </View>
            <Text style={[styles.question, { color: currentTheme.colors.text }]}>Vad är ditt mål?</Text>
            <TouchableOpacity
              style={[
                styles.option,
                { 
                  backgroundColor: currentTheme.colors.card,
                  borderColor: currentTheme.colors.cardBorder
                },
                settings.goal === 'quit' && {
                  borderColor: currentTheme.colors.primary,
                  backgroundColor: currentTheme.colors.progressInner
                }
              ]}
              onPress={() => setSettings({ ...settings, goal: 'quit' })}
            >
              <Text style={[styles.optionText, { color: currentTheme.colors.text }]}>Sluta snusa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.option,
                { 
                  backgroundColor: currentTheme.colors.card,
                  borderColor: currentTheme.colors.cardBorder
                },
                settings.goal === 'reduce' && {
                  borderColor: currentTheme.colors.primary,
                  backgroundColor: currentTheme.colors.progressInner
                }
              ]}
              onPress={() => setSettings({ ...settings, goal: 'reduce' })}
            >
              <Text style={[styles.optionText, { color: currentTheme.colors.text }]}>Minska snusning</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.option,
                { 
                  backgroundColor: currentTheme.colors.card,
                  borderColor: currentTheme.colors.cardBorder
                },
                settings.goal === 'track' && {
                  borderColor: currentTheme.colors.primary,
                  backgroundColor: currentTheme.colors.progressInner
                }
              ]}
              onPress={() => setSettings({ ...settings, goal: 'track' })}
            >
              <Text style={[styles.optionText, { color: currentTheme.colors.text }]}>Hålla statistik</Text>
            </TouchableOpacity>
          </View>
        );
      case 2:
        if (settings.goal !== 'track') {
          return (
            <View style={styles.stepContainer}>
              <View style={[styles.iconContainer, { backgroundColor: currentTheme.colors.primary }]}>
                <Clock3 size={32} color="#fff" />
              </View>
              <Text style={[styles.question, { color: currentTheme.colors.text }]}>
                Välj minskningstakt
              </Text>
              <TouchableOpacity
                style={[
                  styles.option,
                  { 
                    backgroundColor: currentTheme.colors.card,
                    borderColor: currentTheme.colors.cardBorder
                  },
                  settings.pace === 'fast' && {
                    borderColor: currentTheme.colors.primary,
                    backgroundColor: currentTheme.colors.progressInner
                  }
                ]}
                onPress={() => setSettings({ ...settings, pace: 'fast' })}
              >
                <Text style={[styles.optionText, { color: currentTheme.colors.text }]}>Snabb</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.option,
                  { 
                    backgroundColor: currentTheme.colors.card,
                    borderColor: currentTheme.colors.cardBorder
                  },
                  settings.pace === 'medium' && {
                    borderColor: currentTheme.colors.primary,
                    backgroundColor: currentTheme.colors.progressInner
                  }
                ]}
                onPress={() => setSettings({ ...settings, pace: 'medium' })}
              >
                <Text style={[styles.optionText, { color: currentTheme.colors.text }]}>Mellan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.option,
                  { 
                    backgroundColor: currentTheme.colors.card,
                    borderColor: currentTheme.colors.cardBorder
                  },
                  settings.pace === 'slow' && {
                    borderColor: currentTheme.colors.primary,
                    backgroundColor: currentTheme.colors.progressInner
                  }
                ]}
                onPress={() => setSettings({ ...settings, pace: 'slow' })}
              >
                <Text style={[styles.optionText, { color: currentTheme.colors.text }]}>Långsam</Text>
              </TouchableOpacity>
              {error && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>}
            </View>
          );
        }
        return null;
      case 3:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme.colors.primary }]}>
              <Package2 size={32} color="#fff" />
            </View>
            <Text style={[styles.question, { color: currentTheme.colors.text }]}>
              Hur många portioner finns i en dosa?
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: currentTheme.colors.card,
                borderColor: error ? currentTheme.colors.error : currentTheme.colors.cardBorder,
                color: currentTheme.colors.text
              }]}
              keyboardType="numeric"
              value={settings.portionsPerCan.toString()}
              onChangeText={(text) =>
                setSettings({ ...settings, portionsPerCan: parseInt(text) || 0 })
              }
              placeholder="Antal portioner"
              placeholderTextColor={currentTheme.colors.textSecondary}
            />
            {error && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>}
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme.colors.primary }]}>
              <DollarSign size={32} color="#fff" />
            </View>
            <Text style={[styles.question, { color: currentTheme.colors.text }]}>
              Vad kostar en dosa?
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: currentTheme.colors.card,
                borderColor: error ? currentTheme.colors.error : currentTheme.colors.cardBorder,
                color: currentTheme.colors.text
              }]}
              keyboardType="numeric"
              value={settings.costPerCan.toString()}
              onChangeText={(text) =>
                setSettings({ ...settings, costPerCan: parseInt(text) || 0 })
              }
              placeholder="Pris i kronor"
              placeholderTextColor={currentTheme.colors.textSecondary}
            />
            {error && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>}
          </View>
        );
      case 5:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme.colors.primary }]}>
              <TrendingDown size={32} color="#fff" />
            </View>
            <Text style={[styles.question, { color: currentTheme.colors.text }]}>
              Hur ser din snuskonsumtion ut?
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: currentTheme.colors.text }]}>
                Dagligt antal portioner just nu
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: currentTheme.colors.card,
                  borderColor: error ? currentTheme.colors.error : currentTheme.colors.cardBorder,
                  color: currentTheme.colors.text
                }]}
                keyboardType="numeric"
                value={settings.dailyIntake.toString()}
                onChangeText={(text) =>
                  setSettings({ ...settings, dailyIntake: parseInt(text) || 0 })
                }
                placeholder="Nuvarande antal portioner per dag"
                placeholderTextColor={currentTheme.colors.textSecondary}
              />
            </View>

            {settings.goal === 'reduce' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.colors.text }]}>
                  Mål för dagligt antal portioner
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: currentTheme.colors.card,
                    borderColor: error ? currentTheme.colors.error : currentTheme.colors.cardBorder,
                    color: currentTheme.colors.text
                  }]}
                  keyboardType="numeric"
                  value={settings.targetDailyIntake?.toString() || ''}
                  onChangeText={(text) =>
                    setSettings({ ...settings, targetDailyIntake: parseInt(text) || 0 })
                  }
                  placeholder="Önskat antal portioner per dag"
                  placeholderTextColor={currentTheme.colors.textSecondary}
                />
              </View>
            )}
            
            {error && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>}
          </View>
        );
      case 6:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme.colors.primary }]}>
              <Timer size={32} color="#fff" />
            </View>
            <Text style={[styles.question, { color: currentTheme.colors.text }]}>
              Hur länge har du en snus inne?
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: currentTheme.colors.text }]}>
                Nuvarande snustid
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: currentTheme.colors.card,
                  borderColor: error ? currentTheme.colors.error : currentTheme.colors.cardBorder,
                  color: currentTheme.colors.text
                }]}
                keyboardType="numeric"
                value={settings.snusTime.toString()}
                onChangeText={(text) =>
                  setSettings({ ...settings, snusTime: parseInt(text) || 0 })
                }
                placeholder="Nuvarande tid (minuter)"
                placeholderTextColor={currentTheme.colors.textSecondary}
              />
            </View>

            {settings.goal === 'reduce' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.colors.text }]}>
                  Önskad snustid
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: currentTheme.colors.card,
                    borderColor: error ? currentTheme.colors.error : currentTheme.colors.cardBorder,
                    color: currentTheme.colors.text
                  }]}
                  keyboardType="numeric"
                  value={settings.targetSnusTime?.toString() || ''}
                  onChangeText={(text) =>
                    setSettings({ ...settings, targetSnusTime: parseInt(text) || 0 })
                  }
                  placeholder="Önskad tid (minuter)"
                  placeholderTextColor={currentTheme.colors.textSecondary}
                />
              </View>
            )}
            
            {error && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>}
          </View>
        );
      case 7:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme.colors.primary }]}>
              <Clock size={32} color="#fff" />
            </View>
            <Text style={[styles.question, { color: currentTheme.colors.text }]}>
              Hur länge väntar du mellan portioner?
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: currentTheme.colors.text }]}>
                Nuvarande väntetid
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: currentTheme.colors.card,
                  borderColor: error ? currentTheme.colors.error : currentTheme.colors.cardBorder,
                  color: currentTheme.colors.text
                }]}
                keyboardType="numeric"
                value={settings.waitTime.toString()}
                onChangeText={(text) =>
                  setSettings({ ...settings, waitTime: parseInt(text) || 0 })
                }
                placeholder="Nuvarande väntetid (minuter)"
                placeholderTextColor={currentTheme.colors.textSecondary}
              />
            </View>

            {settings.goal === 'reduce' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: currentTheme.colors.text }]}>
                  Önskad väntetid
                </Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: currentTheme.colors.card,
                    borderColor: error ? currentTheme.colors.error : currentTheme.colors.cardBorder,
                    color: currentTheme.colors.text
                  }]}
                  keyboardType="numeric"
                  value={settings.targetWaitTime?.toString() || ''}
                  onChangeText={(text) =>
                    setSettings({ ...settings, targetWaitTime: parseInt(text) || 0 })
                  }
                  placeholder="Önskad väntetid (minuter)"
                  placeholderTextColor={currentTheme.colors.textSecondary}
                />
              </View>
            )}
            
            {error && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>}
          </View>
        );
      case 8:
        return (
          <View style={styles.stepContainer}>
            <View style={[styles.iconContainer, { backgroundColor: currentTheme.colors.primary }]}>
              <Zap size={32} color="#fff" />
            </View>
            <Text style={[styles.question, { color: currentTheme.colors.text }]}>
              Hur mycket nikotin innehåller en portion?
            </Text>
            <Text style={[styles.description, { color: currentTheme.colors.textSecondary }]}>
              (Du ser detta på infon under din snusdosa.)
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: currentTheme.colors.card,
                borderColor: error ? currentTheme.colors.error : currentTheme.colors.cardBorder,
                color: currentTheme.colors.text
              }]}
              keyboardType="decimal-pad"
              value={settings.nicotineContent.toString().replace('.', ',')}
              onChangeText={(text) => {
                const normalized = text.replace(',', '.');
                const value = parseFloat(normalized);
                if (!isNaN(value)) {
                  setSettings({ ...settings, nicotineContent: value });
                }
              }}
              placeholder="Nikotininnehåll i mg"
              placeholderTextColor={currentTheme.colors.textSecondary}
            />
            {error && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>}
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={currentTheme.colors.background}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={[
            styles.stepIndicatorContainer,
            { 
              backgroundColor: currentTheme.colors.card,
              borderColor: currentTheme.colors.cardBorder }
          ]}>
            <Text style={[styles.stepIndicator, { color: currentTheme.colors.text }]}>
              {setupType === null ? 'Välj typ' : 
               setupType === 'quick' ? `Steg ${step} av 4` : 
               `Steg ${step} av ${settings.goal === 'track' ? 7 : 8}`}
            </Text>
          </View>
        </View>

        {setupType === null ? (
          renderSetupTypeSelection()
        ) : setupType === 'quick' ? (
          renderQuickSetup()
        ) : (
          renderDetailedSetup()
        )}

        <View style={styles.buttonContainer}>
          {(step > 1 || setupType !== null) && (
            <TouchableOpacity 
              style={[styles.backButton, { backgroundColor: currentTheme.colors.card }]} 
              onPress={handleBack}
            >
              <ArrowLeft size={20} color={currentTheme.colors.text} />
              <Text style={[styles.backButtonText, { color: currentTheme.colors.text }]}>
                Tillbaka
              </Text>
            </TouchableOpacity>
          )}

          {setupType !== null && (
            <TouchableOpacity 
              style={[styles.nextButton, { backgroundColor: currentTheme.colors.primary }]} 
              onPress={handleNext}
              disabled={isSaving}
            >
              <Text style={styles.nextButtonText}>
                {step === (setupType === 'quick' ? 4 : settings.goal === 'track' ? 7 : 8) ? 'Slutför' : 'Nästa'}
              </Text>
              <ArrowRight size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
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
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  stepIndicatorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  stepIndicator: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  question: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  inputGroup: {
    width: '100%',
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    marginBottom: 8,
  },
  option: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  backButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  nextButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  errorText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});