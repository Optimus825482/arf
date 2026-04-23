export interface StudentMetrics {
  addSubScore?: number;
  mulDivScore?: number;
  speedScore?: number;
  mentalMathScore?: number;
  accuracy?: number;
  perceptionScore?: number;
  concentrationScore?: number;
  fatigueRatio?: number;
  level?: number;
  xp?: number;
  username?: string;
}

export interface UserData {
  username?: string;
  firstName?: string;
  lastName?: string;
  nickname?: string;
  gradeLevel?: string;
  role?: 'student' | 'parent';
  pairingCode?: string;
  level?: number;
  xp?: number;
  shipColor?: string;
  onboardingSeen?: boolean;
  metrics?: StudentMetrics;
  actionPlan?: string;
  learningPath?: string;
  dailyTasks?: {
    date?: string;
    count?: number;
    xp?: number;
  };
  dailyMissionReport?: {
    title?: string;
    summary?: string;
  };
  commanderMessage?: {
    text: string;
    bonusXp: number;
    sentAt: unknown;
    read: boolean;
    fromName: string;
  };
}
