import React from 'react';
import styles from './DeleteModal.module.css';

const DeleteModal = ({ count, deleteForEveryone, onToggleDeleteForEveryone, onDelete, onCancel }) => {
  return (
    <div className={styles.modalBackdrop} onClick={onCancel}>
      <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.deleteModalHeader}>
          Delete messages?
        </div>
        <div className={styles.deleteModalBody}>
          <p>
            {count === 1
              ? 'This message will be removed from your chat history.'
              : `These ${count} messages will be removed from your chat history.`
            }
            <br />
            This action cannot be undone.
          </p>

          <div className={styles.deleteModalCheckbox}>
            <input
              type="checkbox"
              id="deleteForEveryone"
              checked={deleteForEveryone}
              onChange={onToggleDeleteForEveryone}
            />
            <label htmlFor="deleteForEveryone">
              Also remove for everyone in this chat
            </label>
          </div>
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
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;