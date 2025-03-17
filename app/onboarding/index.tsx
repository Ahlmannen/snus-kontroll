import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Timer, TrendingDown, DollarSign, Sun, Moon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, Theme, lightTheme, darkTheme } from '@/hooks/useTheme';
import { useDatabase } from '@/hooks/useDatabase';

const steps = [
  {
    title: 'Välj tema',
    description: 'Välj mellan ljust och mörkt tema för appen.',
    icon: null,
    gradient: ['#1e293b', '#0f172a'],
    iconBg: '#2563eb'
  },
  {
    title: 'Välkommen till Snus Kontroll',
    description: 'Vi hjälper dig att minska eller sluta med snus genom en personlig plan anpassad efter dina mål.',
    icon: <TrendingDown size={48} color="#fff" />,
    gradient: ['#1e293b', '#0f172a'],
    iconBg: '#2563eb'
  },
  {
    title: 'Spåra din framgång',
    description: 'Följ din dagliga konsumtion och se dina framsteg över tid. Vi hjälper dig att hålla dig motiverad.',
    icon: <Timer size={48} color="#fff" />,
    gradient: ['#1e293b', '#0f172a'],
    iconBg: '#059669'
  },
  {
    title: 'Spara pengar',
    description: 'Se hur mycket pengar du sparar genom att minska din snuskonsumtion. Varje portion räknas!',
    icon: <DollarSign size={48} color="#fff" />,
    gradient: ['#1e293b', '#0f172a'],
    iconBg: '#7c3aed'
  },
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const { theme, setTheme } = useTheme();
  const { loadSettings } = useDatabase();

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      const settings = await loadSettings();
      if (settings?.onboardingComplete) {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Fel vid kontroll av onboarding-status:', error);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      router.push('/onboarding/setup');
    }
  };

  const currentStepData = steps[currentStep];
  const currentTheme = theme === 'light' ? lightTheme : darkTheme;

  const ThemeSelector = () => (
    <View style={styles.themeContainer}>
      <TouchableOpacity
        style={[
          styles.themeOption,
          { backgroundColor: lightTheme.colors.card },
          theme === 'light' && { borderColor: lightTheme.colors.primary, borderWidth: 2 }
        ]}
        onPress={() => setTheme('light')}
      >
        <View style={[styles.themeIconContainer, { backgroundColor: lightTheme.colors.progressInner }]}>
          <Sun size={32} color={theme === 'light' ? lightTheme.colors.primary : lightTheme.colors.text} />
        </View>
        <Text style={[styles.themeText, { color: lightTheme.colors.text }]}>
          Ljust tema
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.themeOption,
          { backgroundColor: darkTheme.colors.card },
          theme === 'dark' && { borderColor: darkTheme.colors.primary, borderWidth: 2 }
        ]}
        onPress={() => setTheme('dark')}
      >
        <View style={[styles.themeIconContainer, { backgroundColor: darkTheme.colors.progressInner }]}>
          <Moon size={32} color={theme === 'dark' ? darkTheme.colors.primary : darkTheme.colors.text} />
        </View>
        <Text style={[styles.themeText, { color: darkTheme.colors.text }]}>
          Mörkt tema
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={currentTheme.colors.background}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={[
              styles.stepIndicatorContainer,
              { 
                backgroundColor: currentTheme.colors.card,
                borderColor: currentTheme.colors.cardBorder
              }
            ]}>
              <Text style={[styles.stepIndicator, { color: currentTheme.colors.text }]}>
                {currentStep + 1} av {steps.length}
              </Text>
            </View>
          </View>

          <View style={styles.main}>
            <View style={[
              styles.card,
              { 
                backgroundColor: currentTheme.colors.card,
                borderColor: currentTheme.colors.cardBorder
              }
            ]}>
              {currentStep === 0 ? (
                <>
                  <Text style={[styles.title, { color: currentTheme.colors.text }]}>
                    {currentStepData.title}
                  </Text>
                  <Text style={[styles.description, { color: currentTheme.colors.textSecondary }]}>
                    {currentStepData.description}
                  </Text>
                  <ThemeSelector />
                </>
              ) : (
                <>
                  <View style={[styles.iconContainer, { backgroundColor: currentStepData.iconBg }]}>
                    {currentStepData.icon}
                  </View>
                  <Text style={[styles.title, { color: currentTheme.colors.text }]}>
                    {currentStepData.title}
                  </Text>
                  <Text style={[styles.description, { color: currentTheme.colors.textSecondary }]}>
                    {currentStepData.description}
                  </Text>
                </>
              )}
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: currentTheme.colors.primary }]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {currentStep === steps.length - 1 ? 'Kom igång' : 'Nästa'}
            </Text>
            <ArrowRight size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 20 : 40,
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
  main: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontFamily: 'Inter-Regular',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 28,
  },
  themeContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    width: '100%',
  },
  themeOption: {
    flex: 1,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  themeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
});