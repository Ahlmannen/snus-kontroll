import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trophy, Clock, Zap, Target, Flame, Calendar, Award, TrendingDown, Star, Medal, Crown, Gift } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming,
  useSharedValue
} from 'react-native-reanimated';
import { useTheme, lightTheme, darkTheme } from '@/hooks/useTheme';
import { useDatabase } from '@/hooks/useDatabase';
import { useGamification } from '@/hooks/useGamification';

export default function TrophiesScreen() {
  const { theme } = useTheme();
  const currentTheme = theme === 'light' ? lightTheme : darkTheme;
  const { loadTrophyProgress } = useDatabase();
  const { userProgress, dailyChallenges, weeklyChallenges, specialChallenges, achievements } = useGamification();
  
  const [trophyProgress, setTrophyProgress] = useState<Record<string, { progress: number; unlocked: boolean }>>({
    '24h': { progress: 0, unlocked: false },
    'quick_start': { progress: 0, unlocked: false },
    'focused': { progress: 0, unlocked: false },
    'streak': { progress: 0, unlocked: false },
    'month': { progress: 0, unlocked: false },
    'master': { progress: 0, unlocked: false },
    'reduction': { progress: 0, unlocked: false },
    'champion': { progress: 0, unlocked: false },
  });
  
  const [selectedSection, setSelectedSection] = useState<'trophies' | 'challenges' | 'achievements'>('trophies');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  
  const cardScale = useSharedValue(1);
  const progressScale = useSharedValue(1);

  useEffect(() => {
    loadInitialProgress();
  }, []);

  const loadInitialProgress = async () => {
    try {
      const progress = await loadTrophyProgress();
      if (progress) {
        setTrophyProgress(prev => ({
          ...prev,
          ...progress
        }));
      }
    } catch (error) {
      console.error('Failed to load trophy progress:', error);
    }
  };

  const handleItemPress = (id: string) => {
    setSelectedItem(id === selectedItem ? null : id);
    cardScale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );
    progressScale.value = withSequence(
      withTiming(1.1, { duration: 200 }),
      withTiming(1, { duration: 200 })
    );
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progressScale.value }],
  }));

  const trophies = [
    {
      id: '24h',
      icon: <Clock size={24} color={currentTheme.colors.primary} />,
      title: '24 Timmar',
      description: 'Klara dig utan snus i 24 timmar',
      progress: trophyProgress['24h']?.progress || 0,
      color: currentTheme.colors.primary,
      requirement: 24,
      unit: 'timmar',
      unlocked: trophyProgress['24h']?.unlocked || false,
    },
    {
      id: 'quick_start',
      icon: <Zap size={24} color="#7c3aed" />,
      title: 'Snabb Start',
      description: 'Minska din dagliga konsumtion med 20%',
      progress: trophyProgress['quick_start']?.progress || 0,
      color: '#7c3aed',
      requirement: 20,
      unit: '%',
      unlocked: trophyProgress['quick_start']?.unlocked || false,
    },
    {
      id: 'focused',
      icon: <Target size={24} color="#059669" />,
      title: 'Målmedveten',
      description: 'Håll dig under din dagliga gräns i 7 dagar',
      progress: trophyProgress['focused']?.progress || 0,
      color: '#059669',
      requirement: 7,
      unit: 'dagar',
      unlocked: trophyProgress['focused']?.unlocked || false,
    },
    {
      id: 'streak',
      icon: <Flame size={24} color="#ea580c" />,
      title: 'På Rätt Spår',
      description: 'Använd appen i 30 dagar i rad',
      progress: trophyProgress['streak']?.progress || 0,
      color: '#ea580c',
      requirement: 30,
      unit: 'dagar',
      unlocked: trophyProgress['streak']?.unlocked || false,
    },
    {
      id: 'month',
      icon: <Calendar size={24} color="#0891b2" />,
      title: 'En Månad',
      description: 'Använd mindre än hälften av din ursprungliga mängd i en månad',
      progress: trophyProgress['month']?.progress || 0,
      color: '#0891b2',
      requirement: 100,
      unit: '%',
      unlocked: trophyProgress['month']?.unlocked || false,
    },
    {
      id: 'master',
      icon: <Award size={24} color="#eab308" />,
      title: 'Mästare',
      description: 'Nå ditt slutmål för daglig konsumtion',
      progress: trophyProgress['master']?.progress || 0,
      color: '#eab308',
      requirement: 100,
      unit: '%',
      unlocked: trophyProgress['master']?.unlocked || false,
    },
    {
      id: 'reduction',
      icon: <TrendingDown size={24} color="#2563eb" />,
      title: 'Stor Förbättring',
      description: 'Minska din totala nikotinkonsumtion med 50%',
      progress: trophyProgress['reduction']?.progress || 0,
      color: '#2563eb',
      requirement: 50,
      unit: '%',
      unlocked: trophyProgress['reduction']?.unlocked || false,
    },
    {
      id: 'champion',
      icon: <Star size={24} color="#db2777" />,
      title: 'Champion',
      description: 'Lås upp alla andra trofeer',
      progress: trophyProgress['champion']?.progress || 0,
      color: '#db2777',
      requirement: 7,
      unit: 'trofeer',
      unlocked: trophyProgress['champion']?.unlocked || false,
    },
  ];

  const renderLevelProgress = () => (
    <View style={[styles.levelCard, { 
      backgroundColor: currentTheme.colors.card,
      borderColor: currentTheme.colors.cardBorder
    }]}>
      <View style={styles.levelHeader}>
        <Crown size={32} color={currentTheme.colors.primary} />
        <View>
          <Text style={[styles.levelTitle, { color: currentTheme.colors.text }]}>
            Nivå {userProgress.level}
          </Text>
          <Text style={[styles.levelPoints, { color: currentTheme.colors.textSecondary }]}>
            {userProgress.currentPoints} / {userProgress.pointsToNextLevel} poäng till nästa nivå
          </Text>
        </View>
      </View>
      <View style={[styles.progressBar, { backgroundColor: currentTheme.colors.progressBackground }]}>
        <View 
          style={[
            styles.progressFill,
            { 
              backgroundColor: currentTheme.colors.primary,
              width: `${(userProgress.currentPoints / userProgress.pointsToNextLevel) * 100}%`
            }
          ]} 
        />
      </View>
      <Text style={[styles.totalPoints, { color: currentTheme.colors.textSecondary }]}>
        Totalt: {userProgress.totalPoints} poäng
      </Text>
    </View>
  );

  const renderSectionTabs = () => (
    <View style={styles.sectionTabs}>
      <TouchableOpacity
        style={[
          styles.sectionTab,
          { backgroundColor: selectedSection === 'trophies' ? currentTheme.colors.primary : currentTheme.colors.card }
        ]}
        onPress={() => setSelectedSection('trophies')}
      >
        <Trophy size={20} color={selectedSection === 'trophies' ? '#fff' : currentTheme.colors.text} />
        <Text style={[
          styles.sectionTabText,
          { color: selectedSection === 'trophies' ? '#fff' : currentTheme.colors.text }
        ]}>
          Trofeer
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.sectionTab,
          { backgroundColor: selectedSection === 'challenges' ? currentTheme.colors.primary : currentTheme.colors.card }
        ]}
        onPress={() => setSelectedSection('challenges')}
      >
        <Gift size={20} color={selectedSection === 'challenges' ? '#fff' : currentTheme.colors.text} />
        <Text style={[
          styles.sectionTabText,
          { color: selectedSection === 'challenges' ? '#fff' : currentTheme.colors.text }
        ]}>
          Utmaningar
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.sectionTab,
          { backgroundColor: selectedSection === 'achievements' ? currentTheme.colors.primary : currentTheme.colors.card }
        ]}
        onPress={() => setSelectedSection('achievements')}
      >
        <Medal size={20} color={selectedSection === 'achievements' ? '#fff' : currentTheme.colors.text} />
        <Text style={[
          styles.sectionTabText,
          { color: selectedSection === 'achievements' ? '#fff' : currentTheme.colors.text }
        ]}>
          Prestationer
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderChallenges = () => {
    const activeChallenges = [
      ...dailyChallenges.filter(c => !c.completed),
      ...weeklyChallenges.filter(c => !c.completed),
      ...specialChallenges.filter(c => !c.completed)
    ];

    const completedChallenges = [
      ...dailyChallenges.filter(c => c.completed),
      ...weeklyChallenges.filter(c => c.completed),
      ...specialChallenges.filter(c => c.completed)
    ];

    return (
      <>
        <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
          Aktiva utmaningar
        </Text>
        {activeChallenges.map(challenge => (
          <Animated.View
            key={challenge.id}
            style={[
              styles.challengeCard,
              { 
                backgroundColor: currentTheme.colors.card,
                borderColor: currentTheme.colors.cardBorder
              },
              selectedItem === challenge.id && cardAnimatedStyle
            ]}
          >
            <View style={styles.challengeHeader}>
              <Gift size={24} color={currentTheme.colors.primary} />
              <View style={styles.challengeInfo}>
                <Text style={[styles.challengeTitle, { color: currentTheme.colors.text }]}>
                  {challenge.title}
                </Text>
                <Text style={[styles.challengeType, { color: currentTheme.colors.textSecondary }]}>
                  {challenge.type === 'daily' ? 'Daglig' : 
                   challenge.type === 'weekly' ? 'Veckovis' : 'Special'} • {challenge.points} poäng
                </Text>
              </View>
            </View>
            <Text style={[styles.challengeDescription, { color: currentTheme.colors.textSecondary }]}>
              {challenge.description}
            </Text>
            <View style={[styles.progressBar, { backgroundColor: currentTheme.colors.progressBackground }]}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    backgroundColor: currentTheme.colors.primary,
                    width: `${(challenge.progress / challenge.requirement) * 100}%`
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: currentTheme.colors.textSecondary }]}>
              {challenge.progress} / {challenge.requirement}
            </Text>
          </Animated.View>
        ))}

        {completedChallenges.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text, marginTop: 24 }]}>
              Avklarade utmaningar
            </Text>
            {completedChallenges.map(challenge => (
              <View
                key={challenge.id}
                style={[
                  styles.challengeCard,
                  { 
                    backgroundColor: currentTheme.colors.card,
                    borderColor: currentTheme.colors.success,
                    opacity: 0.8
                  }
                ]}
              >
                <View style={styles.challengeHeader}>
                  <Gift size={24} color={currentTheme.colors.success} />
                  <View style={styles.challengeInfo}>
                    <Text style={[styles.challengeTitle, { color: currentTheme.colors.text }]}>
                      {challenge.title}
                    </Text>
                    <Text style={[styles.challengeType, { color: currentTheme.colors.success }]}>
                      Avklarad • {challenge.points} poäng
                    </Text>
                  </View>
                </View>
                <Text style={[styles.challengeDescription, { color: currentTheme.colors.textSecondary }]}>
                  {challenge.description}
                </Text>
              </View>
            ))}
          </>
        )}
      </>
    );
  };

  const renderAchievements = () => (
    <>
      {achievements.map(achievement => (
        <Animated.View
          key={achievement.id}
          style={[
            styles.achievementCard,
            { 
              backgroundColor: currentTheme.colors.card,
              borderColor: achievement.unlocked ? 
                achievement.tier === 'platinum' ? '#e5e5e5' :
                achievement.tier === 'gold' ? '#ffd700' :
                achievement.tier === 'silver' ? '#c0c0c0' :
                '#cd7f32' :
                currentTheme.colors.cardBorder
            },
            selectedItem === achievement.id && cardAnimatedStyle
          ]}
        >
          <View style={styles.achievementHeader}>
            <Medal 
              size={24} 
              color={
                achievement.tier === 'platinum' ? '#e5e5e5' :
                achievement.tier === 'gold' ? '#ffd700' :
                achievement.tier === 'silver' ? '#c0c0c0' :
                '#cd7f32'
              } 
            />
            <View style={styles.achievementInfo}>
              <Text style={[styles.achievementTitle, { color: currentTheme.colors.text }]}>
                {achievement.title}
              </Text>
              <Text style={[styles.achievementTier, { 
                color: achievement.unlocked ? currentTheme.colors.success : currentTheme.colors.textSecondary 
              }]}>
                {achievement.tier.charAt(0).toUpperCase() + achievement.tier.slice(1)} • {achievement.points} poäng
              </Text>
            </View>
          </View>
          <Text style={[styles.achievementDescription, { color: currentTheme.colors.textSecondary }]}>
            {achievement.description}
          </Text>
          {!achievement.unlocked && (
            <>
              <View style={[styles.progressBar, { backgroundColor: currentTheme.colors.progressBackground }]}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      backgroundColor: 
                        achievement.tier === 'platinum' ? '#e5e5e5' :
                        achievement.tier === 'gold' ? '#ffd700' :
                        achievement.tier === 'silver' ? '#c0c0c0' :
                        '#cd7f32',
                      width: `${(achievement.progress / achievement.requirement) * 100}%`
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.progressText, { color: currentTheme.colors.textSecondary }]}>
                {achievement.progress} / {achievement.requirement}
              </Text>
            </>
          )}
        </Animated.View>
      ))}
    </>
  );

  const renderTrophies = () => (
    <>
      {trophies.map(trophy => (
        <Animated.View
          key={trophy.id}
          style={[
            styles.trophyCard,
            { 
              backgroundColor: currentTheme.colors.card,
              borderColor: trophy.unlocked ? trophy.color : currentTheme.colors.cardBorder
            },
            selectedItem === trophy.id && cardAnimatedStyle
          ]}
        >
          <TouchableOpacity
            style={styles.trophyContent}
            onPress={() => handleItemPress(trophy.id)}
          >
            <View style={styles.trophyHeader}>
              {trophy.icon}
              <View style={styles.trophyTitleContainer}>
                <Text style={[styles.trophyTitle, { color: currentTheme.colors.text }]}>
                  {trophy.title}
                </Text>
                {trophy.unlocked && (
                  <Text style={[styles.unlockedText, { color: trophy.color }]}>
                    Upplåst!
                  </Text>
                )}
              </View>
            </View>
            
            <Text style={[styles.trophyDescription, { color: currentTheme.colors.textSecondary }]}>
              {trophy.description}
            </Text>
            
            <View style={styles.progressSection}>
              <Animated.View 
                style={[
                  styles.progressBar,
                  { backgroundColor: currentTheme.colors.progressBackground },
                  selectedItem === trophy.id && progressAnimatedStyle
                ]}
              >
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${Math.min((trophy.progress / trophy.requirement) * 100, 100)}%`,
                      backgroundColor: trophy.color,
                      opacity: trophy.unlocked ? 1 : 0.7
                    }
                  ]}
                />
              </Animated.View>
              <Text style={[styles.progressText, { color: currentTheme.colors.textSecondary }]}>
                {trophy.progress} / {trophy.requirement} {trophy.unit}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ))}
    </>
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
          <Trophy size={32} color={currentTheme.colors.text} />
          <Text style={[styles.title, { color: currentTheme.colors.text }]}>Prestationer</Text>
        </View>

        {renderLevelProgress()}
        {renderSectionTabs()}

        {selectedSection === 'challenges' && renderChallenges()}
        {selectedSection === 'achievements' && renderAchievements()}
        {selectedSection === 'trophies' && (
          <View style={styles.trophyGrid}>
            {renderTrophies()}
          </View>
        )}
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
  levelCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  levelTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
  },
  levelPoints: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  totalPoints: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  sectionTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  sectionTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  sectionTabText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    marginBottom: 16,
  },
  challengeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  challengeType: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  challengeDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  achievementCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  achievementTier: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  achievementDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    textAlign: 'right',
  },
  trophyGrid: {
    gap: 16,
  },
  trophyCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  trophyContent: {
    padding: 16,
  },
  trophyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  trophyTitleContainer: {
    flex: 1,
  },
  trophyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  trophyDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    marginBottom: 12,
  },
  unlockedText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
    marginTop: 2,
  },
  progressSection: {
    gap: 8,
  },
});