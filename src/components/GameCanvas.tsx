import React, { useRef, useEffect, useState } from 'react';
import { useGameLoop } from '../hooks/useGameLoop';
import { SnakeGame } from '../game-engine/SnakeGame';
import { geminiService } from '../services/GeminiService';
import { analyticsService } from '../services/AnalyticsService';
import { ParticleSystem } from '../game-engine/ParticleSystem';
import { FeedbackSystem } from '../game-engine/FeedbackSystem';
import { HUD } from './HUD';
import { LearningPanel } from './LearningPanel';
import type { Challenge } from '../game-engine/types';
import styles from './GameCanvas.module.css';
import { GAME_CONFIG, POWER_UP_TYPES } from '../constants/gameConfig';

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
    const particleSystem = useRef<ParticleSystem>(new ParticleSystem());
    const feedbackSystem = useRef<FeedbackSystem>(new FeedbackSystem());
    const stats = useRef({ avgScore: 0, avgSurvival: 0, totalGames: 0 });

    const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAME_OVER'>('MENU');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('snake_highscore') || '0'));
    const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
    const [activePowerUp, setActivePowerUp] = useState<string | null>(null);
    const [currentTheme, setCurrentTheme] = useState('neon');
    const [facts, setFacts] = useState<string[]>([]);
    const [coachingTip, setCoachingTip] = useState<string>('');
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const menuDialogRef = useRef<HTMLDivElement>(null);

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

    const startGame = async () => {
        const speed = await geminiService.suggestDifficulty(stats.current.avgScore, stats.current.avgSurvival);
        gameRef.current.start();
        if (gameRef.current) {
            gameRef.current.gameSpeed = speed;
        }
        setGameState('PLAYING');
        setScore(0);
        setActiveChallenge(null);
        setActivePowerUp(null);
        setCoachingTip('');
        setFacts([]);
        particleSystem.current.particles = [];
        feedbackSystem.current.texts = [];

        feedbackSystem.current.spawn(width / 2, height / 2, "GO!", "#0f0");
        analyticsService.trackGameStart(speed);

        setTimeout(async () => {
            if (gameState === 'MENU' || gameState === 'GAME_OVER') return;
            const challenge = await geminiService.generateChallenge(gameRef.current);
            gameRef.current.activeChallenge = challenge;
        }, GAME_CONFIG.CHALLENGE_INITIAL_DELAY_MS);
    };

    // Handle Input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const game = gameRef.current;
            if (gameState === 'MENU' || gameState === 'GAME_OVER') {
                if (e.code === 'Space') {
                    startGame();
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
                        feedbackSystem.current.spawn(width / 2, height / 2, "THEME SWAP!", "#ff0");
                        break;
                    case 'c':
                        (async () => {
                            const challenge = await geminiService.generateChallenge(game);
                            game.activeChallenge = challenge;
                        })();
                        break;
                    case '?':
                        setShowKeyboardHelp(prev => !prev);
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameState, currentTheme, width, height]);

    // Focus management for dialogs
    useEffect(() => {
        if (gameState === 'MENU' && menuDialogRef.current) {
            const firstFocusable = menuDialogRef.current.querySelector('button, input');
            if (firstFocusable instanceof HTMLElement) {
                firstFocusable.focus();
            }
        }
    }, [gameState]);

    const update = () => {
        const game = gameRef.current;
        if (gameState === 'PLAYING') {
            const prevScore = game.score;
            game.update(performance.now());

            // Particle Trail for Speed
            if (activePowerUp === POWER_UP_TYPES.SPEED_BOOST || game.gameSpeed < 80) {
                const head = game.snake[0];
                if (Math.random() < 0.3) {
                    particleSystem.current.emit(head.x + game.gridSize / 2, head.y + game.gridSize / 2, '#0ff', 1);
                }
            }

            // Check for Close Calls
            const head = game.snake[0];
            if (game.checkCloseCall(head)) {
                (async () => {
                    const comment = await geminiService.generateCommentary("Close Call", game.score);
                    feedbackSystem.current.spawn(width / 2, height / 2 - 50, comment, "#ff0");
                })();
            }

            // Check if score increased (ate food)
            if (game.score > prevScore) {
                const head = game.snake[0];
                particleSystem.current.emit(head.x + game.gridSize / 2, head.y + game.gridSize / 2, '#f0f', 20);

                const phrase = EAT_PHRASES[Math.floor(Math.random() * EAT_PHRASES.length)];
                feedbackSystem.current.spawn(head.x, head.y - 20, phrase, '#fff');

                // Trigger Trivia Generation
                (async () => {
                    const fact = await geminiService.generateTrivia(currentTheme);
                    setFacts(prev => [...prev.slice(-4), fact]);
                })();
            }

            if (game.gameState === 'GAME_OVER') {
                setGameState('GAME_OVER');
                const head = game.snake[0];
                const phrase = DIE_PHRASES[Math.floor(Math.random() * DIE_PHRASES.length)];
                feedbackSystem.current.spawn(head.x, head.y - 40, phrase, '#f00');

                // Update persistent stats
                stats.current.totalGames++;
                stats.current.avgScore = (stats.current.avgScore * (stats.current.totalGames - 1) + game.score) / stats.current.totalGames;

                analyticsService.trackGameOver(game.score, game.deathReason || 'wall', game.closeCalls);

                // Generate AI Coaching Tip
                (async () => {
                    const tip = await geminiService.generatePostGameAnalysis(game.score, game.deathReason || 'wall', game.closeCalls);
                    setCoachingTip(tip);
                    analyticsService.trackAIFeatureUsed('post_game_analysis');
                })();
            }

            if (game.score !== score) {
                setScore(game.score);
            }

            if (game.activePowerUp !== activePowerUp) {
                setActivePowerUp(game.activePowerUp);
                if (game.activePowerUp) {
                    analyticsService.trackPowerUpCollected(game.activePowerUp, game.score);
                }
            }

            if (game.activeChallenge) {
                setActiveChallenge({ ...game.activeChallenge });
            } else {
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

        ctx.fillStyle = colors.bg;
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = colors.grid;
        ctx.lineWidth = 1;
        const gridSize = game.gridSize;

        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }

        if (gameState === 'PLAYING' || gameState === 'GAME_OVER') {
            // Snake
            game.snake.forEach((segment, index) => {
                const isHead = index === 0;
                ctx.shadowBlur = isHead ? 20 : 10;
                ctx.shadowColor = colors.shadowS;
                ctx.fillStyle = isHead ? colors.snakeHead : colors.snakeBody;
                ctx.beginPath();
                ctx.arc(segment.x + gridSize / 2, segment.y + gridSize / 2, gridSize / 2 - (isHead ? 0 : 2), 0, Math.PI * 2);
                ctx.fill();
            });

            // Boss
            if (game.bossActive) {
                game.bossSnake.forEach((segment, index) => {
                    ctx.shadowBlur = index === 0 ? 25 : 10;
                    ctx.shadowColor = '#f00';
                    ctx.fillStyle = index === 0 ? '#ff0000' : '#880000';
                    ctx.fillRect(segment.x + 2, segment.y + 2, gridSize - 4, gridSize - 4);
                });
            }

            // Food
            ctx.shadowBlur = 15;
            ctx.shadowColor = colors.shadowF;
            ctx.fillStyle = colors.food;
            ctx.beginPath();
            const pulse = Math.sin(performance.now() / 200) * 2;
            ctx.arc(game.food.x + gridSize / 2, game.food.y + gridSize / 2, Math.max(0, gridSize / 2 - 2 + pulse), 0, Math.PI * 2);
            ctx.fill();

            // PowerUp
            if (game.powerUpItem) {
                const p = game.powerUpItem;
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#fff';
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(p.x + gridSize / 2, p.y + gridSize / 2, gridSize / 2 - 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('P', p.x + gridSize / 2, p.y + gridSize / 2);
            }
        }

        particleSystem.current.draw(ctx);
        feedbackSystem.current.draw(ctx);
    };

    useGameLoop(() => {
        update();
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) draw(ctx);
        }
    }, true);

    return (
        <div className={styles.container}>
            <a href="#game-title" className="sr-only sr-only-focusable" style={{
                position: 'absolute', top: '10px', left: '10px', zIndex: 100,
                background: '#fff', color: '#000', padding: '10px', borderRadius: '4px'
            }}>
                Skip to Content
            </a>

            <div className={styles.canvasWrapper} role="application" aria-label="Snake 2026 Game Board">
                <canvas ref={canvasRef} width={width} height={height} className={styles.canvas} />
                <HUD score={score} highScore={highScore} activePowerUp={activePowerUp} />

                <button className={styles.helpButton} onClick={() => setShowKeyboardHelp(!showKeyboardHelp)} aria-label="Keyboard Shortcuts Help">?</button>

                {showKeyboardHelp && (
                    <div className={styles.keyboardHelp} role="dialog" aria-modal="true" aria-labelledby="kb-title">
                        <h3 id="kb-title">Shortcuts</h3>
                        <ul>
                            <li><kbd>WASD/Arrows</kbd> Move</li>
                            <li><kbd>Space</kbd> Start</li>
                            <li><kbd>T</kbd> Theme</li>
                            <li><kbd>?</kbd> Help</li>
                        </ul>
                        <button onClick={() => setShowKeyboardHelp(false)}>Close</button>
                    </div>
                )}

                {gameState === 'MENU' && (
                    <div ref={menuDialogRef} className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="game-title">
                        <h1 id="game-title" className={styles.title}>SNAKE 2026</h1>
                        <p className={styles.subtitle}>Press SPACE to Start</p>
                        <div className={styles.apiKeyContainer}>
                            <input
                                type="password"
                                placeholder="Gemini API Key (Optional)"
                                className={styles.apiKeyInput}
                                defaultValue={localStorage.getItem('gemini_api_key') || ''}
                                onChange={(e) => localStorage.setItem('gemini_api_key', e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {gameState === 'GAME_OVER' && (
                    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="go-title">
                        <h1 id="go-title" className={styles.gameOver}>GAME OVER</h1>
                        <p className={styles.score}>Score: {score}</p>
                        {coachingTip && <p className={styles.coaching}>🎯 {coachingTip}</p>}
                        <p className={styles.subtitle}>Press SPACE to Retry</p>
                    </div>
                )}
            </div>

            <div aria-live="polite" className="sr-only">
                {gameState === 'PLAYING' && `Score: ${score}. ${activePowerUp ? `Active: ${activePowerUp}` : ''}`}
            </div>

            <LearningPanel facts={facts} theme={currentTheme} activeChallenge={activeChallenge} />
        </div>
    );
};
