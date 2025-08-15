import React from 'react';
import styles from './ClearChatModal.module.css';

const ClearChatModal = ({ onConfirm, onCancel }) => {
  return (
    <div className={styles.modalBackdrop} onClick={onCancel}>
      <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.deleteModalHeader}>
          Clear chat history?
        </div>
        <div className={styles.deleteModalBody}>
          <p>
            All messages in this chat will be removed for you.
            <br />
            This action cannot be undone.
          </p>
        </div>
        <div className={styles.deleteModalFooter}>
          <button
            className={`${styles.deleteModalBtn} ${styles.deleteModalCancel}`}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className={`${styles.deleteModalBtn} ${styles.deleteModalConfirm}`}
            onClick={onConfirm}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClearChatModal;
