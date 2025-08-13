import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import { userAPI } from '../services/api';
import toast from 'react-hot-toast';

const Chat = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatters, setChatters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    fetchChatters();
  }, []);

  // NEW: Real-time sidebar update for new user/message
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = async (message) => {
      // Identify other user (the user you are chatting with)
      let otherUserId;
      if (message.senderId._id === user._id) {
        otherUserId = message.receiverId;
      } else if (message.receiverId === user._id) {
        otherUserId = message.senderId._id || message.senderId;
      } else {
        otherUserId = message.senderId._id || message.senderId;
      }

      // Check if that user exists in chatters
      if (!chatters.find(c => c._id === (otherUserId._id || otherUserId))) {
        // Fetch user details from backend if needed
        let foundUser = null;
        if (typeof otherUserId === 'object' && otherUserId.fullname) {
          foundUser = otherUserId;
        } else {
          try {
            // Use getCurrentChatters if possible for minimum data, else fallback to searchUsers
            const res = await userAPI.searchUsers('');
            foundUser = res.data.find(u => u._id === (otherUserId._id || otherUserId));
          } catch { }
        }
        if (foundUser) setChatters(prev => [foundUser, ...prev]);
      }

      // Unread badge logic: If chat is not open, increment unread
      if (!selectedUser || selectedUser._id !== (otherUserId._id || otherUserId)) {
        setUnreadCounts(prev => ({
          ...prev,
          [otherUserId._id || otherUserId]: (prev[otherUserId._id || otherUserId] || 0) + 1
        }));
      }
    };
    socket.on("new-message", handleNewMessage);
    return () => socket.off("new-message", handleNewMessage);
    // Add chatters to dependencies so it checks for new users
  }, [socket, chatters, selectedUser, user]);

  const fetchChatters = async () => {
    try {
      const response = await userAPI.getCurrentChatters();
      setChatters(response?.data || []);
    } catch (error) {
      toast.error('Failed to load chat list');
      setChatters([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setUnreadCounts(prev => ({
      ...prev,
      [user._id]: 0
    }));
  };

  const addNewChatter = (newUser) => {
    setChatters(prev => {
      const exists = prev.find(chatter => chatter._id === newUser._id);
      if (!exists) {
        return [newUser, ...prev];
      }
      return prev;
    });
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-300">
        <ChatSidebar
          currentUser={user}
          chatters={chatters}
          selectedUser={selectedUser}
          onUserSelect={handleUserSelect}
          onNewChatter={addNewChatter}
          loading={loading}
          unreadCounts={unreadCounts}
        />
      </div>
      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        <ChatWindow
          currentUser={user}
          selectedUser={selectedUser}
        />
      </div>
    </div>
  );
};

export default Chat;