import React, { useState, useEffect, useRef } from 'react';
import { Search, User } from 'lucide-react';
import { userAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const UserSearch = ({ onUserSelect }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (search.trim()) {
        searchUsers(search);
      } else {
        setUsers([]);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search]);

  const searchUsers = async (query) => {
    try {
      setLoading(true);
      const response = await userAPI.searchUsers(query);
      setUsers(response.data || []);
    } catch (error) {
      console.error('Search failed:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50">
      {/* Search Input */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          placeholder="Search users..."
          autoFocus
        />
      </div>

      {/* Search Results */}
      <div className="max-h-60 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        ) : users.length === 0 && search.trim() ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No users found</p>
          </div>
        ) : search.trim() === '' ? (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <p className="text-sm">Type to search users...</p>
          </div>
        ) : (
          <div className="space-y-1">
            {users.map((user) => (
              <div
                key={user._id}
                onClick={() => onUserSelect(user)}
                className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-white dark:hover:bg-gray-600 transition-all duration-300"
              >
                {user.profilepic ? (
                  <img
                    src={user.profilepic}
                    alt={user.fullname}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {getInitials(user.fullname)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {user.fullname}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    @{user.username}
                  </p>
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