import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { MessageCircle, LogOut, Plus, Users } from 'lucide-react';
import UserSearch from './UserSearch';
import LoadingSpinner from '../common/LoadingSpinner';

const ChatSidebar = ({
  currentUser,
  chatters,
  selectedUser,
  onUserSelect,
  onNewChatter,
  loading,
  unreadCounts = {},
}) => {
  const { logout } = useAuth();
  const { onlineUsers, isConnected } = useSocket();
  const [showSearch, setShowSearch] = useState(false);

  // Ref for user search area
  const searchRef = useRef(null);

  // Outside click for user search
  useEffect(() => {
    if (!showSearch) return;
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearch]);

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  // FIX: Always do string comparison for onlineUsers
  const isUserOnline = (userId) => {
    const userIdStr = typeof userId === 'object' ? userId._id : userId;
    return onlineUsers.some(user => {
      const onlineId = typeof user.userId === 'object' ? user.userId._id : user.userId;
      return onlineId === userIdStr;
    });
  };

  return (
    <div className="h-full flex flex-col glass-card transition-colors duration-300">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-blue-500 to-purple-600 dark:from-gray-700 dark:to-gray-800 rounded-t-2xl flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 bg-white/20 dark:bg-white/10 rounded-full flex items-center justify-center shadow">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg">Chats</h1>
          <div className="flex items-center text-white/80 text-sm">
            <span className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`}></span>
            <span>{currentUser?.fullname}</span>
            {!isConnected && <span className="ml-2 text-red-200 text-xs">(Connecting...)</span>}
          </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-3 text-white bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 border border-white/30"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Online Users Count */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 transition-colors duration-300">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600 dark:text-gray-300">
            <Users className="w-4 h-4 mr-2" />
            <span>{onlineUsers.length} online</span>
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center space-x-2 py-2 px-3 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs rounded-full transition-all duration-200"
          >
            <Plus className="w-3 h-3" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* User Search Overlay */}
      {showSearch && (
        <div className="absolute inset-0 z-50 flex items-start">
          <div ref={searchRef} className="w-80">
            <UserSearch
              onUserSelect={(user) => {
                onUserSelect(user);
                onNewChatter(user);
                setShowSearch(false);
              }}
            />
          </div>
          <div className="flex-1" />
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 transition-colors duration-300 rounded-b-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : chatters.length === 0 ? (
          <div className="text-center py-8 px-4 text-gray-500 dark:text-gray-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No chats yet</p>
            <p className="text-sm mt-1">Start a new conversation!</p>
          </div>
        ) : (
          <div className="p-2">
            {chatters.map((chatter) => (
              <div
                key={chatter._id}
                onClick={() => onUserSelect(chatter)}
                className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all duration-200 mb-1 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  selectedUser?._id === chatter._id
                    ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                    : ''
                } animate-fade-in`}
              >
                <div className="relative">
                  {chatter.profilepic ? (
                    <img
                      src={chatter.profilepic}
                      alt={chatter.fullname}
                      className="w-12 h-12 rounded-full object-cover avatar-ring"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold avatar-ring">
                      {getInitials(chatter.fullname)}
                    </div>
                  )}
                  <span className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-white dark:border-gray-800 rounded-full ${
                    isUserOnline(chatter._id) ? 'bg-green-400' : 'bg-gray-400'
                  }`}></span>
                  {unreadCounts[chatter._id] > 0 && (
                    <span className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full px-2 text-xs font-bold shadow">
                      {unreadCounts[chatter._id]}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {chatter.fullname}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    @{chatter.username}
                    {isUserOnline(chatter._id) && (
                      <span className="ml-2 text-green-500">• Online</span>
                    )}
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

export default ChatSidebar;