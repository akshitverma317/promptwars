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
                ctx.shadowBlur = index === 0 ? 15 : 10;
                ctx.shadowColor = colors.shadowS;
                ctx.fillStyle = index === 0 ? colors.snakeHead : colors.snakeBody;
                ctx.fillRect(segment.x + 1, segment.y + 1, gridSize - 2, gridSize - 2);
            });

            // Draw Food
            ctx.shadowBlur = 10;
            ctx.shadowColor = colors.shadowF;
            ctx.fillStyle = colors.food;
            ctx.beginPath();
            const foodRadius = gridSize / 2 - 2;
            ctx.arc(game.food.x + gridSize / 2, game.food.y + gridSize / 2, foodRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
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
                    <div className={styles.overlay}>
                        <h1 className={styles.title}>SNAKE 2026</h1>
                        <p className={styles.subtitle}>Press SPACE to Start</p>

                        <div className={styles.apiKeyContainer}>
                            <input
                                type="password"
                                placeholder="Enter Gemini API Key (Optional)"
                                className={styles.apiKeyInput}
                                onChange={(e) => {
                                    localStorage.setItem('gemini_api_key', e.target.value);
                                    // simpler logic: reload to apply for now, or just save
                                }}
                                defaultValue={localStorage.getItem('gemini_api_key') || ''}
                            />
                            <p className={styles.hint}>Leave empty for Mock Mode</p>
                        </div>

                        <div className={styles.controls}>
                            <p>⬆️⬇️⬅️➡️ to Move</p>
                            <p>'T' to Switch Theme</p>
                        </div>
                    </div>
                )}

                {gameState === 'GAME_OVER' && (
                    <div className={styles.overlay}>
                        <h1 className={styles.gameOver}>GAME OVER</h1>
                        <div style={{ textAlign: 'center' }}>
                            <p className={styles.subtitle} style={{ fontSize: '1.2rem', color: '#aaa' }}>Did the wall jump out at you?</p>
                            <p className={styles.score}>Score: {score}</p>
                        </div>
                        <p className={styles.subtitle}>Press SPACE to Retry</p>
                    </div>
                )}
            </div>

            <LearningPanel facts={facts} theme={currentTheme} activeChallenge={activeChallenge} />
        </div>
    );
};
