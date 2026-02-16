import React, { useRef, useEffect, useState } from 'react';
import { useGameLoop } from '../hooks/useGameLoop';
import { SnakeGame } from '../game-engine/SnakeGame';
import { GeminiService } from '../services/GeminiService';
import { ParticleSystem } from '../game-engine/ParticleSystem';
import { FeedbackSystem } from '../game-engine/FeedbackSystem';
import { HUD } from './HUD';
import { LearningPanel } from './LearningPanel';
import type { Challenge } from '../game-engine/types';
import styles from './GameCanvas.module.css';

interface GameCanvasProps {
    width?: number;
    height?: number;
}

const THEMES = ['neon', 'jungle', 'lava'];
const EAT_PHRASES = ["YUM!", "NOM!", "DELISH!", "BURP!", "MORE!", "SNACK!", "CRONCH!", "TASTY!"];
const DIE_PHRASES = ["OUCH!", "OOF!", "RIP", "SNAKE? SNAKE?!", "WASTED", "BONK!", "MY BAD!"];

export const GameCanvas: React.FC<GameCanvasProps> = ({ width = 800, height = 600 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<SnakeGame>(new SnakeGame(width, height));
    const geminiService = useRef<GeminiService>(new GeminiService(import.meta.env.VITE_GEMINI_API_KEY));
    const particleSystem = useRef<ParticleSystem>(new ParticleSystem());
    const feedbackSystem = useRef<FeedbackSystem>(new FeedbackSystem());

    const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAME_OVER'>('MENU');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('snake_highscore') || '0'));
    const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
    const [activePowerUp, setActivePowerUp] = useState<string | null>(null);
    const [currentTheme, setCurrentTheme] = useState('neon');
    const [facts, setFacts] = useState<string[]>([]);
    const [coachingTip, setCoachingTip] = useState<string>('');

    // Apply Theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', currentTheme);
    }, [currentTheme]);

    // Persist High Score
    useEffect(() => {
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('snake_highscore', score.toString());
        }
    }, [score, highScore]);

    // Handle Input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const game = gameRef.current;
            if (gameState === 'MENU' || gameState === 'GAME_OVER') {
                if (e.code === 'Space') {
                    game.start();
                    setGameState('PLAYING');
                    setScore(0);
                    setActiveChallenge(null);
                    setActivePowerUp(null);
                    setFacts([]); // Clear facts on restart
                    particleSystem.current.particles = [];
                    feedbackSystem.current.texts = [];

                    feedbackSystem.current.spawn(width / 2, height / 2, "GO!", "#0f0");

                    setTimeout(async () => {
                        const challenge = await geminiService.current.generateChallenge(game);
                        game.activeChallenge = challenge;
                    }, 2000);
                } else if (e.key === 't') {
                    setCurrentTheme(prev => {
                        const idx = THEMES.indexOf(prev);
                        return THEMES[(idx + 1) % THEMES.length];
                    });
                }
            } else if (gameState === 'PLAYING') {
                switch (e.key) {
                    case 'ArrowUp': game.changeDirection('UP'); break;
                    case 'ArrowDown': game.changeDirection('DOWN'); break;
                    case 'ArrowLeft': game.changeDirection('LEFT'); break;
                    case 'ArrowRight': game.changeDirection('RIGHT'); break;
                    case 't':
                        setCurrentTheme(prev => {
                            const idx = THEMES.indexOf(prev);
                            return THEMES[(idx + 1) % THEMES.length];
                        });
                        const texts = ["THEME SWAP!", "FRESH LOOK!", "STYLISH!"];
                        feedbackSystem.current.spawn(width / 2, height / 2, texts[Math.floor(Math.random() * texts.length)], "#ff0");
                        break;
                    case 'c':
                        (async () => {
                            const challenge = await geminiService.current.generateChallenge(game);
                            game.activeChallenge = challenge;
                        })();
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, currentTheme]); // Added currentTheme dep for trivia context if needed

    const update = () => {
        const game = gameRef.current;
        if (gameState === 'PLAYING') {
            const prevScore = game.score;
            game.update(performance.now());

            // Particle Trail for Speed
            if (activePowerUp === 'SPEED_BOOST' || game.gameSpeed < 80) {
                const head = game.snake[0];
                // Emit fewer particles to avoid clutter
                if (Math.random() < 0.5) {
                    particleSystem.current.emit(head.x + game.gridSize / 2, head.y + game.gridSize / 2, '#0ff', 1);
                }
            }

            // Check for Close Calls
            const head = game.snake[0];
            if (game.checkCloseCall(head)) {
                (async () => {
                    const comment = await geminiService.current.generateCommentary("Close Call", game.score);
                    feedbackSystem.current.spawn(width / 2, height / 2 - 50, comment, "#ff0");
                })();
            }

            // Check if score increased
            if (game.score > prevScore) {
                const head = game.snake[0];
                particleSystem.current.emit(head.x + game.gridSize / 2, head.y + game.gridSize / 2, '#f0f', 20);

                const phrase = EAT_PHRASES[Math.floor(Math.random() * EAT_PHRASES.length)];
                feedbackSystem.current.spawn(head.x, head.y - 20, phrase, '#fff');

                // Trigger Fact Generation
                (async () => {
                    const fact = await geminiService.current.generateTrivia(currentTheme);
                    setFacts(prev => [...prev, fact]);
                })();
            }

            if (game.gameState === 'GAME_OVER') {
                setGameState('GAME_OVER');
                const head = game.snake[0];
                const phrase = DIE_PHRASES[Math.floor(Math.random() * DIE_PHRASES.length)];
                feedbackSystem.current.spawn(head.x, head.y - 40, phrase, '#f00');

                // Generate AI Coaching Tip
                (async () => {
                    const deathReason = head.x < 0 || head.x >= width || head.y < 0 || head.y >= height ? 'wall' : 'self';
                    const tip = await geminiService.current.generatePostGameAnalysis(game.score, deathReason, game.closeCalls);
                    setCoachingTip(tip);
                })();
            }
            if (game.score !== score) {
                setScore(game.score);
            }

            if (game.activePowerUp !== activePowerUp) {
                setActivePowerUp(game.activePowerUp);
            }

            if (game.activeChallenge) {
                if (!activeChallenge || activeChallenge.id !== game.activeChallenge.id ||
                    activeChallenge.progress !== game.activeChallenge.progress ||
                    activeChallenge.active !== game.activeChallenge.active) {

                    if (game.activeChallenge.active === false && activeChallenge?.active === true) {
                        feedbackSystem.current.spawn(width / 2, height / 3, "CHALLENGE DONE!", "#0f0");
                    }

                    setActiveChallenge({ ...game.activeChallenge });
                }
            } else if (activeChallenge) {
                setActiveChallenge(null);
            }
        }

        particleSystem.current.update();
        feedbackSystem.current.update();
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
        const game = gameRef.current;

        let colors = { bg: '#050510', grid: 'rgba(255,255,255,0.05)', snakeHead: '#fff', snakeBody: '#0ff', food: '#f0f', shadowS: '#0ff', shadowF: '#f0f' };

        if (currentTheme === 'jungle') {
            colors = { bg: '#0a1f0a', grid: 'rgba(0,255,0,0.1)', snakeHead: '#e0ffe0', snakeBody: '#0f0', food: '#ff0', shadowS: '#0f0', shadowF: '#ff0' };
        } else if (currentTheme === 'lava') {
            colors = { bg: '#1a0505', grid: 'rgba(255,80,0,0.1)', snakeHead: '#ffe0e0', snakeBody: '#f50', food: '#ff0', shadowS: '#f50', shadowF: '#ff0' };
        }

        // Clear screen
        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        const gridSize = game.gridSize;

        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        if (gameState === 'PLAYING' || gameState === 'GAME_OVER') {
            // Draw Snake
            game.snake.forEach((segment, index) => {
                const isHead = index === 0;
                const isTail = index === game.snake.length - 1;

                const x = segment.x + gridSize / 2;
                const y = segment.y + gridSize / 2;
                // Taper the tail
                const radius = isHead ? gridSize / 2 : (isTail ? (gridSize / 2) - 4 : (gridSize / 2) - 2);

                ctx.shadowBlur = isHead ? 20 : 10;
                ctx.shadowColor = colors.shadowS;
                ctx.fillStyle = isHead ? colors.snakeHead : colors.snakeBody;

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();

                // Draw Eyes on Head
                if (isHead) {
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = '#000'; // Eye color
                    const eyeOffset = radius * 0.4;
                    const eyeSize = radius * 0.25;

                    let eyeX1, eyeY1, eyeX2, eyeY2;

                    switch (game.direction) {
                        case 'UP':
                            eyeX1 = x - eyeOffset; eyeY1 = y - eyeOffset;
                            eyeX2 = x + eyeOffset; eyeY2 = y - eyeOffset;
                            break;
                        case 'DOWN':
                            eyeX1 = x - eyeOffset; eyeY1 = y + eyeOffset;
                            eyeX2 = x + eyeOffset; eyeY2 = y + eyeOffset;
                            break;
                        case 'LEFT':
                            eyeX1 = x - eyeOffset; eyeY1 = y - eyeOffset;
                            eyeX2 = x - eyeOffset; eyeY2 = y + eyeOffset;
                            break;
                        case 'RIGHT':
                            eyeX1 = x + eyeOffset; eyeY1 = y - eyeOffset;
                            eyeX2 = x + eyeOffset; eyeY2 = y + eyeOffset;
                            break;
                    }

                    if (eyeX1 !== undefined) {
                        ctx.beginPath();
                        ctx.arc(eyeX1, eyeY1, eyeSize, 0, Math.PI * 2);
                        ctx.arc(eyeX2, eyeY2, eyeSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            });

            // Draw Boss Snake
            if (game.bossActive) {
                game.bossSnake.forEach((segment, index) => {
                    const isHead = index === 0;

                    ctx.shadowBlur = isHead ? 25 : 10;
                    ctx.shadowColor = '#f00';
                    ctx.fillStyle = isHead ? '#ff0000' : '#880000';

                    // Draw jagged/square segments for "Evil" look
                    ctx.fillRect(segment.x + 2, segment.y + 2, gridSize - 4, gridSize - 4);
                });
            }

            // Draw Food
            ctx.shadowBlur = 15;
            ctx.shadowColor = colors.shadowF;
            ctx.fillStyle = colors.food;
            ctx.beginPath();
            const foodRadius = gridSize / 2 - 2;

            // Pulsing effect for food
            const pulse = Math.sin(performance.now() / 200) * 2;
            ctx.arc(game.food.x + gridSize / 2, game.food.y + gridSize / 2, Math.max(0, foodRadius + pulse), 0, Math.PI * 2);
            ctx.fill();

            // Food Inner Glow
            ctx.fillStyle = '#fff';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(game.food.x + gridSize / 2 - 2, game.food.y + gridSize / 2 - 2, foodRadius * 0.3, 0, Math.PI * 2);
            ctx.fill();

            // Draw PowerUp
            if (game.powerUpItem) {
                const p = game.powerUpItem;
                const px = p.x + gridSize / 2;
                const py = p.y + gridSize / 2;

                let pColor = '#fff';
                let pText = '?';

                switch (p.type) {
                    case 'SPEED_BOOST': pColor = '#0ff'; pText = '⚡'; break;
                    case 'SLOW_MOTION': pColor = '#0f0'; pText = '🐌'; break;
                    case 'GHOST_MODE': pColor = '#aaa'; pText = '👻'; break;
                    case 'MAGNET': pColor = '#f0f'; pText = '🧲'; break;
                }

                ctx.shadowBlur = 10;
                ctx.shadowColor = pColor;
                ctx.fillStyle = pColor;
                ctx.beginPath();
                ctx.arc(px, py, gridSize / 2 - 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#000';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(pText, px, py);
            }
        }

        // Draw particles and feedback
        particleSystem.current.draw(ctx);
        feedbackSystem.current.draw(ctx);
    };

    useGameLoop(() => {
        update();
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                draw(ctx);
            }
        }
    }, true);

    return (
        <div className={styles.wrapper}>
            <div className={styles.gameArea}>
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    className={styles.canvas}
                />

                <HUD score={score} highScore={highScore} activePowerUp={activePowerUp} />
                {/* ChallengeOverlay removed - moved to sidebar */}

                {gameState === 'MENU' && (
                    <div className={styles.overlay} role="dialog" aria-labelledby="game-title" aria-describedby="game-instructions">
                        <h1 id="game-title" className={styles.title}>SNAKE 2026</h1>
                        <p id="game-instructions" className={styles.subtitle}>Press SPACE to Start</p>

                        <div className={styles.apiKeyContainer}>
                            <label htmlFor="api-key-input" className="sr-only">Gemini API Key</label>
                            <input
                                id="api-key-input"
                                type="password"
                                placeholder="Enter Gemini API Key (Optional)"
                                className={styles.apiKeyInput}
                                aria-label="Gemini API Key for AI features"
                                onChange={(e) => {
                                    localStorage.setItem('gemini_api_key', e.target.value);
                                }}
                                defaultValue={localStorage.getItem('gemini_api_key') || ''}
                            />
                            <p className={styles.hint} aria-live="polite">Leave empty for Mock Mode</p>
                        </div>

                        <div className={styles.controls} role="list" aria-label="Game controls">
                            <p role="listitem">⬆️⬇️⬅️➡️ to Move</p>
                            <p role="listitem">'T' to Switch Theme</p>
                        </div>
                    </div>
                )}

                {gameState === 'GAME_OVER' && (
                    <div className={styles.overlay} role="dialog" aria-labelledby="game-over-title" aria-describedby="final-score">
                        <h1 id="game-over-title" className={styles.gameOver}>GAME OVER</h1>
                        <div style={{ textAlign: 'center' }}>
                            <p className={styles.subtitle} style={{ fontSize: '1.2rem', color: '#aaa' }}>Did the wall jump out at you?</p>
                            <p id="final-score" className={styles.score} aria-live="assertive">Score: {score}</p>
                            {coachingTip && (
                                <p style={{ color: '#0ff', marginTop: '1rem', fontStyle: 'italic' }}>
                                    🎯 {coachingTip}
                                </p>
                            )}
                        </div>
                        <p className={styles.subtitle}>Press SPACE to Retry</p>
                    </div>
                )}
            </div>

            {/* Screen Reader Live Region for Game Events */}
            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {gameState === 'PLAYING' && `Score: ${score}. ${activePowerUp ? `Active power-up: ${activePowerUp}` : ''}`}
            </div>

            <LearningPanel facts={facts} theme={currentTheme} activeChallenge={activeChallenge} />
        </div>
    );
};
