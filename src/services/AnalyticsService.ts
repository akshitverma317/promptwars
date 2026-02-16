/**
 * AnalyticsService provides a centralized way to track game events.
 * It is designed to be easily connected to Firebase Analytics or Google Analytics.
 */
export class AnalyticsService {
    private static instance: AnalyticsService;
    private mockMode: boolean = true;

    private constructor() {
        // In a real app, this would initialize Firebase
        // import { getAnalytics, logEvent } from "firebase/analytics";
        // const analytics = getAnalytics();
    }

    public static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    /**
     * Log a gameplay event
     * @param eventName Name of the event
     * @param params Additional event parameters
     */
    public logEvent(eventName: string, params: Record<string, any> = {}) {
        if (this.mockMode) {
            console.log(`[Analytics Mock] Event: ${eventName}`, params);
            return;
        }

        // Real Firebase implementation:
        // logEvent(analytics, eventName, params);
    }

    /**
     * Track a game session starting
     */
    public trackGameStart(difficulty: number) {
        this.logEvent('game_start', {
            difficulty_speed: difficulty,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Track a game over event with performance metrics
     */
    public trackGameOver(score: number, reason: string, closeCalls: number) {
        this.logEvent('game_over', {
            score,
            death_reason: reason,
            close_calls: closeCalls,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Track user interaction with power-ups
     */
    public trackPowerUpCollected(type: string, currentScore: number) {
        this.logEvent('power_up_collected', {
            type,
            score_at_collection: currentScore,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Track AI feature usage
     */
    public trackAIFeatureUsed(featureName: string) {
        this.logEvent('ai_feature_used', {
            feature: featureName,
            timestamp: new Date().toISOString()
        });
    }
}

export const analyticsService = AnalyticsService.getInstance();
