import React from 'react';
import { X, Check } from 'lucide-react';
import { resolveAssetUrl } from '../../../../../services/api';
import LoadingSpinner from '../../../../common/LoadingSpinner/LoadingSpinner';
import styles from './ForwardModal.module.css';

const ForwardModal = ({
  forwardList,
  forwardSearch,
  setForwardSearch,
  forwardLoading,
  selectedForForward,
  toggleForwardSelection,
  forwardToSelected,
  onClose,
}) => {
  const filterForwardList = React.useMemo(() => {
    const q = forwardSearch.trim().toLowerCase();
    if (!q) return forwardList;
    return forwardList.filter((item) => {
      const name = item.isGroup ? item.name : item.fullname;
      const handle = item.isGroup ? item.name : item.username;
      return (name || '').toLowerCase().includes(q) || (handle || '').toLowerCase().includes(q);
    });
  }, [forwardSearch, forwardList]);

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h4>Forward message to...</h4>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <input
            className={styles.modalSearch}
            placeholder="Search chats..."
            value={forwardSearch}
            onChange={(e) => setForwardSearch(e.target.value)}
          />
          {selectedForForward.length > 0 && (
            <div className={styles.selectedForward}>
              <div className={styles.selectedTitle}>
                Selected: {selectedForForward.length}
              </div>
              <div className={styles.selectedList}>
                {selectedForForward.map((item) => (
                  <span key={item._id} className={styles.selectedChip}>
                    {item.isGroup ? item.name : item.fullname}
                    <button onClick={() => toggleForwardSelection(item)}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          {forwardLoading ? (
            <div className={styles.modalLoading}>
              <LoadingSpinner /> Loading...
            </div>
          ) : filterForwardList.length === 0 ? (
            <div className={styles.modalEmpty}>No chats found</div>
          ) : (
            <div className={styles.forwardList}>
              {filterForwardList.map((c) => {
                const isSelected = selectedForForward.some(item => item._id === c._id);
                return (
                  <button
                    key={c._id}
                    className={`${styles.forwardItem} ${isSelected ? styles.forwardItemSelected : ''}`}
                    onClick={() => toggleForwardSelection(c)}
                  >
                    <div className={styles.forwardAvatar}>
                      {c.isGroup ? (
                        c.groupAvatar ? (
                          <img src={resolveAssetUrl(c.groupAvatar)} alt={c.name} />
                        ) : (
                          <span>{(c.name || 'G').slice(0, 1).toUpperCase()}</span>
                        )
                      ) : c.profilepic ? (
                        <img src={resolveAssetUrl(c.profilepic)} alt={c.fullname} />
                      ) : (
                        <span>{(c.fullname || '?').slice(0, 1).toUpperCase()}</span>
                      )}
                    </div>
                    <div className={styles.forwardMeta}>
                      <div className={styles.forwardName}>
                        {c.isGroup ? c.name : c.fullname}
                      </div>
                      <div className={styles.forwardSub}>
                        {c.isGroup ? 'Group' : `@${c.username}`}
                      </div>
                    </div>
                    {isSelected && (
                      <div className={styles.forwardCheck}>
                        <Check size={16} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {selectedForForward.length > 0 && (
          <div className={styles.modalFooter}>
            <button
              className={styles.btnPrimary}
              onClick={forwardToSelected}
            >
              Forward to {selectedForForward.length} chat{selectedForForward.length > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForwardModal;