import { describe, it, expect, beforeEach } from 'vitest';
import { SnakeGame } from '../game-engine/SnakeGame';
import { GAME_CONFIG } from '../constants/gameConfig';

describe('SnakeGame', () => {
    let game: SnakeGame;

    beforeEach(() => {
        game = new SnakeGame(800, 600, 20);
    });

    describe('Initialization', () => {
        it('should initialize with correct default state', () => {
            expect(game.score).toBe(0);
            expect(game.gameState).toBe('MENU');
            expect(game.snake.length).toBe(1);
            expect(game.direction).toBe('RIGHT');
        });

        it('should spawn food on initialization', () => {
            expect(game.food).toBeDefined();
            expect(game.food.x).toBeGreaterThanOrEqual(0);
            expect(game.food.y).toBeGreaterThanOrEqual(0);
        });

        it('should initialize with no active power-ups', () => {
            expect(game.activePowerUp).toBeNull();
            expect(game.powerUpItem).toBeNull();
        });

        it('should initialize with boss inactive', () => {
            expect(game.bossActive).toBe(false);
            expect(game.bossSnake.length).toBe(0);
        });
    });

    describe('Movement', () => {
        it('should not allow reverse direction', () => {
            game.direction = 'RIGHT';
            game.changeDirection('LEFT');
            expect(game.nextDirection).toBe('RIGHT');
        });

        it('should allow perpendicular direction changes', () => {
            game.direction = 'RIGHT';
            game.changeDirection('UP');
            expect(game.nextDirection).toBe('UP');
        });

        it('should handle all direction reversals correctly', () => {
            game.direction = 'UP';
            game.nextDirection = 'UP';
            game.changeDirection('DOWN');
            expect(game.nextDirection).toBe('UP');

            game.direction = 'LEFT';
            game.nextDirection = 'LEFT';
            game.changeDirection('RIGHT');
            expect(game.nextDirection).toBe('LEFT');
        });
    });

    describe('Collision Detection - Edge Cases', () => {
        it('should detect wall collision on all four walls', () => {
            game.start();
            game.lastMoveTime = 0; // Force update

            // Top wall
            game.direction = 'UP';
            game.nextDirection = 'UP';
            game.snake[0] = { x: 100, y: 0 };
            game.update(200);
            expect(game.gameState).toBe('GAME_OVER');

            // Reset
            game.start();
            game.lastMoveTime = 0;
            // Bottom wall
            game.direction = 'DOWN';
            game.nextDirection = 'DOWN';
            game.snake[0] = { x: 100, y: game.boardSize.height - game.gridSize };
            game.update(200);
            expect(game.gameState).toBe('GAME_OVER');

            // Reset
            game.start();
            game.lastMoveTime = 0;
            // Left wall
            game.direction = 'LEFT';
            game.nextDirection = 'LEFT';
            game.snake[0] = { x: 0, y: 100 };
            game.update(200);
            expect(game.gameState).toBe('GAME_OVER');

            // Reset
            game.start();
            game.lastMoveTime = 0;
            // Right wall
            game.direction = 'RIGHT';
            game.nextDirection = 'RIGHT';
            game.snake[0] = { x: game.boardSize.width - game.gridSize, y: 100 };
            game.update(200);
            expect(game.gameState).toBe('GAME_OVER');
        });

        it('should detect self collision with long snake', () => {
            game.start();
            game.lastMoveTime = 0;
            // Snake moving RIGHT: head at 140, body at 120, 100, 100, 120
            game.snake = [
                { x: 140, y: 100 },
                { x: 120, y: 100 },
                { x: 100, y: 100 },
                { x: 100, y: 120 },
                { x: 120, y: 120 },
                { x: 140, y: 120 }
            ];
            game.direction = 'DOWN';
            game.nextDirection = 'DOWN';
            // Move head from (140, 100) to (140, 120) which is occupied
            game.update(200);
            expect(game.gameState).toBe('GAME_OVER');
        });

        it('should not detect collision with adjacent segments after a safe move', () => {
            game.start();
            game.lastMoveTime = 0;
            // Snake head at 100, 100. Body at 100, 120 and 100, 140 (Snake facing UP)
            game.snake = [
                { x: 100, y: 100 },
                { x: 100, y: 120 },
                { x: 100, y: 140 }
            ];
            game.direction = 'UP';
            game.nextDirection = 'UP';
            game.update(200);
            expect(game.gameState).toBe('PLAYING');
        });
    });

    describe('Food Mechanics - Edge Cases', () => {
        it('should spawn new food after eating', () => {
            game.start();
            game.lastMoveTime = 0;
            const oldFood = { ...game.food };
            // Place head one step to the left of food
            game.snake[0] = { x: game.food.x - game.gridSize, y: game.food.y };
            game.direction = 'RIGHT';
            game.nextDirection = 'RIGHT';
            game.update(200);
            expect(game.food).not.toEqual(oldFood);
        });

        it('should not spawn food on snake body', () => {
            game.start();
            game.snake = [
                { x: 100, y: 100 },
                { x: 120, y: 100 },
                { x: 140, y: 100 }
            ];
            const food = game.spawnFood();
            const onSnake = game.snake.some(seg => seg.x === food.x && seg.y === food.y);
            expect(onSnake).toBe(false);
        });

        it('should increase speed after eating (non-slow-motion)', () => {
            game.start();
            game.lastMoveTime = 0;
            const initialSpeed = game.gameSpeed;
            // Place head one step above food
            game.snake[0] = { x: game.food.x, y: game.food.y - game.gridSize };
            game.direction = 'DOWN';
            game.nextDirection = 'DOWN';
            game.update(200);
            expect(game.gameSpeed).toBeLessThan(initialSpeed);
        });
    });

    describe('Power-ups - Integration Tests', () => {
        it('should deactivate power-up after duration expires', () => {
            game.start();
            game.activatePowerUp('SPEED_BOOST');
            expect(game.activePowerUp).toBe('SPEED_BOOST');

            // Simulate time passing
            game.powerUpEndTime = performance.now() - 1000;
            game.update(performance.now() + 200);
            expect(game.activePowerUp).toBeNull();
        });

        it('should change game speed for SPEED_BOOST', () => {
            game.start();
            game.activatePowerUp('SPEED_BOOST');
            expect(game.gameSpeed).toBe(50);
        });

        it('should change game speed for SLOW_MOTION', () => {
            game.start();
            game.activatePowerUp('SLOW_MOTION');
            expect(game.gameSpeed).toBe(150);
        });

        it('should despawn power-up after timeout', () => {
            game.start();
            game.powerUpItem = { x: 200, y: 200, type: 'GHOST_MODE', spawnTime: performance.now() - 10000 };
            game.update(performance.now() + 200);
            expect(game.powerUpItem).toBeNull();
        });

        it('should award points when collecting power-up', () => {
            game.start();
            game.lastMoveTime = 0;
            const initialScore = game.score;
            // Place head one step away from power-up
            game.snake[0] = { x: 180, y: 200 };
            game.direction = 'RIGHT';
            game.nextDirection = 'RIGHT';
            game.powerUpItem = { x: 200, y: 200, type: 'MAGNET', spawnTime: performance.now() };
            game.update(200); // This will move head to 200, 200
            expect(game.score).toBe(initialScore + GAME_CONFIG.POINTS_PER_POWERUP);
        });
    });

    describe('Boss Mode - Integration Tests', () => {
        it('should spawn boss at correct position', () => {
            game.start();
            game.score = 600;
            game.spawnBoss();
            expect(game.bossSnake[0].x).toBeGreaterThan(0);
            expect(game.bossSnake[0].y).toBeGreaterThan(0);
        });

        it('should move boss towards food', () => {
            game.start();
            game.score = 600;
            game.spawnBoss();
            const initialBossPos = { ...game.bossSnake[0] };
            game.food = { x: 0, y: game.bossSnake[0].y };
            game.updateBoss(performance.now() + 200);
            expect(game.bossSnake[0]).not.toEqual(initialBossPos);
        });

        it('should trigger game over when player hits boss', () => {
            game.start();
            game.lastMoveTime = 0;
            game.score = 600;
            game.spawnBoss();
            // Place player head one step to the left of boss head
            game.snake[0] = { x: game.bossSnake[0].x - game.gridSize, y: game.bossSnake[0].y };
            game.direction = 'RIGHT';
            game.nextDirection = 'RIGHT';
            game.update(200);
            expect(game.gameState).toBe('GAME_OVER');
        });
    });

    describe('Close Call Detection', () => {
        it('should detect close call near wall', () => {
            game.start();
            game.snake[0] = { x: 10, y: 100 };
            const hasCloseCall = game.checkCloseCall(game.snake[0]);
            expect(hasCloseCall).toBe(true);
        });

        it('should increment close call counter', () => {
            game.start();
            const initialCalls = game.closeCalls;
            game.snake[0] = { x: 10, y: 100 };
            game.checkCloseCall(game.snake[0]);
            expect(game.closeCalls).toBeGreaterThan(initialCalls);
        });

        it('should debounce close call detection', () => {
            game.start();
            game.snake[0] = { x: 10, y: 100 };
            game.checkCloseCall(game.snake[0]);
            const callsAfterFirst = game.closeCalls;
            game.checkCloseCall(game.snake[0]); // Immediate second call
            expect(game.closeCalls).toBe(callsAfterFirst);
        });
    });

    describe('Game State Transitions', () => {
        it('should transition from MENU to PLAYING on start', () => {
            expect(game.gameState).toBe('MENU');
            game.start();
            expect(game.gameState).toBe('PLAYING');
        });

        it('should reset score on start', () => {
            game.score = 500;
            game.start();
            expect(game.score).toBe(0);
        });

        it('should reset snake position on start', () => {
            game.start();
            game.snake = [{ x: 500, y: 500 }];
            game.start();
            expect(game.snake[0]).toEqual({ x: 100, y: 100 });
        });
    });
});
