import React from 'react';
import styles from './LoadingSpinner.module.css';

const LoadingSpinner = ({ size = 'md', color = 'primary', className = '' }) => {
  const sizeClass = styles[`size${size.charAt(0).toUpperCase() + size.slice(1)}`];
  const colorClass = styles[`color${color.charAt(0).toUpperCase() + color.slice(1)}`];
  
  return (
    <div className={`${styles.spinner} ${sizeClass} ${colorClass} ${className}`}>
      <div className={styles.bounce1}></div>
      <div className={styles.bounce2}></div>
      <div className={styles.bounce3}></div>
    </div>
  );
};

export default LoadingSpinner;