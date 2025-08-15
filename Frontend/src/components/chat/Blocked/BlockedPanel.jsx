import React, { useEffect, useState } from 'react';
import { ShieldBan, ShieldCheck } from 'lucide-react';
import SidePanel from '../../common/SidePanel/SidePanel';
import styles from './BlockedPanel.module.css';
import { userAPI, resolveAssetUrl } from '../../../services/api';
import LoadingSpinner from '../../common/LoadingSpinner/LoadingSpinner';
import toast from 'react-hot-toast';

const BlockedPanel = ({ open, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await userAPI.listBlocked();
      setItems(res.data || []);
    } catch {
      toast.error('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const unblock = async (id) => {
    try {
      await userAPI.unblock(id);
      setItems(prev => prev.filter(u => u._id !== id));
      toast.success('User unblocked');
    } catch {
      toast.error('Failed to unblock');
    }
  };

  return (
    <SidePanel isOpen={open} onClose={onClose} title="Blocked Users" icon={ShieldBan}>
      {loading ? (
        <div className={styles.center}><LoadingSpinner /> Loading...</div>
      ) : items.length === 0 ? (
        <div className={styles.emptyBox}>
          <div className={styles.icon}>🚫</div>
          <h4>No blocked users</h4>
          <p>Users you block will appear here.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((u) => (
            <div key={u._id} className={styles.item}>
              <div className={styles.avatar}>
                {u.profilepic ? <img src={resolveAssetUrl(u.profilepic)} alt={u.fullname} /> : <span>{(u.fullname || '?').slice(0,1).toUpperCase()}</span>}
              </div>
              <div className={styles.meta}>
                <div className={styles.name}>{u.fullname}</div>
                <div className={styles.username}>@{u.username}</div>
              </div>
              <button className={styles.iconBtn} title="Unblock" onClick={() => unblock(u._id)}>
                <ShieldCheck size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </SidePanel>
  );
};

export default BlockedPanel;