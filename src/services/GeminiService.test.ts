import { describe, it, expect } from 'vitest';
import { GeminiService } from '../services/GeminiService';

describe('GeminiService', () => {
    describe('Mock Mode', () => {
        it('should use mock mode when no API key provided', () => {
            const service = new GeminiService('');
            expect(service['mockMode']).toBe(true);
        });

        it('should generate mock challenges', async () => {
            const service = new GeminiService('');
            const challenge = await service.generateChallenge({ score: 100 });
            expect(challenge).toHaveProperty('id');
            expect(challenge).toHaveProperty('title');
            expect(challenge).toHaveProperty('description');
        });

        it('should generate mock trivia', async () => {
            const service = new GeminiService('');
            const trivia = await service.generateTrivia('neon');
            expect(typeof trivia).toBe('string');
            expect(trivia.length).toBeGreaterThan(0);
        });

        it('should generate mock commentary', async () => {
            const service = new GeminiService('');
            const comment = await service.generateCommentary('Close Call', 150);
            expect(typeof comment).toBe('string');
        });
    });

    describe('Error Handling', () => {
        it('should fallback to mock on API errors', async () => {
            const service = new GeminiService('INVALID_KEY');
            const challenge = await service.generateChallenge({ score: 50 });
            expect(challenge).toBeDefined();
        });
    });
});
