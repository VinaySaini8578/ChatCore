import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowLeft, User } from 'lucide-react';
import { userAPI } from '../../../services/api';
import LoadingSpinner from '../../common/LoadingSpinner/LoadingSpinner';
import styles from './UserSearch.module.css';

const UserSearch = ({ onUserSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const searchInputRef = useRef(null);

  // Auto-focus search input
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Load all users (except me) on first render
  useEffect(() => {
    searchUsers('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      // When search is empty, backend returns all users except me
      searchUsers(search);
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const searchUsers = async (query) => {
    try {
      setLoading(true);
      // Removed debugger statement
      const response = await userAPI.searchUsers(query);
      setUsers(response?.data || []); // backend returns { data: [...] }
    } catch (error) {
      console.error('Search failed:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    onUserSelect?.(user);
  };

  const handleClearSearch = () => {
    setSearch('');
    // optional: keep current list until refreshed, or clear for a quick visual reset
    // setUsers([]);
    searchInputRef.current?.focus();
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const highlightMatch = (text, query) => {
    if (!text) return '';
    if (!query.trim()) return text;

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className={styles.highlight}>{part}</mark>
      ) : part
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button onClick={onClose} className={styles.backBtn}>
          <ArrowLeft size={20} />
        </button>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>Find People</h2>
          <p className={styles.subtitle}>Search users to start chatting</p>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchBox}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} size={18} />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
            placeholder="Search by name or username..."
            autoComplete="off"
          />
          {search && (
            <button onClick={handleClearSearch} className={styles.clearBtn}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className={styles.results}>
        {loading ? (
          <div className={styles.loading}>
            <LoadingSpinner size="sm" />
            <span>Searching...</span>
          </div>
        ) : users.length === 0 ? (
          <div className={styles.empty}>
            <User className={styles.emptyIcon} size={32} />
            <h3>No users found</h3>
            <p>Try a different name or username</p>
          </div>
        ) : (
          <div className={styles.userList}>
            {users.map((user) => (
              <div
                key={user._id}
                onClick={() => handleUserSelect(user)}
                className={styles.userItem}
              >
                <div className={styles.avatar}>
                  {user.profilepic ? (
                    <img
                      src={user.profilepic}
                      alt={user.fullname}
                      className={styles.avatarImg}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {getInitials(user.fullname)}
                    </div>
                  )}
                </div>

                <div className={styles.userInfo}>
                  <div className={styles.name}>
                    {highlightMatch(user.fullname, search)}
                  </div>
                  <div className={styles.username}>
                    @{highlightMatch(user.username, search)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSearch;