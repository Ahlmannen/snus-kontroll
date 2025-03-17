import { Tabs } from 'expo-router';
import { Chrome as Home, TrendingUp, Trophy, Settings } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Platform } from 'react-native';
import { useTheme, lightTheme, darkTheme } from '@/hooks/useTheme';

export default function TabLayout() {
  const { theme } = useTheme();
  const currentTheme = theme === 'light' ? lightTheme : darkTheme;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          backgroundColor: Platform.OS === 'web' ? currentTheme.colors.card : 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          ...Platform.select({
            ios: {
              backgroundColor: 'transparent',
            },
          }),
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              tint={theme === 'light' ? 'light' : 'dark'}
              intensity={30}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
        tabBarActiveTintColor: currentTheme.colors.primary,
        tabBarInactiveTintColor: currentTheme.colors.textSecondary,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontFamily: 'Inter-Regular',
          fontSize: 12,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hem',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Home size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Statistik',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <TrendingUp size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="trophies"
        options={{
          title: 'Trofeer',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Trophy size={size} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Inställningar',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.iconContainer}>
              <Settings size={size} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
});