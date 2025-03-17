export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  points: number;
  progress: number;
  requirement: number;
  completed: boolean;
  expiresAt?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  progress: number;
  requirement: number;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface UserProgress {
  level: number;
  currentPoints: number;
  pointsToNextLevel: number;
  totalPoints: number;
  achievements: Achievement[];
  challenges: Challenge[];
  streakPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
}