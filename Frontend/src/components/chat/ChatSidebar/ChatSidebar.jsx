import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useSocket } from '../../../contexts/SocketContext';
import {
  Search,
  MoreVertical,
  MessageCircle,
  Users,
  Settings,
  LogOut,
  Plus,
  Archive,
  Star,
  ShieldBan
} from 'lucide-react';
import UserSearch from '../UserSearch/UserSearch';
import LoadingSpinner from '../../common/LoadingSpinner/LoadingSpinner';
import { resolveAssetUrl } from '../../../services/api';
import styles from './ChatSidebar.module.css';

const ChatSidebar = ({
  currentUser,
  chatters,
  selectedUser,
  onUserSelect,
  onNewChatter,
  loading,
  unreadCounts = {},
  onOpenNewGroup,
  onOpenStarred,
  onOpenArchived,
  onOpenSettings,
  onOpenBlocked, // NEW
}) => {
  const { logout } = useAuth();
  const { onlineUsers, isConnected } = useSocket();
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const searchRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showSearch) return;
    const handleClickOutside = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearch]);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false); };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = async () => { await logout(); };

  const getInitials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  const isUserOnline = (userId) => {
    const userIdStr = typeof userId === 'object' ? userId._id : userId;
    return onlineUsers.some(user => {
      const onlineId = typeof user.userId === 'object' ? user.userId._id : user.userId;
      return onlineId === userIdStr;
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const now = new Date();
    const msgTime = new Date(timestamp);
    const diffInHours = (now - msgTime) / (1000 * 60 * 60);
    if (diffInHours < 24) return msgTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffInHours < 168) return msgTime.toLocaleDateString([], { weekday: 'short' });
    return msgTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filteredChatters = chatters.filter(chatter => {
    const name = chatter.isGroup ? chatter.name : chatter.fullname;
    const handle = chatter.isGroup ? chatter.name : chatter.username;
    return (name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (handle || '').toLowerCase().includes(searchQuery.toLowerCase());
  });
  const getMessagePreview = (item) => {
    // Check if it's an audio/voice message
    if (item.lastMessageType === 'audio') {
      return '🎵 Voice message';
    }
    // Check for media types
    else if (item.lastMessageType === 'image') {
      return '📷 Photo';
    }
    else if (item.lastMessageType === 'video') {
      return '🎥 Video';
    }
    else if (item.lastMessageType === 'document') {
      return '📄 Document';
    }
    // Regular text message
    else {
      return item.lastMessage || (item.isGroup ? 'New group' : 'Start a conversation...');
    }
  };
  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.userSection}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatar}>
              {currentUser?.profilepic ? (
                <img src={resolveAssetUrl(currentUser.profilepic)} alt={currentUser.fullname} className={styles.avatarImage} />
              ) : (
                <span className={styles.avatarText}>{getInitials(currentUser?.fullname)}</span>
              )}
            </div>
            <div className={styles.statusDot}></div>
          </div>
          <div className={styles.userInfo}>
            <h2 className={styles.userName}>{currentUser?.fullname}</h2>
            <div className={styles.connectionStatus}>
              <div className={`${styles.statusIndicator} ${isConnected ? styles.connected : styles.disconnected}`}></div>
              <span className={styles.statusText}>{isConnected ? 'Connected' : 'Connecting...'}</span>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.actionButton} onClick={() => setShowSearch(true)} title="New Chat">
            <Plus className={styles.actionIcon} />
          </button>
          <div className={styles.menuContainer} ref={menuRef}>
            <button className={styles.actionButton} onClick={() => setShowUserMenu(!showUserMenu)} title="Menu" aria-haspopup="menu" aria-expanded={showUserMenu}>
              <MoreVertical className={styles.actionIcon} />
            </button>
            {showUserMenu && (
              <div className={styles.dropdownMenu} role="menu">
                <button className={styles.menuItem} onClick={() => { setShowUserMenu(false); onOpenNewGroup?.(); }}>
                  <Users className={styles.menuIcon} /><span>New Group</span>
                </button>
                <button className={styles.menuItem} onClick={() => { setShowUserMenu(false); onOpenStarred?.(); }}>
                  <Star className={styles.menuIcon} /><span>Starred Messages</span>
                </button>
                <button className={styles.menuItem} onClick={() => { setShowUserMenu(false); onOpenArchived?.(); }}>
                  <Archive className={styles.menuIcon} /><span>Archived Chats</span>
                </button>
                <button className={styles.menuItem} onClick={() => { setShowUserMenu(false); onOpenBlocked?.(); }}>
                  <ShieldBan className={styles.menuIcon} /><span>Blocked Users</span>
                </button>
                <button className={styles.menuItem} onClick={() => { setShowUserMenu(false); onOpenSettings?.(); }}>
                  <Settings className={styles.menuIcon} /><span>Settings</span>
                </button>
                <div className={styles.menuDivider}></div>
                <button className={styles.menuItem} onClick={() => { setShowUserMenu(false); handleLogout(); }}>
                  <LogOut className={styles.menuIcon} /><span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.searchContainer}>
        <div className={styles.searchInputWrapper}>
          <Search className={styles.searchIcon} size={18} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={styles.searchInput} placeholder="Search conversations..." onFocus={() => searchQuery && setShowSearch(true)} />
          {searchQuery && <button onClick={() => setSearchQuery('')} className={styles.clearButton}>×</button>}
        </div>
      </div>

      {showSearch && (
        <div className={styles.searchOverlay}>
          <div ref={searchRef} className={styles.searchPanel}>
            <UserSearch
              onUserSelect={(user) => { onUserSelect({ ...user, isGroup: false }); onNewChatter(user); setShowSearch(false); setSearchQuery(''); }}
              onClose={() => setShowSearch(false)}
            />
          </div>
        </div>
      )}

      <div className={styles.chatList}>
        {loading ? (
          <div className={styles.loadingContainer}><LoadingSpinner /><p className={styles.loadingText}>Loading conversations...</p></div>
        ) : filteredChatters.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><MessageCircle className={styles.emptyIconSvg} /></div>
            <h3 className={styles.emptyTitle}>No conversations</h3>
            <p className={styles.emptyDescription}>{searchQuery ? `No results found for "${searchQuery}"` : "Start a new conversation to get connected!"}</p>
            <button className={styles.startChatButton} onClick={() => setShowSearch(true)}><Plus className={styles.buttonIcon} />Start New Chat</button>
          </div>
        ) : (
          <div className={styles.chatItems}>
            {filteredChatters.map((item) => {
              const id = item._id; // userId for 1:1 or conversationId for group
              const title = item.isGroup ? item.name : item.fullname;
              const avatarUrl = item.isGroup ? item.groupAvatar : item.profilepic;
              const showOnlineDot = !item.isGroup && isUserOnline(id);

              return (
                <div key={id} onClick={() => onUserSelect(item)} className={`${styles.chatItem} ${selectedUser?._id === id ? styles.active : ''}`}>
                  <div className={styles.chatAvatar}>
                    <div className={styles.avatarWrapper}>
                      {avatarUrl ? <img src={resolveAssetUrl(avatarUrl)} alt={title} className={styles.avatarImage} /> : <span className={styles.avatarText}>{(title || '?').split(' ').map(n => n[0]).join('').toUpperCase()}</span>}
                    </div>
                    {showOnlineDot && <div className={styles.onlineDot}></div>}
                  </div>
                  <div className={styles.chatInfo}>
                    <div className={styles.chatHeader}>
                      <h4 className={styles.chatName}>{title}</h4>
                      <span className={styles.chatTime}>{formatTime(item.lastMessageTime)}</span>
                    </div>
                    <div className={styles.chatPreview}>
                      <div className={styles.lastMessage}>
                        {getMessagePreview(item)}
                      </div>
                      {unreadCounts[id] > 0 && (
                        <div className={styles.unreadBadge}>{unreadCounts[id] > 99 ? '99+' : unreadCounts[id]}</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;