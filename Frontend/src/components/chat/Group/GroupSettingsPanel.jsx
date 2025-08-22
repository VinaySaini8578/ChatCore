import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Users, Upload, Image as ImageIcon, Search, Plus } from 'lucide-react';
import SidePanel from '../../common/SidePanel/SidePanel';
import { conversationAPI, resolveAssetUrl } from '../../../services/api';
import { userAPI } from '../../../services/api';
import LoadingSpinner from '../../common/LoadingSpinner/LoadingSpinner';
import toast from 'react-hot-toast';
import styles from './GroupSettingsPanel.module.css';
import { useAuth } from '../../../contexts/AuthContext';

const GroupSettingsPanel = ({ open, onClose, group, onUpdated }) => {
  const { user: currentUser } = useAuth();

  const [name, setName] = useState(group?.name || '');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(group?.groupAvatar ? resolveAssetUrl(group.groupAvatar) : '');
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [members, setMembers] = useState([]); // current members with details
  const memberIds = useMemo(() => new Set(members.map(m => String(m._id))), [members]);

  const [selectedToAdd, setSelectedToAdd] = useState({});

  useEffect(() => {
    if (!open) return;
    setName(group?.name || '');
    setPreview(group?.groupAvatar ? resolveAssetUrl(group.groupAvatar) : '');
    setFile(null);
    setQuery('');
    setList([]);
    setSelectedToAdd({});
    // Fetch current members (for filter + display)
    fetchMembers();
  }, [open, group]);

  const fetchMembers = async () => {
    try {
      const res = await conversationAPI.getGroupMembers(group._id);
      const data = res.data || [];
      // Put current user at the top, then the rest alphabetically
      const meId = currentUser ? String(currentUser._id) : '';
      const sorted = [...data].sort((a, b) => {
        const aIsMe = String(a._id) === meId;
        const bIsMe = String(b._id) === meId;
        if (aIsMe && !bIsMe) return -1;
        if (!aIsMe && bIsMe) return 1;
        return (a.fullname || '').localeCompare(b.fullname || '');
      });
      setMembers(sorted);
    } catch {
      setMembers([]);
    }
  };

  const pick = () => inputRef.current?.click();

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const save = async () => {
    try {
      const res = await conversationAPI.updateGroup(group._id, { name, groupAvatar: file || undefined });
      toast.success('Group updated');
      onUpdated?.(res.data);
      onClose?.();
    } catch (e) {
      toast.error(e.message || 'Failed to update group');
    }
  };

  // Search users NOT already in group (exclude current members)
  const fetchUsers = async (q) => {
    if (!q) {
      setList([]);
      return;
    }
    setLoading(true);
    try {
      const res = await userAPI.searchUsers(q || '');
      const data = (res.data || []).filter(u => !memberIds.has(String(u._id)));
      setList(data);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => fetchUsers(query), 250);
    return () => clearTimeout(id);
  }, [query, memberIds, open]);

  const toggle = (u) => {
    setSelectedToAdd(prev => {
      const copy = { ...prev };
      if (copy[u._id]) delete copy[u._id];
      else copy[u._id] = u;
      return copy;
    });
  };

  const addMembers = async () => {
    const ids = Object.keys(selectedToAdd);
    if (ids.length === 0) return toast.error('Select at least one member');
    try {
      const res = await conversationAPI.addMembers(group._id, ids);
      toast.success('Members added');
      onUpdated?.(res.data);
      onClose?.();
    } catch (e) {
      toast.error(e.message || 'Failed to add members');
    }
  };

  const isMe = (id) => currentUser && String(currentUser._id) === String(id);

  return (
    <SidePanel isOpen={open} onClose={onClose} title="Edit group" icon={Users}>
      <div className={styles.wrap}>
        <div className={styles.row}>
          <div className={styles.avatar}>
            {preview ? <img src={preview} alt="group" /> : <div className={styles.placeholder}><ImageIcon size={18} /></div>}
          </div>
          <button className={styles.pickBtn} onClick={pick}><Upload size={16} /> Upload new photo</button>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
        </div>

        <label className={styles.label}>Group name</label>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter group name" />

        {/* Members list (current user pinned at top and labeled "Me") */}
        <div className={styles.sectionTitle}>Members</div>
        <div className={styles.memberList}>
          {members.length === 0 ? (
            <div className={styles.empty}>No members found</div>
          ) : (
            members.map(m => (
              <div key={m._id} className={styles.memberItem}>
                <div className={styles.memberAvatar}>
                  {m.profilepic ? <img src={resolveAssetUrl(m.profilepic)} alt={m.fullname} /> : <span>{(m.fullname || '?').slice(0,1).toUpperCase()}</span>}
                </div>
                <div className={styles.memberMeta}>
                  <div className={styles.memberName} title={m.fullname}>
                    {isMe(m._id) ? 'Me' : m.fullname}
                  </div>
                  <div className={styles.memberUsername}>@{m.username}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add members */}
        <div className={styles.hint}>Add members</div>
        <div className={styles.searchWrap}>
          <Search className={styles.searchIcon} size={16} />
          <input className={styles.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users to add..." />
        </div>

        <div className={styles.list}>
          {loading ? (
            <div className={styles.loading}><LoadingSpinner /> Loading...</div>
          ) : list.length === 0 ? (
            <div className={styles.empty}>Search to find users not in this group</div>
          ) : (
            list.map(u => {
              const active = !!selectedToAdd[u._id];
              return (
                <button key={u._id} type="button" className={`${styles.item} ${active ? styles.itemActive : ''}`} onClick={() => toggle(u)}>
                  <div className={styles.userAvatar}>{(u.fullname || '?').slice(0,1).toUpperCase()}</div>
                  <div className={styles.meta}>
                    <div className={styles.name}>{u.fullname}</div>
                    <div className={styles.username}>@{u.username}</div>
                  </div>
                  <div className={styles.rightIcon}><Plus size={18} /></div>
                </button>
              );
            })
          )}
        </div>

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose}>Cancel</button>
          <button className={styles.primary} onClick={save}>Save</button>
          <button className={styles.primary} onClick={addMembers}>Add members</button>
        </div>
      </div>
    </SidePanel>
  );
};

export default GroupSettingsPanel;