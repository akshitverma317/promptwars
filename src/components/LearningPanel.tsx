import React, { useEffect, useRef } from 'react';
import styles from './LearningPanel.module.css';
import type { Challenge } from '../game-engine/types';

interface LearningPanelProps {
    facts: string[];
    theme: string;
    activeChallenge: Challenge | null;
}

export const LearningPanel: React.FC<LearningPanelProps> = ({ facts, activeChallenge }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [facts]);

    return (
        <div className={styles.container}>
            {/* Active Challenge Section */}
            <div className={styles.challengeSection}>
                <h2 className={styles.header}>CURRENT MISSION</h2>
                {activeChallenge ? (
                    <div className={styles.activeChallenge}>
                        <h3 className={styles.challengeTitle}>{activeChallenge.title}</h3>
                        <p className={styles.challengeDesc}>{activeChallenge.description}</p>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${Math.min(100, (activeChallenge.progress / activeChallenge.targetValue) * 100)}%` }}
                            />
                        </div>
                        <div className={styles.statusRow}>
                            <span>{Math.floor(activeChallenge.progress)} / {activeChallenge.targetValue}</span>
                            <span className={styles.timer}>
                                {Math.max(0, activeChallenge.timeLimitSeconds - (Date.now() - activeChallenge.startTime) / 1000).toFixed(1)}s
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className={styles.noChallenge}>
                        Pending assignment...
                    </div>
                )}
            </div>

            {/* Facts Section */}
            <div className={styles.divider}></div>
            <h2 className={styles.header}>NEURAL ARCHIVE</h2>
            <div className={styles.factList} ref={scrollRef}>
                {facts.length === 0 && (
                    <div className={styles.emptyState}>
                        Consume matter to decrypt archives...
                    </div>
                )}
                {facts.map((fact, index) => (
                    <div key={index} className={styles.factItem}>
                        <span className={styles.icon}>💡</span>
                        <p className={styles.text}>{fact}</p>
                    </div>
                ))}
            </div>
            <div className={styles.footer}>
                Total Decrypted: {facts.length}
            </div>
        </div>
    );
};
