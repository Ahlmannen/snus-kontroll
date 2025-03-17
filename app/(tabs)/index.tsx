import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TriangleAlert as AlertTriangle, Clock3, Timer, Zap, Clock } from 'lucide-react-native';
import { useSharedValue, withSpring, withTiming, withRepeat, withSequence } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import { useSettingsSync } from '@/hooks/useSettingsSync';
import { useTheme, lightTheme, darkTheme } from '@/hooks/useTheme';
import { useDatabase } from '@/hooks/useDatabase';
import { useStats } from '@/hooks/useStats';
import { format } from 'date-fns';

const CIRCLE_LENGTH = Math.PI * 200;
const OUTER_CIRCLE_LENGTH = Math.PI * 240;
const CIRCLE_RADIUS = 100;
const OUTER_CIRCLE_RADIUS = 120;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DailyStats {
  count: number;
  limit: number;
  nextAllowed: number | null;
  currentSnusStartTime: number | null;
  lastSnusEndTime: number | null;
  longestPause: number;
}

interface UserSettings {
  snusTime: number;
  waitTime: number;
  dailyIntake: number;
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const currentTheme = theme === 'light' ? lightTheme : darkTheme;
  const { loadSettings, loadDailyStats, saveDailyStats } = useDatabase();
  const { refresh: refreshStats } = useStats();
  
  const [stats, setStats] = useState<DailyStats>({
    count: 0,
    limit: 10,
    nextAllowed: null,
    currentSnusStartTime: null,
    lastSnusEndTime: null,
    longestPause: 0,
  });
  
  const [settings, setSettings] = useState<UserSettings>({
    snusTime: 30,
    waitTime: 30,
    dailyIntake: 10,
  });

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [waitTimeLeft, setWaitTimeLeft] = useState<number | null>(null);
  const [overtimeSeconds, setOvertimeSeconds] = useState<number>(0);
  const [lastSnusTime, setLastSnusTime] = useState<number | null>(null);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  
  const progress = useSharedValue(0);
  const timerProgress = useSharedValue(1);
  const buttonScale = useSharedValue(1);
  const timerPulse = useSharedValue(1);
  const emergencyScale = useSharedValue(1);

  const isButtonDisabled = (waitTimeLeft || stats.currentSnusStartTime) && !isEmergencyMode;

  const getDisabledButtonStyle = () => {
    if (!isButtonDisabled) return {};

    if (Platform.OS === 'ios') {
      return {
        backgroundColor: theme === 'light' ? '#E2E8F0' : '#1E293B',
      };
    }

    return {
      backgroundColor: currentTheme.colors.disabled,
      opacity: theme === 'light' ? 0.7 : 0.5,
    };
  };

  const getDisabledTextStyle = () => {
    if (!isButtonDisabled) return {};

    if (Platform.OS === 'ios') {
      return {
        color: theme === 'light' ? '#94A3B8' : 'rgba(255, 255, 255, 0.5)',
      };
    }

    return theme === 'light' ? {
      color: 'rgba(255, 255, 255, 0.8)',
    } : {};
  };

  const getEmergencyButtonStyle = () => {
    if (Platform.OS === 'ios' && isEmergencyMode) {
      return {
        backgroundColor: theme === 'light' ? '#E2E8F0' : '#1E293B',
      };
    }
    return {};
  };

  const getEmergencyTextStyle = () => {
    if (Platform.OS === 'ios' && isEmergencyMode) {
      return {
        color: theme === 'light' ? '#94A3B8' : 'rgba(255, 255, 255, 0.5)',
      };
    }
    return {};
  };

