import React, { useEffect, useMemo, useState } from 'react';
import { Users, Search, Check, Plus, Upload, Image as ImageIcon } from 'lucide-react';
import SidePanel from '../../common/SidePanel/SidePanel';
import { userAPI, conversationAPI } from '../../../services/api';
import LoadingSpinner from '../../common/LoadingSpinner/LoadingSpinner';
import toast from 'react-hot-toast';
import styles from './NewGroupPanel.module.css';

const NewGroupPanel = ({ open, onClose, onCreate }) => {
  const [query, setQuery] = useState('');
  const [list, setList] = useState([]);
  const [selected, setSelected] = useState({});
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  const selectedArray = useMemo(() => Object.values(selected), [selected]);

  useEffect(() => {
    if (!open) return;
    fetchUsers('');
    setGroupName('');
    setSelected({});
    setAvatarFile(null);
    setAvatarPreview('');
  }, [open]);

  const fetchUsers = async (q) => {
    setLoading(true);
    try {
      const res = await userAPI.searchUsers(q || '');
      setList(res.data || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const toggle = (user) => {
    setSelected((prev) => {
      const copy = { ...prev };
      if (copy[user._id]) delete copy[user._id];
      else copy[user._id] = user;
      return copy;
    });
  };

  const onPickAvatar = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setAvatarFile(f);
      setAvatarPreview(URL.createObjectURL(f));
    }
  };

  const submit = async () => {
    if (!groupName.trim()) return toast.error('Enter a group name');
    if (selectedArray.length < 2) return toast.error('Select at least 2 members');
    try {
      const payload = { name: groupName.trim(), members: selectedArray.map((u) => u._id), groupAvatar: avatarFile || undefined };
      const res = await conversationAPI.createGroup(payload);
      toast.success('Group created');
      onCreate?.(res.data);
      onClose?.();
    } catch (e) {
      toast.error(e.message || 'Failed to create group');
    }
  };

  return (
    <SidePanel isOpen={open} onClose={onClose} title="New Group" icon={Users}>
      <div className={styles.form}>
        <div className={styles.avatarRow}>
          <div className={styles.groupAvatar}>
            {avatarPreview ? <img src={avatarPreview} alt="group" /> : <div className={styles.placeholder}><ImageIcon size={18} /></div>}
          </div>
          <label className={styles.pickBtn}>
            <Upload size={16} />
            <span>Upload group photo</span>
            <input hidden type="file" accept="image/*" onChange={onPickAvatar} />
          </label>
        </div>

        <label className={styles.label}>Group name</label>
        <input
          className={styles.input}
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Enter group name"
        />

        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} size={16} />
          <input
            className={styles.search}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              const value = e.target.value;
              clearTimeout(window.__ngp);
              window.__ngp = setTimeout(() => fetchUsers(value), 250);
            }}
            placeholder="Search users..."
          />
        </div>

        <div className={styles.chips}>
          {selectedArray.map((u) => (
            <div key={u._id} className={styles.chip}>
              <span>{u.fullname}</span>
              <button onClick={() => toggle(u)} aria-label="Remove">×</button>
            </div>
          ))}
        </div>

        <div className={styles.list}>
          {loading ? (
            <div className={styles.loading}><LoadingSpinner /> Loading...</div>
          ) : list.length === 0 ? (
            <div className={styles.empty}>No users found</div>
          ) : (
            list.map((u) => {
              const isSel = !!selected[u._id];
              return (
                <button
                  type="button"
                  key={u._id}
                  className={`${styles.item} ${isSel ? styles.itemActive : ''}`}
                  onClick={() => toggle(u)}
                >
                  <div className={styles.avatar}>{(u.fullname || '?').slice(0,1).toUpperCase()}</div>
                  <div className={styles.meta}>
                    <div className={styles.name}>{u.fullname}</div>
                    <div className={styles.username}>@{u.username}</div>
                  </div>
                  <div className={styles.rightIcon}>
                    {isSel ? <Check size={18} /> : <Plus size={18} />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.primaryBtn} onClick={submit}>Create group</button>
        </div>
      </div>
    </SidePanel>
  );
};

export default NewGroupPanel;