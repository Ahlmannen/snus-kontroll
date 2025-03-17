import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDatabase } from './useDatabase';
import { useStats } from './useStats';
import type { Challenge, Achievement, UserProgress } from '@/types/gamification';

const POINTS_PER_LEVEL = 1000;
const DAILY_CHALLENGE_POINTS = 100;
const WEEKLY_CHALLENGE_POINTS = 250;
const SPECIAL_CHALLENGE_POINTS = 500;

export const useGamification = () => {
  const { loadDailyStats } = useDatabase();
  const { dailyStats, weeklyStats, progressStats } = useStats();
  const [userProgress, setUserProgress] = useState<UserProgress>({
    level: 1,
    currentPoints: 0,
    pointsToNextLevel: POINTS_PER_LEVEL,
    totalPoints: 0,
    achievements: [],
    challenges: [],
    streakPoints: 0,
    weeklyPoints: 0,
    monthlyPoints: 0
  });

  // Dagliga utmaningar
  const dailyChallenges: Challenge[] = [
    {
      id: 'daily_under_limit',
      title: 'Under gränsen',
      description: 'Håll dig under din dagliga gräns',
      type: 'daily',
      points: DAILY_CHALLENGE_POINTS,
      progress: 0,
      requirement: 1,
      completed: false
    },
    {
      id: 'daily_long_pause',
      title: 'Lång paus',
      description: 'Ha en paus på minst 2 timmar mellan portioner',
      type: 'daily',
      points: DAILY_CHALLENGE_POINTS,
      progress: 0,
      requirement: 1,
      completed: false
    },
    {
      id: 'daily_morning',
      title: 'Stark start',
      description: 'Vänta minst 30 minuter efter uppvaknande',
      type: 'daily',
      points: DAILY_CHALLENGE_POINTS,
      progress: 0,
      requirement: 1,
      completed: false
    },
    {
      id: 'daily_evening',
      title: 'Kvällsrutin',
      description: 'Ingen snus 2 timmar före sänggående',
      type: 'daily',
      points: DAILY_CHALLENGE_POINTS,
      progress: 0,
      requirement: 1,
      completed: false
    },
    {
      id: 'daily_mindful',
      title: 'Medveten snusning',
      description: 'Håll varje prilla inne exakt den rekommenderade tiden',
      type: 'daily',
      points: DAILY_CHALLENGE_POINTS,
      progress: 0,
      requirement: 3,
      completed: false
    },
    {
      id: 'daily_spacing',
      title: 'Jämn fördelning',
      description: 'Ha minst 1 timme mellan varje portion',
      type: 'daily',
      points: DAILY_CHALLENGE_POINTS,
      progress: 0,
      requirement: 1,
      completed: false
    }
  ];

  // Veckovisa utmaningar
  const weeklyChallenges: Challenge[] = [
    {
      id: 'weekly_streak',
      title: 'Veckans krigare',
      description: 'Håll dig under gränsen 5 dagar i rad',
      type: 'weekly',
      points: WEEKLY_CHALLENGE_POINTS,
      progress: 0,
      requirement: 5,
      completed: false
    },
    {
      id: 'weekly_savings',
      title: 'Sparsam vecka',
      description: 'Spara minst 200kr denna vecka',
      type: 'weekly',
      points: WEEKLY_CHALLENGE_POINTS,
      progress: 0,
      requirement: 200,
      completed: false
    },
    {
      id: 'weekly_reduction',
      title: 'Stadig minskning',
      description: 'Minska ditt dagliga snittintag med 2 portioner',
      type: 'weekly',
      points: WEEKLY_CHALLENGE_POINTS,
      progress: 0,
      requirement: 2,
      completed: false
    },
    {
      id: 'weekly_perfect_days',
      title: 'Perfekta dagar',
      description: 'Klara 3 dagliga utmaningar på samma dag',
      type: 'weekly',
      points: WEEKLY_CHALLENGE_POINTS,
      progress: 0,
      requirement: 3,
      completed: false
    },
    {
      id: 'weekly_long_breaks',
      title: 'Långa pauser',
      description: 'Ha 3 pauser på över 3 timmar',
      type: 'weekly',
      points: WEEKLY_CHALLENGE_POINTS,
      progress: 0,
      requirement: 3,
      completed: false
    }
  ];

  // Specialutmaningar
  const specialChallenges: Challenge[] = [
    {
      id: 'special_month',
      title: 'Månadsutmaning',
      description: 'Minska din genomsnittliga användning med 20% under en månad',
      type: 'special',
      points: SPECIAL_CHALLENGE_POINTS,
      progress: 0,
      requirement: 20,
      completed: false
    },
    {
      id: 'special_savings',
      title: 'Sparbössan',
      description: 'Spara totalt 1000kr',
      type: 'special',
      points: SPECIAL_CHALLENGE_POINTS,
      progress: 0,
      requirement: 1000,
      completed: false
    },
    {
      id: 'special_weekend',
      title: 'Helgkrigaren',
      description: 'Håll dig under gränsen hela helgen',
      type: 'special',
      points: SPECIAL_CHALLENGE_POINTS,
      progress: 0,
      requirement: 1,
      completed: false
    },
    {
      id: 'special_social',
      title: 'Social styrka',
      description: 'Håll dig under gränsen under en social tillställning',
      type: 'special',
      points: SPECIAL_CHALLENGE_POINTS,
      progress: 0,
      requirement: 1,
      completed: false
    },
    {
      id: 'special_stress',
      title: 'Stresshantering',
      description: 'Använd alternativa metoder istället för snus vid stress',
      type: 'special',
      points: SPECIAL_CHALLENGE_POINTS,
      progress: 0,
      requirement: 3,
      completed: false
    }
  ];

  // Achievements (permanenta prestationer)
  const achievements: Achievement[] = [
    {
      id: 'streak_master',
      title: 'Streak Mästare',
      description: 'Uppnå en 30-dagars streak',
      icon: 'flame',
      tier: 'platinum',
      points: 1000,
      progress: 0,
      requirement: 30,
      unlocked: false
    },
    {
      id: 'money_saver',
      title: 'Ekonomisk Mästare',
      description: 'Spara totalt 5000kr',
      icon: 'dollar-sign',
      tier: 'gold',
      points: 750,
      progress: 0,
      requirement: 5000,
      unlocked: false
    },
    {
      id: 'health_champion',
      title: 'Hälsomästare',
      description: 'Minska din dagliga nikotinkonsumtion med 50%',
      icon: 'heart',
      tier: 'gold',
      points: 750,
      progress: 0,
      requirement: 50,
      unlocked: false
    },
    {
      id: 'consistency_king',
      title: 'Konsekvensmästare',
      description: 'Håll dig under gränsen i 60 dagar',
      icon: 'award',
      tier: 'platinum',
      points: 1000,
      progress: 0,
      requirement: 60,
      unlocked: false
    },
    {
      id: 'challenge_master',
      title: 'Utmaningsmästare',
      description: 'Klara 50 dagliga utmaningar',
      icon: 'target',
      tier: 'gold',
      points: 750,
      progress: 0,
      requirement: 50,
      unlocked: false
    },
    {
      id: 'weekend_warrior',
      title: 'Helgmästare',
      description: 'Klara 10 helger under gränsen',
      icon: 'sun',
      tier: 'silver',
      points: 500,
      progress: 0,
      requirement: 10,
      unlocked: false
    },
    {
      id: 'morning_champion',
      title: 'Morgonmästare',
      description: 'Vänta med första snusen 30+ minuter 20 dagar',
      icon: 'sunrise',
      tier: 'silver',
      points: 500,
      progress: 0,
      requirement: 20,
      unlocked: false
    },
    {
      id: 'evening_master',
      title: 'Kvällsmästare',
      description: 'Ingen snus 2h före sänggående 20 dagar',
      icon: 'moon',
      tier: 'silver',
      points: 500,
      progress: 0,
      requirement: 20,
      unlocked: false
    },
    {
      id: 'social_butterfly',
      title: 'Social Fjäril',
      description: 'Klara 5 sociala tillställningar under gränsen',
      icon: 'users',
      tier: 'gold',
      points: 750,
      progress: 0,
      requirement: 5,
      unlocked: false
    },
    {
      id: 'stress_handler',
      title: 'Stressmästare',
      description: 'Använd alternativ till snus vid stress 15 gånger',
      icon: 'zap',
      tier: 'silver',
      points: 500,
      progress: 0,
      requirement: 15,
      unlocked: false
    },
    {
      id: 'perfect_week',
      title: 'Perfekt Vecka',
      description: 'Klara alla dagliga utmaningar 7 dagar i rad',
      icon: 'check-circle',
      tier: 'platinum',
      points: 1000,
      progress: 0,
      requirement: 7,
      unlocked: false
    },
    {
      id: 'long_break_master',
      title: 'Pausmästare',
      description: 'Ha 20 pauser på över 4 timmar',
      icon: 'clock',
      tier: 'gold',
      points: 750,
      progress: 0,
      requirement: 20,
      unlocked: false
    }
  ];

  const loadProgress = useCallback(async () => {
    try {
      const savedProgress = await AsyncStorage.getItem('userProgress');
      if (savedProgress) {
        setUserProgress(JSON.parse(savedProgress));
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  }, []);

  const saveProgress = useCallback(async (progress: UserProgress) => {
    try {
      await AsyncStorage.setItem('userProgress', JSON.stringify(progress));
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }, []);

  const updateProgress = useCallback(async () => {
    const newProgress = { ...userProgress };

    // Uppdatera utmaningar
    newProgress.challenges = [
      ...dailyChallenges,
      ...weeklyChallenges,
      ...specialChallenges
    ].map(challenge => {
      // Implementera logik för att uppdatera progress för varje utmaning
      return challenge;
    });

    // Uppdatera achievements
    newProgress.achievements = achievements.map(achievement => {
      // Implementera logik för att uppdatera progress för varje achievement
      return achievement;
    });

    // Beräkna nya poäng och level
    const totalPoints = calculateTotalPoints(newProgress);
    newProgress.totalPoints = totalPoints;
    newProgress.level = Math.floor(totalPoints / POINTS_PER_LEVEL) + 1;
    newProgress.currentPoints = totalPoints % POINTS_PER_LEVEL;
    newProgress.pointsToNextLevel = POINTS_PER_LEVEL - newProgress.currentPoints;

    setUserProgress(newProgress);
    await saveProgress(newProgress);
  }, [userProgress, saveProgress]);

  const calculateTotalPoints = (progress: UserProgress): number => {
    const challengePoints = progress.challenges
      .filter(c => c.completed)
      .reduce((sum, c) => sum + c.points, 0);

    const achievementPoints = progress.achievements
      .filter(a => a.unlocked)
      .reduce((sum, a) => sum + a.points, 0);

    return challengePoints + achievementPoints + progress.streakPoints;
  };

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    const interval = setInterval(updateProgress, 60000); // Uppdatera varje minut
    return () => clearInterval(interval);
  }, [updateProgress]);

  return {
    userProgress,
    dailyChallenges,
    weeklyChallenges,
    specialChallenges,
    achievements,
    updateProgress
  };
};