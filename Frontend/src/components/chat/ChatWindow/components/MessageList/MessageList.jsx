import React, { useMemo } from 'react';
import { ArrowDown } from 'lucide-react';
import LoadingSpinner from '../../../../common/LoadingSpinner/LoadingSpinner.jsx';
import MessageItem from '../MessageItem/MessageItem.jsx';
import styles from './MessageList.module.css';

const MessageList = ({
  messages,
  loading,
  currentUser,
  selectedUser,
  firstUnreadId,
  unreadCount,
  messagesContainerRef,
  messagesEndRef,
  showScrollButton,
  scrollToBottom,
  selectionMode,
  selectedIds,
  toggleSelect,
  beginSelectionWith,
  showActionsFor,
  setShowActionsFor,
  setInfoForMessage,
  toggleStarMessage,
  setReplyingTo,
  openForwardModal,
}) => {
  // Group messages by day for date dividers
  const grouped = useMemo(() => {
    if (!messages || !messages.length) return [];

    const map = new Map();
    for (const m of messages) {
      if (!m || !m.createdAt) continue;
      const key = new Date(m.createdAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return Array.from(map.entries());
  }, [messages]);

  const formatDate = (ts) => {
    const date = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className={styles.messagesContainer} ref={messagesContainerRef}>
        <div className={styles.loadingContainer}>
          <LoadingSpinner />
          <p className={styles.loadingText}>Loading messages...</p>
        </div>
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <div className={styles.messagesContainer} ref={messagesContainerRef}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg className={styles.emptyIconSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h3 className={styles.emptyTitle}>No messages yet</h3>
          <p className={styles.emptyDescription}>
            {selectedUser.isGroup
              ? 'Start the conversation with your group.'
              : `Start the conversation with ${selectedUser.fullname}!`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.messagesContainer} ref={messagesContainerRef}>
      <div className={styles.messagesArea}>
        {grouped.map(([dateKey, dayMessages]) => (
          <div key={dateKey} className={styles.messageGroup}>
            <div className={styles.dateDivider}>
              <span className={styles.dateLabel}>{formatDate(dayMessages[0].createdAt)}</span>
            </div>
            
            {dayMessages.map((message) => {
              const isUnreadDivider = firstUnreadId === message._id;
              
              return (
                <React.Fragment key={message._id}>
                  {isUnreadDivider && (
                    <div className={styles.unreadDivider}>
                      <span>New messages ({unreadCount})</span>
                    </div>
                  )}
                  
                  <MessageItem
                    message={message}
                    currentUser={currentUser}
                    selectedUser={selectedUser}
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(message._id)}
                    onToggleSelect={() => toggleSelect(message._id)}
                    onBeginSelection={() => beginSelectionWith(message._id)}
                    isShowingActions={showActionsFor === message._id}
                    onShowActions={() => setShowActionsFor(message._id)}
                    onHideActions={() => setShowActionsFor(null)}
                    onInfoMessage={() => setInfoForMessage(message._id)}
                    onStarMessage={() => toggleStarMessage(message)}
                    onReplyToMessage={() => setReplyingTo(message)}
                    onForwardMessage={() => openForwardModal(message)}
                  />
                </React.Fragment>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <button onClick={() => scrollToBottom()} className={styles.scrollButton}>
          <ArrowDown className={styles.scrollIcon} />
        </button>
      )}
    </div>
  );
};

export default MessageList;