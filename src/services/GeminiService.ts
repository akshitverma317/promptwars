import type { Challenge } from '../game-engine/types';

export class GeminiService {
    private mockMode: boolean;

    constructor(_apiKey: string = '') {
        this.mockMode = true;
    }

    async generateChallenge(_gameState: any): Promise<Challenge> {
        if (this.mockMode) {
            return this.generateMockChallenge();
        }
        return this.generateMockChallenge();
    }

    async generateTrivia(theme: string): Promise<string> {
        if (this.mockMode) {
            return this.generateMockTrivia(theme);
        }
        return this.generateMockTrivia(theme);
    }

    private generateMockChallenge(): Challenge {
        // ... same as before
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
            {
                title: "Claustrophobia",
                description: "The walls are looking at you funny... Don't touch them for 20s!",
                goalType: "SURVIVE",
                targetValue: 20,
                timeLimitSeconds: 20,
                reward: { points: 400 },
                failureCondition: "DIE"
            },
            {
                title: "Diet Starts Tomorrow",
                description: "Eat 3 pellets. No excuses! (15s)",
                goalType: "EAT_TARGET",
                targetValue: 3,
                timeLimitSeconds: 15,
                reward: { points: 250 },
                failureCondition: "TIME_UP"
            }
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
            'neon': [
                "Did you know? The first cyberpunk story was written in 1980 by Bruce Bethke.",
                "Neon lights were invented in 1910 by Georges Claude.",
                "The term 'Cyberspace' was coined by William Gibson in 'Neuromancer'.",
                "In 2026, AI is expected to write 90% of code. (Wait, that's me!)",
                "Blade Runner is set in 2019. We are already in the future!",
                "Synthwave music mimics 80s soundtracks but is a modern genre."
            ],
            'jungle': [
                "The Amazon Rainforest produces 20% of the world's oxygen.",
                "Snakes can't blink! They have no eyelids.",
                "There are over 3,000 species of snakes in the world.",
                "Some snakes can fly (glide) up to 100 meters!",
                "The Titanoboa was a prehistoric snake 42 feet long.",
                "Jungle rot is real... but hopefully not in this game."
            ],
            'lava': [
                "Lava can reach temperatures of 1,200°C (2,200°F).",
                "Obsidian is volcanic glass formed by rapidly cooling lava.",
                "There are over 1,500 active volcanoes on Earth.",
                "The floor is lava! (A classic childhood game).",
                "Volcanic ash is good for soil fertility.",
                "Magma is lava before it erupts."
            ]
        };

        const themeFacts = facts[theme] || facts['neon'];
        return themeFacts[Math.floor(Math.random() * themeFacts.length)];
    }
}
