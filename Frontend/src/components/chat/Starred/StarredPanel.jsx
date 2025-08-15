import React, { useEffect, useState } from 'react';
import { Star, Trash2, MessageCircle, X } from 'lucide-react';
import SidePanel from '../../common/SidePanel/SidePanel';
import styles from './StarredPanel.module.css';
import { messageAPI, resolveAssetUrl } from '../../../services/api';
import LoadingSpinner from '../../common/LoadingSpinner/LoadingSpinner';
import toast from 'react-hot-toast';

const StarredPanel = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await messageAPI.listStarred();
      setItems(res.data || []);
    } catch {
      toast.error('Failed to load starred messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const unstar = async (id) => {
    try {
      await messageAPI.unstar(id);
      setItems((prev) => prev.filter((m) => m._id !== id));
      toast.success('Message unstarred');
    } catch {
      toast.error('Failed to unstar message');
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getMessagePreview = (message) => {
    if (message.media) {
      switch (message.mediaType) {
        case 'image': return '📷 Photo';
        case 'video': return '🎥 Video';
        case 'audio': return '🎵 Audio';
        case 'document': return '📄 Document';
        default: return '📎 Media';
      }
    }
    return message.message || '—';
  };

  return (
    <SidePanel isOpen={open} onClose={onClose} title="Starred Messages" icon={Star}>
      <div className={styles.container}>
        {loading ? (
          <div className={styles.center}>
            <LoadingSpinner />
            <span>Loading starred messages...</span>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.emptyBox}>
            <div className={styles.icon}>
              <Star size={48} />
            </div>
            <h4>No starred messages yet</h4>
            <p>Tap and hold on any message, then tap the star icon to add it here.</p>
            <div className={styles.emptyHint}>
              <MessageCircle size={16} />
              <span>Starred messages are saved across all your devices</span>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <span className={styles.count}>{items.length} starred message{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className={styles.list}>
              {items.map((m) => (
                <div key={m._id} className={styles.item}>
                  <div className={styles.itemHeader}>
                    <div className={styles.senderInfo}>
                      <div className={styles.senderAvatar}>
                        {m.senderId?.profilepic ? (
                          <img src={resolveAssetUrl(m.senderId.profilepic)} alt={m.senderId.fullname} />
                        ) : (
                          <span>{(m.senderId?.fullname || 'U').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className={styles.senderDetails}>
                        <div className={styles.senderName}>
                          {m.senderId?.fullname || 'Unknown User'}
                        </div>
                        <div className={styles.timestamp}>
                          {formatDate(m.createdAt)}
                        </div>
                      </div>
                    </div>
                    <button 
                      className={styles.unstarBtn} 
                      title="Remove star" 
                      onClick={() => unstar(m._id)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className={styles.messageContent}>
                    {m.replyTo && (
                      <div className={styles.replyContext}>
                        <div className={styles.replyBar}></div>
                        <div className={styles.replyText}>
                          <span className={styles.replyAuthor}>
                            {m.replyTo.senderId?.fullname || 'Someone'}
                          </span>
                          <span className={styles.replyContent}>
                            {m.replyTo.media ? getMessagePreview(m.replyTo) : (m.replyTo.message || 'Message')}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {m.isForwarded && (
                      <div className={styles.forwardedLabel}>
                        <span>Forwarded</span>
                      </div>
                    )}
                    
                    <div className={styles.mainMessage}>
                      {m.media && m.mediaType === 'image' && (
                        <div className={styles.mediaPreview}>
                          <img 
                            src={resolveAssetUrl(m.media)} 
                            alt="Starred media"
                            onClick={() => window.open(resolveAssetUrl(m.media), '_blank')}
                          />
                        </div>
                      )}
                      
                      {m.media && m.mediaType === 'video' && (
                        <div className={styles.mediaPreview}>
                          <video controls src={resolveAssetUrl(m.media)} />
                        </div>
                      )}
                      
                      {m.media && m.mediaType === 'audio' && (
                        <div className={styles.audioMessage}>
                          <div className={styles.audioIcon}>🎵</div>
                          <span>Voice message</span>
                        </div>
                      )}
                      
                      {m.media && m.mediaType === 'document' && (
                        <div className={styles.documentMessage}>
                          <div className={styles.documentIcon}>📄</div>
                          <span>{m.mediaName || 'Document'}</span>
                        </div>
                      )}
                      
                      {m.message && (
                        <div className={styles.textMessage}>
                          {m.message}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.starIndicator}>
                    <Star size={14} fill="currentColor" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </SidePanel>
  );
};

export default StarredPanel;