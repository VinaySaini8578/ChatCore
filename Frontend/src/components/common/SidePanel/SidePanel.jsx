import React, { useEffect } from 'react';
import styles from './SidePanel.module.css';

const SidePanel = ({ title, icon: Icon, isOpen, onClose, children, width = 420 }) => {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    if (isOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <aside className={styles.panel} style={{ width }}>
        <header className={styles.header}>
          {Icon ? <Icon className={styles.headerIcon} /> : null}
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close panel">×</button>
        </header>
        <div className={styles.content}>{children}</div>
      </aside>
    </>
  );
};

export default SidePanel;