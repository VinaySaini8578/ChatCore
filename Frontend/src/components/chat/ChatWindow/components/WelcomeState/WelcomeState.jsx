import React from 'react';
import { MessageCircle } from 'lucide-react';
import styles from './WelcomeState.module.css';

const WelcomeState = () => {
  return (
    <div className={styles.chatWindow}>
      <div className={styles.welcomeState}>
        <div className={styles.welcomeContent}>
          <div className={styles.logoContainer}>
            <div className={styles.logo}>
              <MessageCircle className={styles.logoIcon} />
            </div>
            <div className={styles.logoSparkle}></div>
          </div>
          <h2 className={styles.welcomeTitle}>Welcome to ChatCore</h2>
          <p className={styles.welcomeDescription}>
            Select a conversation from the sidebar to start chatting.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeState;