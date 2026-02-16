import type { Point, Direction, GameState, SnakeSegment, Challenge } from './types';
import { GAME_CONFIG, POWER_UP_TYPES, DEATH_REASONS } from '../constants/gameConfig';

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
    gameSpeed: number = GAME_CONFIG.INITIAL_GAME_SPEED; // ms per move
    lastMoveTime: number;
    activePowerUp: string | null = null;
    powerUpEndTime: number = 0;
    powerUpItem: (Point & { type: string; spawnTime: number }) | null = null;
    closeCalls: number = 0; // Track near misses for AI
    lastCloseCallTime: number = 0;

    // Boss Mode
    bossSnake: SnakeSegment[] = [];
    bossDirection: Direction = 'LEFT';
    bossActive: boolean = false;
    lastBossMoveTime: number = 0;
    deathReason: string | null = null;



    constructor(width: number, height: number, gridSize: number = GAME_CONFIG.DEFAULT_GRID_SIZE) {
        this.gridSize = gridSize;
        this.boardSize = { width, height };
        this.snake = [{ x: 100, y: 100 }];
        this.direction = 'RIGHT';
        this.nextDirection = 'RIGHT';
        this.activeChallenge = null;
        this.score = 0;
        this.gameState = 'MENU';
        this.gameSpeed = GAME_CONFIG.INITIAL_GAME_SPEED;
        this.lastMoveTime = 0;
        this.food = this.spawnFood();
        this.powerUpItem = null;
        this.bossSnake = [];
    }

    start() {
        this.snake = [{ x: 100, y: 100 }];
        this.direction = 'RIGHT';
        this.nextDirection = 'RIGHT';
        this.score = 0;
        this.gameState = 'PLAYING';
        this.gameSpeed = GAME_CONFIG.INITIAL_GAME_SPEED;
        this.food = this.spawnFood();
        this.powerUpItem = null;
        this.activePowerUp = null;
        this.bossActive = false;
        this.bossSnake = [];
        this.closeCalls = 0;
        this.deathReason = null;
        this.lastMoveTime = performance.now();
        this.lastCloseCallTime = -GAME_CONFIG.CLOSE_CALL_DEBOUNCE_MS; // Allow first call immediately
    }

    spawnBoss() {
        // Spawn on the right side
        const x = (this.boardSize.width / this.gridSize) - 5;
        const y = Math.floor((this.boardSize.height / this.gridSize) / 2);

        this.bossSnake = [
            { x: x * this.gridSize, y: y * this.gridSize },
            { x: (x + 1) * this.gridSize, y: y * this.gridSize },
            { x: (x + 2) * this.gridSize, y: y * this.gridSize }
        ];
        this.bossActive = true;
        this.bossDirection = 'LEFT';
    }

    updateBoss(currTime: number) {
        if (!this.bossActive) return;

        // Boss moves slower (every 150ms)
        if (currTime - this.lastBossMoveTime < 150) return;
        this.lastBossMoveTime = currTime;

        const head = { ...this.bossSnake[0] };

        // Simple AI: Move towards food
        if (head.x < this.food.x) this.bossDirection = 'RIGHT';
        else if (head.x > this.food.x) this.bossDirection = 'LEFT';
        else if (head.y < this.food.y) this.bossDirection = 'DOWN';
        else if (head.y > this.food.y) this.bossDirection = 'UP';

        // Basic collision avoidance (very simple)
        // ... (omitted for brevity, just direct pathing for now)

        switch (this.bossDirection) {
            case 'UP': head.y -= this.gridSize; break;
            case 'DOWN': head.y += this.gridSize; break;
            case 'LEFT': head.x -= this.gridSize; break;
            case 'RIGHT': head.x += this.gridSize; break;
        }

        this.bossSnake.unshift(head);

        // Check food (Boss steals food!)
        if (Math.abs(head.x - this.food.x) < 5 && Math.abs(head.y - this.food.y) < 5) {
            this.food = this.spawnFood(); // Boss eats it
        } else {
            this.bossSnake.pop();
        }

        // Check collision with player
        if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
            // Player hit boss head
            this.handleDeath(DEATH_REASONS.BOSS);
        }
    }

    spawnPowerUp() {
        if (this.powerUpItem) return;
        // Check spawn chance from config
        if (Math.random() > GAME_CONFIG.POWERUP_SPAWN_CHANCE) return;

        const types = Object.values(POWER_UP_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];

        const cols = Math.floor(this.boardSize.width / this.gridSize);
        const rows = Math.floor(this.boardSize.height / this.gridSize);

        let point: Point = { x: 0, y: 0 };
        let valid = false;
        while (!valid) {
            point = {
                x: Math.floor(Math.random() * cols) * this.gridSize,
                y: Math.floor(Math.random() * rows) * this.gridSize
            };
            valid = !this.snake.some(segment => segment.x === point.x && segment.y === point.y) &&
                !(point.x === this.food.x && point.y === this.food.y);
        }

        this.powerUpItem = { ...point, type, spawnTime: performance.now() };
    }

    checkCloseCall(head: Point) {
        // Check 1 block radius for walls or body
        const buffer = this.gridSize;
        const nearWall = head.x < buffer || head.x >= this.boardSize.width - buffer ||
            head.y < buffer || head.y >= this.boardSize.height - buffer;

        const nearSelf = this.snake.some((seg, idx) => {
            if (idx < 3) return false; // Ignore head/neck
            return Math.abs(seg.x - head.x) + Math.abs(seg.y - head.y) <= buffer;
        });

        if (nearWall || nearSelf) {
            // Debounce using configured interval
            if (performance.now() - this.lastCloseCallTime > GAME_CONFIG.CLOSE_CALL_DEBOUNCE_MS) {
                this.closeCalls++;
                this.lastCloseCallTime = performance.now();
                return true;
            }
        }
        return false;
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
            this.handleDeath(DEATH_REASONS.WALL);
            return;
        }

        // Self collision
        if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            this.handleDeath(DEATH_REASONS.SELF);
            return;
        }

        this.snake.unshift(head);

        // Check food
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += GAME_CONFIG.POINTS_PER_FOOD;
            this.food = this.spawnFood();
            // Increase speed if not in SLOW_MOTION
            if (this.activePowerUp !== POWER_UP_TYPES.SLOW_MOTION) {
                this.gameSpeed = Math.max(GAME_CONFIG.MIN_GAME_SPEED, this.gameSpeed - GAME_CONFIG.SPEED_INCREMENT_PER_FOOD);
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

        // Check PowerUp
        if (this.powerUpItem) {
            if (head.x === this.powerUpItem.x && head.y === this.powerUpItem.y) {
                this.activatePowerUp(this.powerUpItem.type);
                this.powerUpItem = null;
                this.score += GAME_CONFIG.POINTS_PER_POWERUP;
            } else if (currTime - this.powerUpItem.spawnTime > GAME_CONFIG.POWERUP_DESPAWN_TIME_MS) {
                // Despawn after timeout
                this.powerUpItem = null;
            }
        } else {
            this.spawnPowerUp();
        }

        this.checkCloseCall(head);

        // Update Boss
        if (this.activeChallenge?.goalType === 'BOSS_ESCAPE' || this.score > 500) {
            if (!this.bossActive) this.spawnBoss();
            this.updateBoss(currTime);

            // Player hits body of boss
            if (this.bossActive && this.bossSnake.some(b => b.x === head.x && b.y === head.y)) {
                this.handleDeath();
            }
        }
    }

    handleDeath(reason: string = DEATH_REASONS.WALL) {
        if (this.activePowerUp === POWER_UP_TYPES.GHOST_MODE) return; // Immortal

        this.deathReason = reason;
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
        this.powerUpEndTime = performance.now() + GAME_CONFIG.POWERUP_DURATION_MS;

        if (type === POWER_UP_TYPES.SLOW_MOTION) {
            this.gameSpeed = GAME_CONFIG.SLOW_MOTION_SPEED;
        } else if (type === POWER_UP_TYPES.SPEED_BOOST) {
            this.gameSpeed = GAME_CONFIG.SPEED_BOOST_SPEED;
        }
    }

    deactivatePowerUp() {
        if (this.activePowerUp === POWER_UP_TYPES.SLOW_MOTION) {
            // Reset speed based on score threshold
            this.gameSpeed = Math.max(GAME_CONFIG.MIN_GAME_SPEED, GAME_CONFIG.INITIAL_GAME_SPEED - Math.floor(this.score / 100));
        }
        this.activePowerUp = null;
    }
}
