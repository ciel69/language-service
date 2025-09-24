// Интерфейсы для WebSocket событий
export interface StreakUpdateEvent {
  userId: number;
  streakDays: number;
  isNewRecord?: boolean;
}

export interface AchievementEarnedEvent {
  userId: number;
  achievement: {
    id: number;
    title: string;
    description: string;
    icon: string;
    points: number;
    category: string;
  };
  earnedAt: Date;
}
