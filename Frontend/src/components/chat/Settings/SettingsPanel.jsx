import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Settings as SettingsIcon, Image as ImageIcon, Quote, Upload, Link2, X, CheckCircle2 } from 'lucide-react';
import SidePanel from '../../common/SidePanel/SidePanel';
import styles from './SettingsPanel.module.css';
import toast from 'react-hot-toast';
import { userAPI, resolveAssetUrl } from '../../../services/api';

const SettingsPanel = ({ open, onClose, user }) => {
  const [about, setAbout] = useState(user?.about || '');
  const [photoUrl, setPhotoUrl] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoErr, setPhotoErr] = useState('');

  const fileRef = useRef(null);

  const originalUrl = useMemo(() => (user?.profilepic ? resolveAssetUrl(user.profilepic) : ''), [user]);
  const previewSrc = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    if (photoUrl?.trim()) return photoUrl.trim();
    return originalUrl || '';
  }, [file, photoUrl, originalUrl]);

  useEffect(() => {
    if (open) {
      setAbout(user?.about || '');
      setPhotoUrl(user?.profilepic ? resolveAssetUrl(user.profilepic) : '');
      setFile(null);
      setPhotoErr('');
      setDragOver(false);
    }
    // cleanup object URL when panel closes or file changes
    return () => {
      if (file) URL.revokeObjectURL(previewSrc);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const chooseFile = () => fileRef.current?.click();

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!f.type.startsWith('image/')) {
        setPhotoErr('Please select an image file');
        return;
      }
      setPhotoErr('');
      setFile(f);
      // keep URL input in sync with preview (clear URL when file selected)
      setPhotoUrl('');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      if (!f.type.startsWith('image/')) {
        setPhotoErr('Please drop an image file');
        return;
      }
      setPhotoErr('');
      setFile(f);
      setPhotoUrl('');
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const onUrlChange = (e) => {
    const v = e.target.value;
    setPhotoUrl(v);
    setFile(null);
    if (!v || v.startsWith('http') || v.startsWith('blob:') || v.startsWith('data:')) {
      setPhotoErr('');
    } else {
      setPhotoErr('Enter a valid absolute URL (http/https)');
    }
  };

  const resetChanges = () => {
    setAbout(user?.about || '');
    setPhotoUrl(originalUrl);
    setFile(null);
    setPhotoErr('');
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = { about };
      // Prefer file over URL
      if (file) payload.file = file;
      else if (photoUrl && photoUrl !== originalUrl) payload.profilepicUrl = photoUrl;

      const res = await userAPI.updateProfile(payload);
      toast.success('Profile updated');
      // live-update global user (AuthProvider listens for this)
      window.dispatchEvent(new CustomEvent('auth:user-updated', { detail: res.user }));
      onClose?.();
    } catch (e) {
      toast.error(e.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    about !== (user?.about || '') ||
    !!file ||
    (photoUrl && photoUrl !== originalUrl);

  return (
    <SidePanel isOpen={open} onClose={onClose} title="Settings" icon={SettingsIcon}>
      {/* Profile Photo Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Profile photo</span>
          {hasChanges ? (
            <span className={styles.changesBadge}><CheckCircle2 size={14} /> Unsaved changes</span>
          ) : null}
        </div>

        <div
          className={`${styles.avatarZone} ${dragOver ? styles.avatarZoneDrag : ''}`}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <div className={styles.avatarPreview}>
            {previewSrc ? (
              <img src={previewSrc} alt="avatar preview" />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <ImageIcon size={22} />
              </div>
            )}
            <button className={styles.avatarEditBtn} onClick={chooseFile} title="Upload">
              <Upload size={16} /> Change
            </button>
          </div>

          <div className={styles.photoInputs}>
            <div className={styles.urlInputWrap}>
              <Link2 className={styles.leftIcon} size={16} />
              <input
                className={styles.urlInput}
                placeholder="Paste image URL (http/https)"
                value={photoUrl}
                onChange={onUrlChange}
              />
              {photoUrl && (
                <button className={styles.clearBtn} onClick={() => setPhotoUrl('')} title="Clear URL">
                  <X size={14} />
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
            <div className={styles.photoHint}>
              Drag & drop an image, upload a file, or paste a public image URL.
            </div>
            {photoErr && <div className={styles.errorText}>{photoErr}</div>}
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Status</span>
          <span className={styles.charCount}>{about.length}/150</span>
        </div>

        <div className={styles.inputWrap}>
          <Quote className={styles.leftIcon} size={16} />
          <input
            className={styles.textInput}
            placeholder="Hey there! I am using ChatCore."
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            maxLength={150}
          />
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.ghostBtn} onClick={resetChanges} disabled={!hasChanges}>
          Reset
        </button>
        <div className={styles.actionsRight}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.primaryBtn} onClick={save} disabled={saving || !!photoErr || !hasChanges}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </SidePanel>
  );
};

export default SettingsPanel;