import React, { useEffect, useState } from 'react';
import SidePanel from '../../common/SidePanel/SidePanel';
import { Eye, CheckCheck, Clock } from 'lucide-react';
import styles from './MessageInfoDrawer.module.css';
import { messageAPI, resolveAssetUrl } from '../../../services/api';
import LoadingSpinner from '../../common/LoadingSpinner/LoadingSpinner';
import toast from 'react-hot-toast';

const Section = ({ title, icon: Icon, items, currentUser }) => (
  <div className={styles.section}>
    <div className={styles.sectionHead}>
      <Icon size={16} />
      <span>
        {title} ({items.length})
      </span>
    </div>
    {items.length === 0 ? (
      <div className={styles.empty}>None</div>
    ) : (
      <div className={styles.users}>
        {items.map((u) => {
          const isMe = currentUser && String(currentUser._id) === String(u._id);
          return (
            <div className={styles.user} key={u._id}>
              <div className={styles.avatar}>
                {u.profilepic ? (
                  <img src={resolveAssetUrl(u.profilepic)} alt={u.fullname} />
                ) : (
                  <span>{(u.fullname || '?').slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className={styles.meta}>
                <div className={styles.name}>
                  {isMe ? 'You' : u.fullname}
                </div>
                <div className={styles.username}>@{u.username}</div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

const MessageInfoDrawer = ({ open, onClose, messageId, currentUser }) => {
  const [loading, setLoading] = useState(false);
  const [seen, setSeen] = useState([]);
  const [delivered, setDelivered] = useState([]);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    if (!open || !messageId) return;
    (async () => {
      try {
        setLoading(true);
        const res = await messageAPI.getReceipts(messageId);
        setSeen(res.data?.seen || []);
        setDelivered(res.data?.delivered || []);
        setPending(res.data?.pending || []);
      } catch (e) {
        toast.error(e.message || 'Failed to load info');
      } finally {
        setLoading(false);
      }
    })();
  }, [open, messageId]);

  return (
    <SidePanel isOpen={open} onClose={onClose} title="Message info">
      {loading ? (
        <div className={styles.center}>
          <LoadingSpinner /> Loading...
        </div>
      ) : (
        <>
          <Section title="Seen by" icon={Eye} items={seen} currentUser={currentUser} />
          <Section title="Delivered to" icon={CheckCheck} items={delivered} currentUser={currentUser} />
          <Section title="Pending" icon={Clock} items={pending} currentUser={currentUser} />
        </>
      )}
    </SidePanel>
  );
};

export default MessageInfoDrawer;