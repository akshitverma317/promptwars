/**
 * Game Configuration Constants
 * Centralized configuration to improve code quality and reduce magic numbers
 */

export const GAME_CONFIG = {
    // Grid and Board
    DEFAULT_GRID_SIZE: 20,
    DEFAULT_BOARD_WIDTH: 800,
    DEFAULT_BOARD_HEIGHT: 600,

    // Game Speed
    INITIAL_GAME_SPEED: 100,
    MIN_GAME_SPEED: 50,
    SPEED_BOOST_SPEED: 50,
    SLOW_MOTION_SPEED: 150,
    SPEED_INCREMENT_PER_FOOD: 1,

    // Scoring
    POINTS_PER_FOOD: 10,
    POINTS_PER_POWERUP: 50,
    CHALLENGE_REWARD_POINTS: 500,

    // Power-ups
    POWERUP_DURATION_MS: 10000,
    POWERUP_DESPAWN_TIME_MS: 8000,
    POWERUP_SPAWN_CHANCE: 0.005,

    // Boss Mode
    BOSS_SPAWN_SCORE_THRESHOLD: 500,
    BOSS_MOVE_INTERVAL_MS: 150,
    BOSS_INITIAL_LENGTH: 3,

    // Close Call Detection
    CLOSE_CALL_BUFFER_DISTANCE: 20,
    CLOSE_CALL_DEBOUNCE_MS: 2000,

    // Challenge Timing
    CHALLENGE_INITIAL_DELAY_MS: 2000,
    MIN_CHALLENGE_TIME_SECONDS: 10,
    MAX_CHALLENGE_TIME_SECONDS: 30,

    // AI Difficulty
    AI_DIFFICULTY_THRESHOLD_SCORE: 200,
    AI_DIFFICULTY_FAST_SPEED: 80,
    AI_DIFFICULTY_NORMAL_SPEED: 100,
} as const;

export const POWER_UP_TYPES = {
    SPEED_BOOST: 'SPEED_BOOST',
    SLOW_MOTION: 'SLOW_MOTION',
    GHOST_MODE: 'GHOST_MODE',
    MAGNET: 'MAGNET',
} as const;

export const DEATH_REASONS = {
    WALL: 'wall',
    SELF: 'self',
    BOSS: 'boss',
} as const;