  const circleAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCLE_LENGTH * (1 - progress.value),
  }));

  const timerCircleAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: OUTER_CIRCLE_LENGTH * (1 - timerProgress.value),
  }));

  useSettingsSync(async () => {
    const updatedSettings = await loadSettings();
    if (updatedSettings) {
      setSettings(updatedSettings);
      setStats(prev => ({
        ...prev,
        limit: updatedSettings.dailyIntake
      }));
    }
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [savedSettings, savedStats] = await Promise.all([
      loadSettings(),
      loadDailyStats(today)
    ]);

    if (savedSettings) {
      setSettings(savedSettings);
    }

    if (savedStats) {
      setStats(savedStats);
      if (savedStats.currentSnusStartTime) {
        const elapsed = Date.now() - savedStats.currentSnusStartTime;
        const timeLeftMs = (settings.snusTime * 60 * 1000) - elapsed;
        setTimeLeft(Math.max(0, Math.ceil(timeLeftMs / 1000)));
      }
    }
  };

  const handleSnusTracking = async () => {
    const now = Date.now();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    if (stats.nextAllowed && now < stats.nextAllowed && !isEmergencyMode) {
      buttonScale.value = withSequence(
        withTiming(1.1, { duration: 100 }),
        withTiming(1, { duration: 100 })
      );
      return;
    }

    if (lastSnusTime) {
      const pauseSeconds = Math.floor((now - lastSnusTime) / 1000);
      if (pauseSeconds > stats.longestPause) {
        stats.longestPause = pauseSeconds;
      }
    }

    const newStats = {
      ...stats,
      count: stats.count + 1,
      currentSnusStartTime: now,
      nextAllowed: null,
      lastSnusEndTime: null,
      date: todayStr,
    };

    setStats(newStats);
    setLastSnusTime(null);
    setIsEmergencyMode(false);
    await saveDailyStats(newStats);
    refreshStats();
  };

  const handleSpitOut = async () => {
    if (!stats.currentSnusStartTime) return;

    const now = Date.now();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const newStats = {
      ...stats,
      currentSnusStartTime: null,
      lastSnusEndTime: now,
      nextAllowed: now + (settings.waitTime * 60 * 1000),
      date: todayStr,
    };
    
    setStats(newStats);
    setTimeLeft(null);
    setLastSnusTime(now);
    await saveDailyStats(newStats);
    refreshStats();
    
    timerPulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 300 }),
        withTiming(1, { duration: 300 })
      ),
      3
    );
  };

  const handleEmergencySnus = async () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    emergencyScale.value = withSequence(
      withTiming(1.2, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );

    const newStats = {
      ...stats,
      nextAllowed: null,
      currentSnusStartTime: null,
      lastSnusEndTime: null,
      date: todayStr,
    };

    setStats(newStats);
    setWaitTimeLeft(null);
    setOvertimeSeconds(0);
    setLastSnusTime(null);
    setIsEmergencyMode(true);
    await saveDailyStats(newStats);
    refreshStats();
  };

  const updateTimers = useCallback(() => {
    const now = Date.now();

    if (stats.currentSnusStartTime) {
      const elapsed = now - stats.currentSnusStartTime;
      const totalTime = settings.snusTime * 60 * 1000;
      const timeLeftMs = totalTime - elapsed;
      
      if (timeLeftMs <= 0) {
        setTimeLeft(null);
        timerProgress.value = withTiming(1);
        const newStats = {
          ...stats,
          currentSnusStartTime: null,
          lastSnusEndTime: now,
          nextAllowed: now + (settings.waitTime * 60 * 1000),
        };
        
        setStats(newStats);
        saveDailyStats(newStats);
        setLastSnusTime(now);
        
        timerPulse.value = withRepeat(
          withSequence(
            withTiming(1.2, { duration: 300 }),
            withTiming(1, { duration: 300 })
          ),
          3
        );
      } else {
        setTimeLeft(Math.ceil(timeLeftMs / 1000));
        timerProgress.value = withTiming(timeLeftMs / totalTime);
      }
    }

    if (lastSnusTime) {
      const pauseSeconds = Math.floor((now - lastSnusTime) / 1000);
      if (pauseSeconds > stats.longestPause) {
        const newStats = {
          ...stats,
          longestPause: pauseSeconds,
        };
        setStats(newStats);
        saveDailyStats(newStats);
      }
    }

    if (stats.nextAllowed) {
      const totalWaitTime = settings.waitTime * 60 * 1000;
      const waitTimeLeftMs = stats.nextAllowed - now;
      if (waitTimeLeftMs <= 0) {
        setWaitTimeLeft(null);
        timerProgress.value = withTiming(1);
        const overtime = Math.floor((now - stats.nextAllowed) / 1000);
        setOvertimeSeconds(overtime);
      } else {
        setWaitTimeLeft(Math.ceil(waitTimeLeftMs / 1000));
        timerProgress.value = withTiming(waitTimeLeftMs / totalWaitTime);
        setOvertimeSeconds(0);
      }
    } else {
      setOvertimeSeconds(0);
    }
  }, [stats, settings.snusTime, settings.waitTime, timerPulse, lastSnusTime]);

  useEffect(() => {
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [updateTimers]);

  useEffect(() => {
    const progressValue = stats.count / settings.dailyIntake;
    progress.value = withSpring(Math.min(progressValue, 1), {
      damping: 15,
      stiffness: 90,
    });
  }, [stats.count, settings.dailyIntake, progress]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const timerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerPulse.value }],
  }));

  const emergencyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emergencyScale.value }],
  }));

  // Only show emergency button when there's no active snus timer
  const showEmergencyButton = (!timeLeft && (waitTimeLeft || stats.count >= settings.dailyIntake));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={currentTheme.colors.background}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: currentTheme.colors.text }]}>Snus Kontroll</Text>
          <Text style={[
            styles.subtitle,
            { color: currentTheme.colors.textSecondary },
            stats.count > settings.dailyIntake && { color: currentTheme.colors.error }
          ]}>
            {stats.count} av {settings.dailyIntake} portioner
            {stats.count > settings.dailyIntake ? ' (över gränsen)' : ''}
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.svgContainer}>
            <Svg width={280} height={280}>
              <G rotation="-90" origin="140, 140">
                {(timeLeft || waitTimeLeft) && (
                  <>
                    <Circle
                      cx="140"
                      cy="140"
                      r={OUTER_CIRCLE_RADIUS}
                      stroke={currentTheme.colors.progressBackground}
                      strokeWidth={16}
                      fill="transparent"
                    />
                    <AnimatedCircle
                      cx="140"
                      cy="140"
                      r={OUTER_CIRCLE_RADIUS}
                      stroke={timeLeft ? currentTheme.colors.success : currentTheme.colors.warning}
                      strokeWidth={16}
                      fill="transparent"
                      strokeDasharray={`${OUTER_CIRCLE_LENGTH}, ${OUTER_CIRCLE_LENGTH}`}
                      animatedProps={timerCircleAnimatedProps}
                      strokeLinecap="round"
                    />
                  </>
                )}
                <Circle
                  cx="140"
                  cy="140"
                  r={CIRCLE_RADIUS}
                  stroke={currentTheme.colors.progressBackground}
                  strokeWidth={20}
                  fill="transparent"
                />
                <AnimatedCircle
                  cx="140"
                  cy="140"
                  r={CIRCLE_RADIUS}
                  stroke={stats.count > settings.dailyIntake ? currentTheme.colors.error : currentTheme.colors.primary}
                  strokeWidth={20}
                  fill="transparent"
                  strokeDasharray={`${CIRCLE_LENGTH}, ${CIRCLE_LENGTH}`}
                  animatedProps={circleAnimatedProps}
                  strokeLinecap="round"
                />
              </G>
            </Svg>
          </View>
          <View style={[styles.progressInner, {
            backgroundColor: currentTheme.colors.progressInner,
            borderColor: currentTheme.colors.progressBorder
          }]}>
            <Animated.View style={[timerStyle, styles.progressContent]}>
              {stats.currentSnusStartTime && timeLeft ? (
                <>
                  <Text style={[styles.timerText, { color: currentTheme.colors.text }]}>{formatTime(timeLeft)}</Text>
                  <Text style={[styles.timerLabel, { color: currentTheme.colors.textSecondary }]}>kvar</Text>
                </>
              ) : (
                <>
                  <Text style={[
                    styles.progressText,
                    { color: currentTheme.colors.text },
                    stats.count > settings.dailyIntake && { color: currentTheme.colors.error }
                  ]}>{stats.count}</Text>
                  <Text style={[styles.progressLabel, { color: currentTheme.colors.textSecondary }]}>portioner</Text>
                </>
              )}
            </Animated.View>
          </View>
        </View>

        {timeLeft ? (
          <View style={[styles.infoContainer, { 
            backgroundColor: currentTheme.colors.cardBackground,
            borderColor: currentTheme.colors.border
          }]}>
            <Timer size={20} color={currentTheme.colors.success} />
            <Text style={[styles.infoText, { color: currentTheme.colors.success }]}>
              {formatTime(timeLeft)} kvar tills du ska spotta ut
            </Text>
          </View>
        ) : waitTimeLeft ? (
          <View style={[styles.infoContainer, {
            backgroundColor: currentTheme.colors.cardBackground,
            borderColor: currentTheme.colors.border
          }]}>
            <Clock3 size={20} color={currentTheme.colors.warning} />
            <Text style={[styles.infoText, { color: currentTheme.colors.warning }]}>
              {formatTime(waitTimeLeft)} tills nästa portion
            </Text>
          </View>
        ) : overtimeSeconds > 0 ? (
          <View style={[styles.infoContainer, {
            backgroundColor: currentTheme.colors.cardBackground,
            borderColor: currentTheme.colors.border
          }]}>
            <Clock size={20} color={currentTheme.colors.success} />
            <Text style={[styles.infoText, { color: currentTheme.colors.success }]}>
              Övertid: {formatTime(overtimeSeconds)}
            </Text>
          </View>
        ) : stats.count >= settings.dailyIntake ? (
          <View style={[styles.infoContainer, {
            backgroundColor: currentTheme.colors.cardBackground,
            borderColor: currentTheme.colors.border
          }]}>
            <AlertTriangle size={20} color={currentTheme.colors.error} />
            <Text style={[styles.infoText, { color: currentTheme.colors.error }]}>
              {stats.count > settings.dailyIntake ? 
                'Du har överskridit din dagliga gräns' :
                'Du har nått din dagliga gräns'}
            </Text>
          </View>
        ) : null}

        <View style={styles.buttonContainer}>
          <Animated.View style={buttonStyle}>
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: currentTheme.colors.primary },
                getDisabledButtonStyle(),
              ]}
              onPress={handleSnusTracking}
              disabled={isButtonDisabled}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.buttonText,
                getDisabledTextStyle(),
              ]}>
                Jag tog en snus
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {timeLeft && (
            <Animated.View style={buttonStyle}>
              <TouchableOpacity
                style={[
                  styles.button,
                  { backgroundColor: currentTheme.colors.success }
                ]}
                onPress={handleSpitOut}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  Spotta ut
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {showEmergencyButton && (
            <Animated.View style={emergencyStyle}>
              <TouchableOpacity
                style={[
                  styles.emergencyButton,
                  { backgroundColor: currentTheme.colors.error },
                  isEmergencyMode && {
                    backgroundColor: currentTheme.colors.errorDark,
                    borderColor: currentTheme.colors.error,
                    borderWidth: 2
                  },
                  getEmergencyButtonStyle(),
                ]}
                onPress={handleEmergencySnus}
                activeOpacity={0.8}
              >
                <Zap size={20} color={isEmergencyMode && Platform.OS === 'ios' ? (theme === 'light' ? '#94A3B8' : 'rgba(255, 255, 255, 0.5)') : '#fff'} />
                <Text style={[
                  styles.emergencyButtonText,
                  getEmergencyTextStyle(),
                ]}>
                  Jag behöver en snus NU
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 18,
  },
  progressContainer: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
  },
  svgContainer: {
    position: 'absolute',
    width: 280,
    height: 280,
  },
  progressInner: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  progressContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  progressText: {
    fontFamily: 'Inter-Bold',
    fontSize: 64,
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 64,
  },
  progressLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 18,
    marginTop: 4,
  },
  timerText: {
    fontFamily: 'Inter-Bold',
    fontSize: 48,
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 48,
  },
  timerLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 18,
    marginTop: 4,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  infoText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    marginLeft: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#fff',
  },
  emergencyButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emergencyButtonText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#fff',
  },
});