import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';
import { Send, Phone, Video, MoreVertical, Check, CheckCheck, Trash2, X, ArrowLeft, Paperclip, Smile } from 'lucide-react';
import { messageAPI } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';
import { useSocket } from '../../contexts/SocketContext.jsx';

// Helper for readable file size
function formatSize(bytes) {
  if (!bytes) return '';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
  return Math.round(bytes / Math.pow(1024, i) * 10) / 10 + ' ' + sizes[i];
}

function getMediaUrl(media) {
  return media.startsWith('http') ? media : `${import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || 'http://localhost:5000'}${media}`;
}

function extractFileName(media) {
  return media.split('/').pop();
}

// Helper function to check if message is only emojis
function isOnlyEmojis(text) {
  if (!text || text.trim() === '') return false;
  
  // Remove all emojis and check if anything remains
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const withoutEmojis = text.replace(emojiRegex, '').trim();
  
  // Also check for common emoji patterns like :) :D etc
  const textEmojiRegex = /[:;=8][-)(\]D\\/|]|[-)(\]D\\/|][:;=8]/g;
  const withoutTextEmojis = withoutEmojis.replace(textEmojiRegex, '').trim();
  
  return withoutTextEmojis === '';
}

function FileDownloadWithProgress({ url, fileName, fileSize }) {
  const [progress, setProgress] = useState(0);

  const handleDownload = async () => {
    setProgress(0);
    const response = await fetch(url);
    const reader = response.body.getReader();
    const contentLength = +response.headers.get('Content-Length') || fileSize || 1;
    let received = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      setProgress(Math.round((received * 100) / contentLength));
    }
    const blob = new Blob(chunks);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    setProgress(0);
  };

  return (
    <div>
      <button onClick={handleDownload} className="text-white hover:text-gray-200 underline font-medium">{fileName}</button>      <span className="text-xs text-gray-300 ml-1">({formatSize(fileSize)})</span>
      {progress > 0 && progress < 100 && (
        <div className="w-28 h-2 bg-gray-200 rounded mt-1">
          <div className="h-2 bg-green-500 rounded" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

// Quick Emoji Component
const QuickEmojis = ({ onEmojiClick }) => {
  const emojis = ['😀', '😂', '😍', '😢', '😡', '👍', '👎', '❤️', '🎉', '🔥'];
  
  return (
    <div className="flex gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
      {emojis.map(emoji => (
        <button
          key={emoji}
          type="button"
          onClick={() => onEmojiClick(emoji)}
          className="text-xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors duration-200"
          title={`Add ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

const ChatWindow = ({ currentUser, selectedUser }) => {
  const { socket, isUserOnline } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadAbortController, setUploadAbortController] = useState(null);

  // Emoji states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const inputTypingTimeoutRef = useRef(null);

  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [selectedMessages, setSelectedMessages] = useState([]);
  const [lastOnlineState, setLastOnlineState] = useState(selectedUser ? isUserOnline(selectedUser?._id) : undefined);
  const [isTabActive, setIsTabActive] = useState(document.visibilityState === 'visible' && document.hasFocus());

  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);

  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // Tab focus/blur for seen logic
  useEffect(() => {
    const checkActive = () => {
      setIsTabActive(document.visibilityState === 'visible' && document.hasFocus());
    };
    window.addEventListener('focus', checkActive);
    window.addEventListener('blur', checkActive);
    document.addEventListener('visibilitychange', checkActive);
    return () => {
      window.removeEventListener('focus', checkActive);
      window.removeEventListener('blur', checkActive);
      document.removeEventListener('visibilitychange', checkActive);
    };
  }, []);

  // Outside click for menu
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Fetch messages when selected user changes
  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
    } else {
      setMessages([]);
    }
    setSelectedMessages([]);
    setLastOnlineState(selectedUser ? isUserOnline(selectedUser?._id) : undefined);
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket event handlers with proper ID handling
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      console.log('New message received:', message);
      const senderId = typeof message.senderId === "object" ? message.senderId._id : message.senderId;
      const receiverId = typeof message.receiverId === "object" ? message.receiverId._id : message.receiverId;
      const myId = typeof currentUser._id === "object" ? currentUser._id.toString() : currentUser._id;
      
      if (selectedUser && (
        (senderId === selectedUser._id && receiverId === myId) ||
        (senderId === myId && receiverId === selectedUser._id)
      )) {
        setMessages((prev) => {
          const messageExists = prev.some(msg => msg._id === message._id);
          if (!messageExists) return [...prev, message];
          return prev;
        });
        
        if (message._id && receiverId === myId && isTabActive) {
          socket.emit('message-delivered', { messageId: message._id });
        }
      }
    };

    const handleStatusUpdate = ({ messageId, status }) => {
      console.log('Status update received:', { messageId, status });
      setMessages(prev =>
        prev.map(msg => msg._id === messageId ? { ...msg, status } : msg)
      );
    };

    const handleTyping = ({ senderId }) => {
      if (selectedUser && senderId === selectedUser._id) setIsOtherUserTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsOtherUserTyping(false), 2000);
    };

    const handleStoppedTyping = ({ senderId }) => {
      if (selectedUser && senderId === selectedUser._id) setIsOtherUserTyping(false);
    };

    const handleDeletedEveryone = ({ messageId }) => {
      setMessages(prev =>
        prev.map(msg =>
          msg._id === messageId
            ? { ...msg, isDeletedForEveryone: true, message: "This message was deleted" }
            : msg
        )
      );
    };

    socket.on('new-message', handleNewMessage);
    socket.on('message-status-update', handleStatusUpdate);
    socket.on('user-typing', handleTyping);
    socket.on('user-stopped-typing', handleStoppedTyping);
    socket.on('message-deleted-everyone', handleDeletedEveryone);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('message-status-update', handleStatusUpdate);
      socket.off('user-typing', handleTyping);
      socket.off('user-stopped-typing', handleStoppedTyping);
      socket.off('message-deleted-everyone', handleDeletedEveryone);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, selectedUser, currentUser, isTabActive]);

  // Mark messages as seen when tab is active and chat is open
  useEffect(() => {
    if (!socket || !messages.length || !selectedUser || !isTabActive) return;
    
    const myId = typeof currentUser._id === "object" ? currentUser._id.toString() : currentUser._id;
    const unseen = messages.filter(msg => {
      const receiverId = typeof msg.receiverId === "object" ? msg.receiverId._id : msg.receiverId;
      const senderId = typeof msg.senderId === "object" ? msg.senderId._id : msg.senderId;
      return receiverId === myId && senderId === selectedUser._id && msg.status !== "seen";
    });
    
    console.log('Marking as seen:', unseen.length, 'messages');
    if (unseen.length === 0) return;
    
    unseen.forEach(msg => {
      socket.emit("message-seen", { messageId: msg._id });
    });
  }, [messages, selectedUser, isTabActive, socket, currentUser]);

  const fetchMessages = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      const response = await messageAPI.getMessages(selectedUser._id);
      setMessages(response.data || []);
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const emitTyping = () => {
    if (!socket || !selectedUser) return;
    socket.emit('typing-start', { receiverId: selectedUser._id, senderName: currentUser.fullname });
  };
  
  const emitStopTyping = () => {
    if (!socket || !selectedUser) return;
    socket.emit('typing-stop', { receiverId: selectedUser._id });
  };
  
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    emitTyping();
    if (inputTypingTimeoutRef.current) clearTimeout(inputTypingTimeoutRef.current);
    inputTypingTimeoutRef.current = setTimeout(() => emitStopTyping(), 1000);
  };

  // Emoji handlers
  const onEmojiClick = (emojiObject) => {
    setNewMessage(prev => prev + emojiObject.emoji);
  };

  const onQuickEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedUser || sending) return;
    const messageText = newMessage.trim();
    try {
      setSending(true);
      await messageAPI.sendMessage(selectedUser._id, messageText);
      setNewMessage('');
      emitStopTyping();
      setShowEmojiPicker(false);
    } catch (error) {
      toast.error('Failed to send message');
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const sendMedia = async (e) => {
    e.preventDefault();
    if (!mediaFile || !selectedUser) return;
    
    // Create abort controller for this upload
    const abortController = new AbortController();
    setUploadAbortController(abortController);
    
    try {
      setSending(true);
      setUploadProgress(0);
      await messageAPI.sendMediaMessage(selectedUser._id, mediaFile, (progressEvent) => {
        if (progressEvent.total) {
          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      }, abortController.signal);
      
      setMediaFile(null);
      setUploadProgress(0);
      setUploadAbortController(null);
      if (!newMessage.trim()) setNewMessage('');
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        toast.success("Upload cancelled");
      } else {
        toast.error("Failed to send media");
      }
      setMediaFile(null);
      setUploadProgress(0);
    } finally {
      setSending(false);
      setUploadAbortController(null);
    }
  };

  const handleClearChat = async () => {
    try {
      const response = await messageAPI.clearChat(selectedUser._id);
      if (response.data.success) {
        setMessages([]);
        toast.success("Chat cleared!");
      } else {
        toast.error(response.data.message || "Chat already cleared.");
      }
    } catch (err) {
      toast.error("Failed to clear chat (API error)");
    }
    setShowConfirm(false);
    setShowMenu(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const renderTick = (message) => {
    if (message.status === "seen") {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    } else if (message.status === "delivered") {
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    } else {
      return <Check className="w-4 h-4 text-gray-400" />;
    }
  };

  const toggleSelectMessage = (id) => {
    setSelectedMessages(prev =>
      prev.includes(id)
        ? prev.filter(mid => mid !== id)
        : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedMessages([]);

  const deleteForMe = async () => {
    try {
      await messageAPI.deleteForMe(selectedMessages);
      setMessages(prev => prev.map(msg =>
        selectedMessages.includes(msg._id)
          ? { ...msg, deletedBy: [...(msg.deletedBy || []), currentUser._id] }
          : msg
      ));
      clearSelection();
      toast.success("Deleted for you");
    } catch (err) {
      toast.error("Failed to delete for me");
    }
  };

  const deleteForEveryone = async () => {
    try {
      await messageAPI.deleteForEveryone(selectedMessages);
      setMessages(prev =>
        prev.map(msg =>
          selectedMessages.includes(msg._id)
            ? { ...msg, isDeletedForEveryone: true, message: "This message was deleted" }
            : msg
        )
      );
      clearSelection();
      toast.success("Deleted for everyone");
    } catch (err) {
      toast.error("Failed to delete for everyone");
    }
  };

  const visibleMessages = messages.filter(msg =>
    !(msg.deletedBy && msg.deletedBy.includes(currentUser._id))
  );

  const canDeleteForEveryone =
    selectedMessages.length > 0 &&
    visibleMessages
      .filter(msg => selectedMessages.includes(msg._id))
      .every(msg => {
        const senderId = typeof msg.senderId === "object" ? msg.senderId._id : msg.senderId;
        const myId = typeof currentUser._id === "object" ? currentUser._id.toString() : currentUser._id;
        return senderId.toString() === myId.toString() && !msg.isDeletedForEveryone;
      });

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 relative">
            <Send className="w-12 h-12 text-white" />
            {/* CC Logo */}
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
              <span className="text-sm font-bold text-blue-600">CC</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to ChatCore
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Select a conversation to start messaging
          </p>
        </div>
      </div>
    );
  }

  const isSelecting = selectedMessages.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 glass-card rounded-2xl m-4 mt-0 mb-0 shadow flex items-center justify-between min-h-[68px] relative">
        {isSelecting ? (
          <>
            <div className="flex items-center gap-3">
              <button
                onClick={clearSelection}
                className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-500 rounded-full transition"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold text-lg text-gray-900 dark:text-white">
                {selectedMessages.length} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1 py-2 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button
                onClick={clearSelection}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-all duration-300"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center space-x-3">
              {selectedUser && selectedUser.profilepic ? (
                <img
                  src={selectedUser.profilepic}
                  alt={selectedUser.fullname}
                  className="w-12 h-12 rounded-full object-cover avatar-ring"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold avatar-ring">
                  {getInitials(selectedUser?.fullname)}
                </div>
              )}
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {selectedUser?.fullname}
                </h2>
                <p className="text-sm text-green-500">
                  {isOtherUserTyping ? "typing..." : (isUserOnline(selectedUser._id) ? "Online" : "Offline")}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 relative">
              <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-300">
                <Phone className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-300">
                <Video className="w-5 h-5" />
              </button>
              <button
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-300 relative"
                onClick={() => setShowMenu(m => !m)}
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showMenu && (
                <div
                  ref={menuRef}
                  className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl z-50 border border-white/30 dark:border-gray-600/30 glass-card backdrop-blur-xl py-4 flex flex-col items-stretch"
                  style={{
                    minWidth: "180px",
                    background: "rgba(255,255,255,0.75)",
                    borderRadius: "18px",
                    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.13)",
                    border: "1px solid rgba(255,255,255,0.15)",
                  }}
                >
                  <button
                    className="w-full flex items-center px-5 py-1 text-left rounded-xl hover:bg-red-50 dark:hover:bg-red-900 text-red-500 transition-colors duration-200 gap-2 text-base font-semibold"
                    onClick={() => { setShowConfirm(true); setShowMenu(false); }}
                  >
                    <Trash2 className="w-5 h-5" />
                    Clear chat for me
                  </button>
                  <button
                    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md transition-all duration-150"
                    onClick={() => setShowMenu(false)}
                    aria-label="Close"
                    tabIndex={0}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Delete Modal for selection - UPDATED COLORS */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl text-center max-w-xs glass-card border border-white/20 dark:border-gray-600/20">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Delete selected messages?</h3>
            <div className="flex flex-col gap-3">
              {/* Delete for me - Blue gradient matching your theme */}
              <button
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-300 transform hover:scale-105 shadow-lg"
                onClick={() => { deleteForMe(); setShowDeleteModal(false); }}
              >
                <Trash2 className="inline w-4 h-4" /> Delete for me
              </button>
              {/* Delete for everyone - Purple gradient matching your theme */}
              {canDeleteForEveryone && (
                <button
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white transition-all duration-300 transform hover:scale-105 shadow-lg"
                  onClick={() => { deleteForEveryone(); setShowDeleteModal(false); }}
                >
                  <Trash2 className="inline w-4 h-4" /> Delete for everyone
                </button>
              )}
              {/* Cancel - Matching gray theme */}
              <button
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 shadow-lg"
                onClick={() => setShowDeleteModal(false)}
              >
                <X className="inline w-4 h-4" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal for clear chat */}
      {showConfirm && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-xs text-center glass-card border border-white/20 dark:border-gray-600/20"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Clear chat?</h3>
            <p className="text-gray-500 dark:text-gray-300 mb-4">Are you sure you want to clear this chat? This cannot be undone.</p>
            <div className="flex justify-center gap-4">
              <button
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-500 transition-all duration-300"
                onClick={() => setShowConfirm(false)}
              >
                No
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-300 shadow-lg"
                onClick={handleClearChat}
              >
                Yes, clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : visibleMessages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-white" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleMessages.map((message) => {
              const senderId = typeof message.senderId === "object" ? message.senderId._id : message.senderId;
              const myId = typeof currentUser._id === "object" ? currentUser._id.toString() : currentUser._id;
              const isOwn = senderId.toString() === myId.toString();
              const isSelected = selectedMessages.includes(message._id);
              const isEmojiOnly = message.message && isOnlyEmojis(message.message) && !message.media;
              
              return (
                <div
                  key={message._id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  onDoubleClick={e => {
                    e.stopPropagation();
                    toggleSelectMessage(message._id);
                  }}
                >
                  {selectedMessages.length > 0 && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectMessage(message._id)}
                      className="mr-2 my-auto accent-blue-500"
                      onClick={e => e.stopPropagation()}
                    />
                  )}
                  
                  {/* Emoji-only messages - larger and independent */}
                  {isEmojiOnly ? (
                    <div className={`flex flex-col items-${isOwn ? 'end' : 'start'} ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2' : ''}`}>
                      <div className="text-6xl mb-1 animate-bounce-subtle">
                        {message.message}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(message.createdAt)}
                        </span>
                        {isOwn && !message.isDeletedForEveryone && (
                          <span className="flex items-center">
                            {renderTick(message)}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Regular messages with bubble */
                    <div className={`max-w-xs lg:max-w-md px-5 py-3 ${isOwn ? 'chat-bubble-own' : 'chat-bubble-other'} shadow-md flex items-end gap-2 ${isSelected ? 'ring-2 ring-blue-400' : ''}`}>
                      {message.media && (
                        <div className="mb-2">
                          {message.media.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                            <div>
                              <img
                                src={getMediaUrl(message.media)}
                                alt="media"
                                className="max-w-[200px] rounded"
                              />
                              <div className="text-xs text-gray-400 mt-1">
                                {formatSize(message.mediaSize)}
                              </div>
                            </div>
                          ) : (
                            <FileDownloadWithProgress
                              url={getMediaUrl(message.media)}
                              fileName={extractFileName(message.media)}
                              fileSize={message.mediaSize}
                            />
                          )}
                        </div>
                      )}
                      
                      {message.isDeletedForEveryone ? (
                        <div style={{color:'rgba(255, 255, 255, 0.7)',fontStyle:'italic'}}>This message was deleted</div>
                      ) : (
                        <div className="flex-1">
                          {message.message && (
                            <p className="text-sm">{message.message}</p>
                          )}
                          <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      )}
                      
                      {isOwn && !message.isDeletedForEveryone && (
                        <span className="ml-1 flex items-center">
                          {renderTick(message)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input Area */}
      <div className="p-4 glass-card rounded-b-2xl relative">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div 
            ref={emojiPickerRef}
            className="absolute bottom-full left-4 z-50 mb-2"
          >
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 overflow-hidden">
              <QuickEmojis onEmojiClick={onQuickEmojiClick} />
              <EmojiPicker 
                onEmojiClick={onEmojiClick}
                theme={document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                emojiStyle="native"
                width={350}
                height={400}
                previewConfig={{
                  showPreview: false
                }}
                skinTonesDisabled={true}
                searchDisabled={false}
                categories={[
                  'smileys_people',
                  'animals_nature',
                  'food_drink',
                  'activities',
                  'travel_places',
                  'objects',
                  'symbols',
                  'flags'
                ]}
              />
            </div>
          </div>
        )}

        <form
          onSubmit={e => {
            e.preventDefault();
            if (mediaFile) {
              sendMedia(e);
            } else {
              sendMessage(e);
            }
          }}
          className="flex items-center space-x-3"
        >
          {/* File Upload */}
          <input
            type="file"
            accept="image/*,video/*"
            id="media-upload"
            className="hidden"
            onChange={e => setMediaFile(e.target.files[0])}
          />
          <label htmlFor="media-upload" className="cursor-pointer p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors">
            <Paperclip className="w-6 h-6" />
          </label>

          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 transition-colors ${showEmojiPicker ? 'text-yellow-500' : 'text-gray-500 hover:text-yellow-500'} dark:text-gray-400 dark:hover:text-yellow-400`}
          >
            <Smile className="w-6 h-6" />
          </button>

          {/* Media Preview */}
          {mediaFile && (
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
              <span className="text-sm text-blue-500">{mediaFile.name}</span>
              <span className="text-xs text-gray-400">({formatSize(mediaFile.size)})</span>
              <button
                type="button"
                onClick={() => {
                  // Cancel ongoing upload if exists
                  if (uploadAbortController) {
                    uploadAbortController.abort();
                    toast.info("Cancelling upload...");
                  }
                  // Always clear the file and states
                  setMediaFile(null);
                  setUploadProgress(0);
                  setSending(false);
                  setUploadAbortController(null);
                }}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
              {sending && (
                <div className="w-20 h-2 bg-gray-200 rounded ml-2">
                  <div className="h-2 bg-blue-500 rounded transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
          )}

          {/* Message Input */}
          <textarea
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey && !mediaFile) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 border-0 rounded-full resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300 max-h-32"
            disabled={sending}
            style={{ 
              minHeight: '48px',
              maxHeight: '128px',
              overflowY: newMessage.split('\n').length > 2 ? 'auto' : 'hidden'
            }}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!newMessage.trim() && !mediaFile) || sending}
            className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg animate-pop transition-all duration-300 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
          >
            {sending ? (
              <LoadingSpinner size="sm" color="white" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;