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
    powerUpItem: (Point & { type: string; spawnTime: number }) | null = null;
    closeCalls: number = 0; // Track near misses for AI
    lastCloseCallTime: number = 0;

    // Boss Mode
    bossSnake: SnakeSegment[] = [];
    bossDirection: Direction = 'LEFT';
    bossActive: boolean = false;
    lastBossMoveTime: number = 0;



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
        this.food = this.spawnFood();
        this.powerUpItem = null;
        this.bossSnake = [];
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
            // Player hit boss head -> Mutually assured destruction? 
            // Or just player dies.
            this.handleDeath();
        }
    }

    spawnPowerUp() {
        if (this.powerUpItem) return;
        // 5% chance to spawn if none exists
        if (Math.random() > 0.005) return;

        const types = ['SPEED_BOOST', 'SLOW_MOTION', 'GHOST_MODE', 'MAGNET'];
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
            // Debounce
            if (performance.now() - this.lastCloseCallTime > 2000) {
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

        // Check PowerUp
        if (this.powerUpItem) {
            if (head.x === this.powerUpItem.x && head.y === this.powerUpItem.y) {
                this.activatePowerUp(this.powerUpItem.type);
                this.powerUpItem = null;
                this.score += 50;
            } else if (currTime - this.powerUpItem.spawnTime > 8000) {
                // Despawn after 8s
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

    handleDeath() {
        if (this.activePowerUp === 'GHOST_MODE') return; // Immortal

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
            this.gameSpeed = 150;
        } else if (type === 'SPEED_BOOST') {
            this.gameSpeed = 50;
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
