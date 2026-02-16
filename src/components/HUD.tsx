import React from 'react';
import styles from './HUD.module.css';

interface HUDProps {
    score: number;
    highScore: number;
    activePowerUp: string | null;
}

export const HUD: React.FC<HUDProps> = ({ score, highScore, activePowerUp }) => {
    return (
        <div className={styles.hud}>
            <div className={styles.scoreBoard}>
                <div className={styles.scoreItem}>
                    <span className={styles.label}>SCORE</span>
                    <span className={styles.value}>{score}</span>
                </div>
                <div className={styles.scoreItem}>
                    <span className={styles.label}>HIGH SCORE</span>
                    <span className={styles.value}>{highScore}</span>
                </div>
            </div>

            {activePowerUp && (
                <div className={styles.powerUp}>
                    <span className={styles.powerUpIcon}>⚡</span>
                    <span className={styles.powerUpName}>{activePowerUp.replace('_', ' ')}</span>
                </div>
            )}
        </div>
    );
};
