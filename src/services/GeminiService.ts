import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Challenge } from '../game-engine/types';

export class GeminiService {
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;
    private mockMode: boolean = true;

    constructor(apiKey: string = '') {
        if (apiKey && apiKey.startsWith('AI')) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
            this.mockMode = false;
        } else {
            this.mockMode = true;
        }
    }

    async generateChallenge(gameState: any): Promise<Challenge> {
        if (this.mockMode) {
            return this.generateMockChallenge();
        }

        try {
            const prompt = `
        You are a creative game designer for a modern AI-powered Snake game (2026 edition).
        Generate a unique, funny, short-term challenge that the player must complete.
        
        GAME CONTEXT:
        Score: ${gameState.score}
        Theme: ${document.documentElement.getAttribute('data-theme') || 'neon'}
        
        OUTPUT JSON ONLY:
        {
          "challengeTitle": "string (Short & Punchy)",
          "description": "string (Humorous, 1 sentence)",
          "goalType": "SURVIVE | EAT_TARGET | SCORE_RUSH",
          "targetValue": number,
          "timeLimitSeconds": number (10-30),
          "failureCondition": "DIE | TIME_UP"
        }
        `;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean markdown if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);

            return {
                id: crypto.randomUUID(),
                active: true,
                progress: 0,
                startTime: Date.now(),
                ...data,
                reward: { points: 500 } // Default reward for AI challenges
            } as Challenge;

        } catch (error) {
            console.error("Gemini API Error:", error);
            return this.generateMockChallenge(); // Fallback
        }
    }

    async generateTrivia(theme: string): Promise<string> {
        if (this.mockMode) {
            return this.generateMockTrivia(theme);
        }

        try {
            const prompt = `Generate 1 short, fascinating, or funny trivia fact about '${theme}' logic, history, or aesthetics. Max 1 sentence.`;
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            return this.generateMockTrivia(theme);
        }
    }

    async generateCommentary(event: string, score: number): Promise<string> {
        if (this.mockMode) {
            const comments = [
                "Whoa! Too close!",
                "Slippery snake!",
                "Nice moves!",
                "Living on the edge!",
                "Pixel perfect!"
            ];
            return comments[Math.floor(Math.random() * comments.length)];
        }

        try {
            const prompt = `
            You are a hype-man commentator for a Snake game.
            The player just experienced: "${event}".
            Current Score: ${score}.
            
            Generate a 3-5 word EXCITED reaction.
            Examples: "Unbelievable dodge!", "Clutch move!", "Ice in your veins!"
            `;
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim().replace(/"/g, '');
        } catch (error) {
            return "EPIC!";
        }
    }

    private generateMockChallenge(): Challenge {
        const challenges: Partial<Challenge>[] = [
            {
                title: "Speed Freak",
                description: "The snake had too much espresso! Survive the caffeine rush for 15s!",
                goalType: "SURVIVE",
                targetValue: 15,
                timeLimitSeconds: 15,
                reward: { points: 500, powerUp: "SLOW_MOTION" },
                failureCondition: "DIE"
            },
            {
                title: "Snack Attack",
                description: "You're HANGRY! Devour 5 pellets before you faint from starvation (20s)!",
                goalType: "EAT_TARGET",
                targetValue: 5,
                timeLimitSeconds: 20,
                reward: { points: 300 },
                failureCondition: "TIME_UP"
            },
            // ... more mocks
        ];
        const template = challenges[Math.floor(Math.random() * challenges.length)];
        return {
            id: crypto.randomUUID(),
            active: true,
            progress: 0,
            startTime: Date.now(),
            ...template
        } as Challenge;
    }

    private generateMockTrivia(theme: string): string {
        const facts: Record<string, string[]> = {
            'neon': ["The first cyberpunk story was written in 1980.", "Neon lights were invented in 1910."],
            'jungle': ["The Amazon Rainforest produces 20% of Earth's oxygen.", "Snakes can't blink!"],
            'lava': ["Lava can reach 1,200°C.", "Obsidian is volcanic glass."]
        };
        const list = facts[theme] || facts['neon'];
        return list[Math.floor(Math.random() * list.length)];
    }
}
