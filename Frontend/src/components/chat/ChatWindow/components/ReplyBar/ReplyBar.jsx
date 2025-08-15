import React from 'react';
import { X, Reply } from 'lucide-react';
import styles from './ReplyBar.module.css';

const ReplyBar = ({ replyingTo, onCancel }) => {
  const getReplyLabel = () => {
    if (!replyingTo) return '';
    
    if (replyingTo.media) {
      switch (replyingTo.mediaType) {
        case 'image':
          return '📷 Photo';
        case 'video':
          return '🎥 Video';
        case 'audio':
          return '🎵 Audio';
        default:
          return '📄 Document';
      }
    }
    
    return replyingTo.message?.slice(0, 80) || '';
  };

  const getSenderName = () => {
    if (!replyingTo) return 'Someone';
    
    const sender = typeof replyingTo.senderId === 'object'
      ? replyingTo.senderId.fullname || replyingTo.senderId.username || 'Someone'
      : 'Someone';
      
    return sender;
  };

  return (
    <div className={styles.replyBar}>
      <div className={styles.replyBarLeft}>
        <Reply size={16} />
        <div className={styles.replyBarTexts}>
          <div className={styles.replyBarTitle}>Replying to</div>
          <div className={styles.replyBarSnippet}>{getReplyLabel()}</div>
        </div>
      </div>
      <button className={styles.replyBarClose} onClick={onCancel}>
        <X size={16} />
      </button>
    </div>
  );
};

export default ReplyBar;