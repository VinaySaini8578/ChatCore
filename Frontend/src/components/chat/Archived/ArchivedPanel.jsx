import React, { useEffect, useState } from 'react';
import { Archive, RotateCcw } from 'lucide-react';
import SidePanel from '../../common/SidePanel/SidePanel';
import styles from './ArchivedPanel.module.css';
import { conversationAPI } from '../../../services/api';
import LoadingSpinner from '../../common/LoadingSpinner/LoadingSpinner';
import toast from 'react-hot-toast';

const ArchivedPanel = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await conversationAPI.listArchived();
      setItems(res.data || []);
    } catch {
      toast.error('Failed to load archived chats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const unarchive = async (id) => {
    try {
      await conversationAPI.unarchive(id);
      setItems(prev => prev.filter(i => i._id !== id));
      toast.success('Unarchived');
    } catch {
      toast.error('Failed to unarchive');
    }
  };

  return (
    <SidePanel isOpen={open} onClose={onClose} title="Archived Chats" icon={Archive}>
      {loading ? (
        <div className={styles.center}><LoadingSpinner /> Loading...</div>
      ) : items.length === 0 ? (
        <div className={styles.emptyBox}>
          <div className={styles.icon}>📥</div>
          <h4>No archived chats</h4>
          <p>Archive chats to keep your inbox clean. They will appear here.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((c) => (
            <div key={c._id} className={styles.item}>
              <div className={styles.avatar}>{(c.name || 'G').slice(0,1).toUpperCase()}</div>
              <div className={styles.meta}>
                <div className={styles.name}>{c.isGroup ? c.name : 'Chat'}</div>
                <div className={styles.sub}>{new Date(c.updatedAt).toLocaleString()}</div>
              </div>
              <button className={styles.iconBtn} title="Unarchive" onClick={() => unarchive(c._id)}>
                <RotateCcw size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </SidePanel>
  );
};

export default ArchivedPanel;