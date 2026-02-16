import type { Point, Direction, GameState, SnakeSegment, Challenge } from './types';

export class SnakeGame {
    snake: SnakeSegment[];
    direction: Direction;
    nextDirection: Direction;
    food: Point;
    score: number;
    gameState: GameState;
    activeChallenge: Challenge | null;
    gridSize: number;
    boardSize: { width: number; height: number };
    gameSpeed: number; // ms per move
    lastMoveTime: number;
    activePowerUp: string | null = null;
    powerUpEndTime: number = 0;

    constructor(width: number, height: number, gridSize: number = 20) {
        this.gridSize = gridSize;
        this.boardSize = { width, height };
        this.snake = [{ x: 5 * gridSize, y: 5 * gridSize }];
        this.direction = 'RIGHT';
        this.nextDirection = 'RIGHT';
        this.activeChallenge = null;
        this.score = 0;
        this.gameState = 'MENU';
        this.gameSpeed = 100;
        this.lastMoveTime = 0;
        this.food = this.spawnFood();
    }

    spawnFood(): Point {
        const cols = Math.floor(this.boardSize.width / this.gridSize);
        const rows = Math.floor(this.boardSize.height / this.gridSize);

        let food: Point;
        let valid = false;
        let attempts = 0;
        while (!valid && attempts < 100) {
            food = {
                x: Math.floor(Math.random() * cols) * this.gridSize,
                y: Math.floor(Math.random() * rows) * this.gridSize
            };
            // eslint-disable-next-line no-loop-func
            valid = !this.snake.some(segment => segment.x === food.x && segment.y === food.y);
            if (valid) return food;
            attempts++;
        }
        return { x: 0, y: 0 };
    }

    changeDirection(dir: Direction) {
        if (this.direction === 'UP' && dir === 'DOWN') return;
        if (this.direction === 'DOWN' && dir === 'UP') return;
        if (this.direction === 'LEFT' && dir === 'RIGHT') return;
        if (this.direction === 'RIGHT' && dir === 'LEFT') return;
        this.nextDirection = dir;
    }

    update(currTime: number) {
        if (this.gameState !== 'PLAYING') return;

        // Handle PowerUps
        if (this.activePowerUp && currTime > this.powerUpEndTime) {
            this.deactivatePowerUp();
        }

        // Check challenge time limit
        if (this.activeChallenge && this.activeChallenge.active) {
            const elapsed = (currTime - this.activeChallenge.startTime) / 1000;
            if (elapsed >= this.activeChallenge.timeLimitSeconds) {
                if (this.activeChallenge.goalType === 'SURVIVE') {
                    this.completeChallenge(true);
                } else {
                    this.completeChallenge(false);
                }
            }
        }

        if (currTime - this.lastMoveTime < this.gameSpeed) return;
        this.lastMoveTime = currTime;

        this.direction = this.nextDirection;

        const head = { ...this.snake[0] };

        switch (this.direction) {
            case 'UP': head.y -= this.gridSize; break;
            case 'DOWN': head.y += this.gridSize; break;
            case 'LEFT': head.x -= this.gridSize; break;
            case 'RIGHT': head.x += this.gridSize; break;
        }

        // Wall collision
        if (head.x < 0 || head.x >= this.boardSize.width || head.y < 0 || head.y >= this.boardSize.height) {
            this.handleDeath();
            return;
        }

        // Self collision
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.handleDeath();
            return;
        }

        this.snake.unshift(head);

        // Check food
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.food = this.spawnFood();
            // Increase speed if not in SLOW_MOTION
            if (this.activePowerUp !== 'SLOW_MOTION') {
                this.gameSpeed = Math.max(50, this.gameSpeed - 1);
            }

            if (this.activeChallenge && this.activeChallenge.goalType === 'EAT_TARGET') {
                this.activeChallenge.progress += 1;
                if (this.activeChallenge.progress >= this.activeChallenge.targetValue) {
                    this.completeChallenge(true);
                }
            }
        } else {
            this.snake.pop();
        }
    }

    handleDeath() {
        this.gameState = 'GAME_OVER';
        if (this.activeChallenge) {
            this.completeChallenge(false);
        }
    }

    completeChallenge(success: boolean) {
        if (!this.activeChallenge) return;

        if (success) {
            this.score += this.activeChallenge.reward.points;
            if (this.activeChallenge.reward.powerUp) {
                this.activatePowerUp(this.activeChallenge.reward.powerUp);
            }
        }

        this.activeChallenge.active = false;
        this.activeChallenge = null;
    }

    activatePowerUp(type: string) {
        this.activePowerUp = type;
        this.powerUpEndTime = performance.now() + 10000; // 10 seconds duration

        if (type === 'SLOW_MOTION') {
            this.gameSpeed = 150; // Slow down
        }
    }

    deactivatePowerUp() {
        if (this.activePowerUp === 'SLOW_MOTION') {
            // Reset speed logic based on score or just default
            // A simple reset:
            this.gameSpeed = Math.max(50, 100 - Math.floor(this.score / 100));
        }
        this.activePowerUp = null;
    }

    start() {
        this.gameState = 'PLAYING';
        this.score = 0;
        this.snake = [{ x: 5 * this.gridSize, y: 5 * this.gridSize }];
        this.direction = 'RIGHT';
        this.nextDirection = 'RIGHT';
        this.food = this.spawnFood();
        this.lastMoveTime = performance.now();
        this.activeChallenge = null;
        this.activePowerUp = null;
        this.gameSpeed = 100;
    }
}
