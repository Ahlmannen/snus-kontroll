export type Goal = 'quit' | 'reduce' | 'track';
export type Pace = 'fast' | 'medium' | 'slow';

export interface UserSettings {
  // Grundläggande inställningar
  portionsPerCan: number;
  goal: Goal;
  pace: Pace;
  
  // Daglig användning
  dailyIntake: number;
  targetDailyIntake?: number;
  
  // Kostnader
  costPerCan: number;
  
  // Tidshantering
  snusTime: number;
  targetSnusTime?: number;
  waitTime: number;
  targetWaitTime?: number;
  
  // Innehåll
  nicotineContent: number;
}