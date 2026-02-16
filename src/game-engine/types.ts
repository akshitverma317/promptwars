export type Point = {
  x: number;
  y: number;
};

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type GameState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type Challenge = {
  id: string;
  title: string;
  description: string;
  goalType: 'SURVIVE' | 'EAT_TARGET' | 'AVOID_ZONE' | 'BOSS_ESCAPE' | 'SCORE_RUSH' | 'SPECIAL_MISSION';
  targetValue: number;
  timeLimitSeconds: number;
  reward: {
    points: number;
    powerUp?: string;
  };
  failureCondition: string;
  active: boolean;
  progress: number;
  startTime: number;
};

export type SnakeSegment = Point;

export interface GameContextType {
  score: number;
  gameState: GameState;
  challenges: Challenge[];
  activeChallenge: Challenge | null;
}
