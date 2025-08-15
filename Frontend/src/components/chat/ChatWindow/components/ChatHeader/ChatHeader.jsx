import React from 'react';
import { Archive, ArchiveRestore, Edit3, ShieldBan, ShieldCheck, Trash2, X, Forward, Check } from 'lucide-react';
import { resolveAssetUrl } from '../../../../../services/api';
import styles from './ChatHeader.module.css';

const ChatHeader = ({
  selectedUser,
  isUserOnline,
  isOtherUserTyping,
  archived,
  blocked,
  onClose,
  onArchive,
  onBlock,
  onClearChat,
  onEditGroup,
  selectionMode,
  selectedCount,
  onCancelSelection,
  onDeleteSelected,
  onForwardSelected
}) => {
  
  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  // Regular header view
  const renderNormalHeader = () => (
    <>
      <div className={styles.userInfo}>
        <div className={styles.avatar}>
          {selectedUser.isGroup ? (
            selectedUser.groupAvatar ? (
              <img
                src={resolveAssetUrl(selectedUser.groupAvatar)}
                alt={selectedUser.name}
                className={styles.avatarImage}
              />
            ) : (
              <span className={styles.avatarText}>
                {(selectedUser.name || '?').slice(0, 2).toUpperCase()}
              </span>
            )
          ) : selectedUser.profilepic ? (
            <img
              src={resolveAssetUrl(selectedUser.profilepic)}
              alt={selectedUser.fullname}
              className={styles.avatarImage}
            />
          ) : (
            <span className={styles.avatarText}>{getInitials(selectedUser.fullname)}</span>
          )}
          {!selectedUser.isGroup && isUserOnline(selectedUser._id) && (
            <div className={styles.onlineDot}></div>
          )}
        </div>
        <div className={styles.userDetails}>
          <h3 className={styles.userName}>
            {selectedUser.isGroup ? selectedUser.name : selectedUser.fullname}
          </h3>
          <div className={styles.userStatus}>
            {selectedUser.isGroup ? (
              <span className={styles.statusText}>Group</span>
            ) : isOtherUserTyping ? (
              <div className={styles.typingIndicator}>
                <span className={styles.typingText}>typing</span>
                <div className={styles.typingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            ) : (
              <span className={styles.statusText}>
                {isUserOnline(selectedUser._id) ? 'online' : 'offline'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.headerActions}>
        {selectedUser.isGroup && (
          <button
            className={styles.headerButton}
            title="Edit group"
            onClick={onEditGroup}
          >
            <Edit3 className={styles.headerIcon} />
          </button>
        )}
        <button
          className={styles.headerButton}
          title={archived ? 'Unarchive chat' : 'Archive chat'}
          onClick={onArchive}
        >
          {archived ? (
            <ArchiveRestore className={styles.headerIcon} />
          ) : (
            <Archive className={styles.headerIcon} />
          )}
        </button>
        <button
          className={styles.headerButton}
          title="Clear chat"
          onClick={onClearChat}
        >
          <Trash2 className={styles.headerIcon} />
        </button>
        {!selectedUser.isGroup && (
          <button
            className={styles.headerButton}
            title={blocked ? 'Unblock user' : 'Block user'}
            onClick={onBlock}
          >
            {blocked ? (
              <ShieldCheck className={styles.headerIcon} />
            ) : (
              <ShieldBan className={styles.headerIcon} />
            )}
          </button>
        )}
        <button className={styles.headerButton} title="Close chat" onClick={onClose}>
          <X className={styles.headerIcon} />
        </button>
      </div>
    </>
  );

  // Selection mode header
  const renderSelectionHeader = () => (
    <div className={styles.selectionHeader}>
      <button
        className={styles.headerButton}
        title="Cancel selection"
        onClick={onCancelSelection}
      >
        <X className={styles.headerIcon} />
      </button>
      <div className={styles.selectionInfo}>
        <span className={styles.selectionText}>{selectedCount} selected</span>
      </div>
      <div className={styles.selectionActions}>
        <button
          className={styles.headerButton}
          title="Forward selected"
          onClick={onForwardSelected}
        >
          <Forward className={styles.headerIcon} />
        </button>
        <button
          className={styles.headerButton}
          title="Delete selected"
          onClick={onDeleteSelected}
          disabled={selectedCount === 0}
        >
          <Trash2 className={styles.headerIcon} />
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.chatHeader}>
      {!selectionMode ? renderNormalHeader() : renderSelectionHeader()}
    </div>
  );
};

export default ChatHeader;