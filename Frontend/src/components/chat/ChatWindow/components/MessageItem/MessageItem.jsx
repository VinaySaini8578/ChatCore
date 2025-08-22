import React, { useState } from 'react';
import { Check, CheckCheck, Reply, Copy, Forward, Info, Star, Image, Music, FileText, CheckSquare } from 'lucide-react';
import { resolveAssetUrl } from '../../../../../services/api';
import AudioPlayer from '../AudioPlayer/AudioPlayer';
import FileDownloadWithProgress from '../../../../common/FileDownloadWithProgress/FileDownloadWithProgress';
import styles from './MessageItem.module.css';

const MessageItem = ({
  message,
  currentUser,
  selectedUser,
  selectionMode,
  isSelected,
  onToggleSelect,

  onBeginSelection,
  isShowingActions,
  onShowActions,
  onHideActions,
  onInfoMessage,
  onStarMessage,
  onReplyToMessage,
  onForwardMessage
}) => {
  const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
  const myId = currentUser._id.toString();
  const isOwn = String(senderId) === myId;
  const isStarred = message.starredBy?.includes(currentUser._id);

  const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const renderMessageStatus = () => {
    if (selectedUser?.isGroup) return null; // omit ticks for group for now
    // Compute status based on delivery/seen arrays or fallback to message.status
    const otherId = String(selectedUser._id);
    const seenByOther = Array.isArray(message.seenBy) && message.seenBy.some(id => String(id) === otherId);
    const deliveredToOther = Array.isArray(message.deliveredTo) && message.deliveredTo.some(id => String(id) === otherId);
    const isSeen = seenByOther || message.status === 'seen';
    const isDelivered = isSeen || deliveredToOther || message.status === 'delivered';

    if (isSeen)
      return <CheckCheck className={styles.statusIconSeen} size={16} />;
    if (isDelivered)
      return <CheckCheck className={styles.statusIconDelivered} size={16} />;
    return <Check className={styles.statusIconSent} size={16} />;
  };

  const renderReplyPreview = () => {
    if (!message?.replyTo) return null;
    const rt = message.replyTo;

    const sender =
      typeof rt.senderId === 'object'
        ? rt.senderId.fullname || rt.senderId.username || 'Someone'
        : 'Someone';

    const label = rt.media
      ? rt.mediaType === 'image'
        ? '📷 Photo'
        : rt.mediaType === 'video'
          ? '🎥 Video'
          : rt.mediaType === 'audio'
            ? '🎵 Audio'
            : '📄 Document'
      : rt.message?.slice(0, 80);

    // Store the message ID we're replying to
    const replyId = rt._id;

    // Function to scroll to original message
    const scrollToOriginalMessage = () => {
      const messageElement = document.getElementById(`msg-${replyId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight the message briefly
        messageElement.classList.add(styles.highlighted);
        setTimeout(() => {
          messageElement.classList.remove(styles.highlighted);
        }, 2000);
      }
    };

    return (
      <div
        className={styles.replyStrip}
        onClick={scrollToOriginalMessage}
      >
        <div className={styles.replySender}>{sender}</div>
        <div className={styles.replySnippet}>{label || ''}</div>
      </div>
    );
  };

  const renderForwardBadge = () => {
    if (!message.isForwarded) return null;
    const from =
      typeof message.forwardedFrom === 'object'
        ? message.forwardedFrom.fullname || message.forwardedFrom.username
        : null;
    return (
      <div className={styles.forwardBadge}>
        <Forward size={12} />
        Forwarded{from ? ` from ${from}` : ''}
      </div>
    );
  };

  const renderActions = () => {
    return (
      <div className={styles.messageActions}>
        <button
          className={styles.actionBtn}
          title="Select"
          onClick={onBeginSelection}
        >
          <CheckSquare size={16} />
        </button>
        <button
          className={styles.actionBtn}
          title="Reply"
          onClick={onReplyToMessage}
        >
          <Reply size={16} />
        </button>
        <button
          className={styles.actionBtn}
          title={isStarred ? 'Unstar' : 'Star'}
          onClick={onStarMessage}
        >
          <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
        </button>
        <button
          className={styles.actionBtn}
          title="Copy"
          onClick={() => {
            if (message.message) {
              navigator.clipboard.writeText(message.message);
            }
          }}
        >
          <Copy size={16} />
        </button>
        <button
          className={styles.actionBtn}
          title="Forward"
          onClick={onForwardMessage}
        >
          <Forward size={16} />
        </button>
        {selectedUser.isGroup && (
          <button
            className={styles.actionBtn}
            title="Message info"
            onClick={onInfoMessage}
          >
            <Info size={16} />
          </button>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (message.isDeletedForEveryone) {
      return <em className={styles.deletedMessage}>This message was deleted</em>;
    }

    return (
      <>
        {/* Media content */}
        {message.media && message.mediaType === 'image' && (
          <img
            src={resolveAssetUrl(message.media)}
            alt={message.mediaName || 'image'}
            className={styles.mediaImage}
            onClick={() => {
              window.open(resolveAssetUrl(message.media), '_blank');
            }}
          />
        )}

        {message.media && message.mediaType === 'video' && (
          <video
            className={styles.mediaVideo}
            controls
            src={resolveAssetUrl(message.media)}
          />
        )}

        {message.media && message.mediaType === 'audio' && (
          <div className={styles.audioMessageContainer}>
            <AudioPlayer
              audioUrl={resolveAssetUrl(message.media)}
              isOwnMessage={isOwn}
            />
          </div>
        )}

        {message.media && message.mediaType === 'document' && (
          <div className={styles.mediaDocument}>
            <FileDownloadWithProgress
              url={resolveAssetUrl(message.media)}
              fileName={message.mediaName || 'file'}
              fileSize={message.mediaSize}
            />
          </div>
        )}

        {/* Text content */}
        {message.message && <p className={styles.messageText}>{message.message}</p>}
      </>
    );
  };

  return (
    <div
      id={`msg-${message._id}`}
      className={`${styles.messageWrapper} ${isOwn ? styles.own : styles.other} ${isSelected ? styles.selected : ''}`}
      onMouseLeave={onHideActions}
      onClick={() => (selectionMode ? onToggleSelect() : null)}
    >
      {selectionMode && (
        <div
          className={styles.selectCircle}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
        >
          {isSelected && <Check size={14} />}
        </div>
      )}

      <div
        className={`${styles.messageBubble} ${isStarred ? styles.starred : ''}`}
        onMouseEnter={onShowActions}
      >
        {renderForwardBadge()}
        {renderReplyPreview()}

        <div className={styles.messageContent}>
          {selectedUser.isGroup && !isOwn && (
            <div className={styles.groupSenderLine}>
              <span className={styles.groupSenderName}>
                {typeof message.senderId === 'object'
                  ? message.senderId.fullname ||
                  message.senderId.username ||
                  'Member'
                  : 'Member'}
              </span>
            </div>
          )}

          {renderContent()}

          {isStarred && (
            <div className={styles.starIndicator}>
              <Star size={12} fill="currentColor" />
            </div>
          )}
        </div>

        <div className={styles.messageMeta}>
          <span className={styles.messageTime}>
            {formatTime(message.createdAt)}
          </span>
          {!selectedUser.isGroup && isOwn && !message.isDeletedForEveryone && (
            <div className={styles.messageStatus}>
              {renderMessageStatus()}
            </div>
          )}
        </div>

        {isShowingActions && !message.isDeletedForEveryone && !selectionMode && renderActions()}
      </div>
    </div>
  );
};

export default MessageItem;