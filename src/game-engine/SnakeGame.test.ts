import { describe, it, expect, beforeEach } from 'vitest';
import { SnakeGame } from '../game-engine/SnakeGame';

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
    });

    describe('Collision Detection', () => {
        it('should detect wall collision', () => {
            game.start();
            game.snake[0] = { x: -20, y: 100 };
            game.update(performance.now() + 200);
            expect(game.gameState).toBe('GAME_OVER');
        });

        it('should detect self collision', () => {
            game.start();
            game.snake = [
                { x: 100, y: 100 },
                { x: 120, y: 100 },
                { x: 100, y: 100 } // Head collides with tail
            ];
            game.update(performance.now() + 200);
            expect(game.gameState).toBe('GAME_OVER');
        });
    });

    describe('Food Mechanics', () => {
        it('should increase score when eating food', () => {
            game.start();
            const initialScore = game.score;
            game.snake[0] = { ...game.food };
            game.update(performance.now() + 200);
            expect(game.score).toBeGreaterThan(initialScore);
        });

        it('should grow snake when eating food', () => {
            game.start();
            const initialLength = game.snake.length;
            game.food = { x: game.snake[0].x + 20, y: game.snake[0].y };
            game.direction = 'RIGHT';
            game.update(performance.now() + 200);
            expect(game.snake.length).toBeGreaterThan(initialLength);
        });
    });

    describe('Power-ups', () => {
        it('should activate Ghost Mode correctly', () => {
            game.activatePowerUp('GHOST_MODE');
            expect(game.activePowerUp).toBe('GHOST_MODE');
        });

        it('should prevent death in Ghost Mode', () => {
            game.start();
            game.activatePowerUp('GHOST_MODE');
            game.snake[0] = { x: -20, y: 100 };
            game.handleDeath();
            expect(game.gameState).toBe('PLAYING');
        });
    });

    describe('Boss Mode', () => {
        it('should spawn boss when conditions are met', () => {
            game.start();
            game.score = 600;
            game.spawnBoss();
            expect(game.bossActive).toBe(true);
            expect(game.bossSnake.length).toBeGreaterThan(0);
        });
    });
});
