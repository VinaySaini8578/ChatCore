import React, { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';
import {
  Send,
  Check,
  CheckCheck,
  Smile,
  Paperclip,
  MessageCircle,
  ArrowDown,
  Reply,
  Copy,
  Trash2,
  Forward,
  X,
  Archive,
  ArchiveRestore,
  ShieldBan,
  ShieldCheck,
  Edit3,
  Info,
  Mic,
  Square as StopSquare,
  CheckSquare,
  Star,
  Image,
  FileText,
  Camera,
  ChevronDown,
  Music,
} from 'lucide-react';
import { messageAPI, conversationAPI, userAPI, resolveAssetUrl } from '../../../services/api.js';
import LoadingSpinner from '../../common/LoadingSpinner/LoadingSpinner.jsx';
import { useSocket } from '../../../contexts/SocketContext.jsx';
import FileDownloadWithProgress from '../../common/FileDownloadWithProgress/FileDownloadWithProgress.jsx';
import GroupSettingsPanel from '../Group/GroupSettingsPanel.jsx';
import MessageInfoDrawer from './MessageInfoDrawer.jsx';
import styles from './ChatWindow.module.css';

const ChatWindow = ({ currentUser, selectedUser, onClose, onConversationArchived, onGroupUpdated, onMessageSent }) => {
  const { socket, isUserOnline, isUserTyping, startTyping, stopTyping } = useSocket();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showActionsFor, setShowActionsFor] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [archived, setArchived] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [oneToOneConvId, setOneToOneConvId] = useState(null);
  const [infoForMessage, setInfoForMessage] = useState(null);

  // Attach menu
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const imgInputRef = useRef(null);
  const docInputRef = useRef(null);

  // Reply
  const [replyingTo, setReplyingTo] = useState(null);

  // Forward
  const [forwardForMessage, setForwardForMessage] = useState(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardList, setForwardList] = useState([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardSearch, setForwardSearch] = useState('');
  const [selectedForForward, setSelectedForForward] = useState([]);

  // Selection
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState({
    open: false,
    deleteForEveryone: false
  });

  // Voice recorder
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [recordStartAt, setRecordStartAt] = useState(null);
  const [recordSecs, setRecordSecs] = useState(0);
  const recordTimerRef = useRef(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);

  // Typing timeout ref
  const typingTimeoutRef = useRef(null);

  // Unread divider handling
  const [lastVisitAt, setLastVisitAt] = useState(0);

  // Clear Chat
  const [showClearChatModal, setShowClearChatModal] = useState(false);

  // New Message Info
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const attachMenuRef = useRef(null);

  // Focus input when chat opens/changes
  useEffect(() => {
    if (selectedUser) setTimeout(() => inputRef.current?.focus(), 0);
  }, [selectedUser]);

  // Update typing status
  useEffect(() => {
    if (!selectedUser) return;
    const isTyping = isUserTyping && isUserTyping(selectedUser._id);
    setIsOtherUserTyping(isTyping);
  }, [selectedUser, isUserTyping]);

  // Calculate unread messages
  useEffect(() => {
    if (!lastVisitAt || !messages.length || !currentUser) return;

    const myId = currentUser._id.toString();
    const unread = messages.filter(m => {
      if (!m || !m.createdAt) return false;
      const t = new Date(m.createdAt).getTime();
      const senderId = typeof m.senderId === 'object' ? m.senderId?._id : m.senderId;
      return t > lastVisitAt && String(senderId) !== myId;
    });

    setUnreadCount(unread.length);
  }, [messages, lastVisitAt, currentUser]);

  // Close attach menu when clicking outside
  useEffect(() => {
    if (!showAttachMenu) return;
    const handleClickOutside = (event) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachMenu]);

  // Persist last-visit per chat
  const visitKey = useMemo(
    () =>
      selectedUser
        ? `chat:lastVisit:${selectedUser.isGroup ? 'g' : 'u'}:${selectedUser._id}`
        : '',
    [selectedUser]
  );
  useEffect(() => {
    if (!visitKey) return;
    const prev = parseInt(localStorage.getItem(visitKey) || '0', 10);
    setLastVisitAt(Number.isFinite(prev) ? prev : 0);
    return () => {
      localStorage.setItem(visitKey, Date.now().toString());
    };
  }, [visitKey]);

  // Scroll detection for "jump to bottom" button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowScrollButton(!isNearBottom);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Fetch messages when selected user changes
  useEffect(() => {
    setMessages([]);
    setOneToOneConvId(null);
    setReplyingTo(null);
    setSelectionMode(false);
    setSelectedIds(new Set());
    if (!selectedUser) return;

    if (selectedUser.isGroup) {
      fetchGroupMessages();
      setArchived(false);
    } else {
      fetchMessages();
      conversationAPI
        .ensureOneToOne(selectedUser._id)
        .then((res) => setOneToOneConvId(res?.data?.conversationId))
        .catch(() => setOneToOneConvId(null));
      setArchived(false);
    }
  }, [selectedUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket: receive messages and deletions; mark delivered/seen via API
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = async (message) => {
      const myId = currentUser._id.toString();
      const senderId =
        typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
      const isMine = String(senderId) === myId;

      // Immediately record delivered for messages I receive (1:1 or group)
      if (!isMine) {
        try {
          await messageAPI.markDelivered(message._id);
        } catch { }
      }

      const isGroupMsg = !!message.isGroup;
      const receiverId =
        typeof message.receiverId === 'object' ? message.receiverId?._id : message.receiverId;

      if (!selectedUser) return;

      if (
        selectedUser.isGroup &&
        isGroupMsg &&
        String(message.conversationId) === String(selectedUser._id)
      ) {
        setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]));
        if (!isMine) {
          try {
            await messageAPI.markSeen(message._id);
          } catch { }
        }
        return;
      }

      if (!selectedUser.isGroup && !isGroupMsg) {
        const isSame1to1 =
          (String(senderId) === String(selectedUser._id) && String(receiverId) === myId) ||
          (String(senderId) === myId && String(receiverId) === String(selectedUser._id));

        if (isSame1to1) {
          setMessages((prev) =>
            prev.some((m) => m._id === message._id) ? prev : [...prev, message]
          );
          if (!isMine) {
            try {
              await messageAPI.markSeen(message._id);
            } catch { }
          }
        }
      }
    };

    const handleDeletedForEveryone = ({ messageId }) => {
      // Remove the message completely instead of showing a placeholder
      setMessages((prev) => prev.filter(m => m._id !== messageId));
    };

    socket.on('new-message', handleNewMessage);
    socket.on('message-deleted-everyone', handleDeletedForEveryone);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('message-deleted-everyone', handleDeletedForEveryone);
    };
  }, [socket, selectedUser, currentUser]);

  // Mark all incoming messages as seen when loading a chat
  const markAllSeen = async (list) => {
    const myId = currentUser._id.toString();
    const ids = (list || [])
      .filter((m) => {
        const senderId = typeof m.senderId === 'object' ? m.senderId._id : m.senderId;
        return String(senderId) !== myId;
      })
      .map((m) => m._id);
    for (const id of ids) {
      try {
        await messageAPI.markSeen(id);
      } catch { }
    }
  };

  // Handle text input changes with typing notifications
  const handleTextareaChange = (e) => {
    const text = e.target.value;
    setNewMessage(text);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';

    // Emit typing event
    if (text.length > 0 && selectedUser) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      const receiverId = selectedUser._id;
      const senderName = currentUser.fullname;

      startTyping(receiverId, senderName);

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(receiverId);
      }, 3000);
    } else if (text.length === 0 && selectedUser) {
      stopTyping(selectedUser._id);
    }
  };

  const clearEntireChat = async () => {
    try {
      if (selectedUser.isGroup) {
        await messageAPI.clearGroupChat(selectedUser._id);
      } else {
        await messageAPI.clearChat(selectedUser._id);
      }

      setMessages([]);
      toast.success('Chat cleared');
      setShowClearChatModal(false);
    } catch (error) {
      toast.error(error.message || 'Failed to clear chat');
    }
  };

  const fetchMessages = async () => {
    if (!selectedUser || selectedUser.isGroup) return;
    try {
      setLoading(true);
      const response = await messageAPI.getMessages(selectedUser._id);
      setMessages(response.data || []);
      await markAllSeen(response.data || []);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupMessages = async () => {
    try {
      setLoading(true);
      const res = await messageAPI.getGroupMessages(selectedUser._id);
      setMessages(res.data || []);
      await markAllSeen(res.data || []);
    } catch {
      toast.error('Failed to load group messages');
    } finally {
      setLoading(false);
    }
  };

  // Combined function for both message action and selection mode forwarding
  const openForwardModal = (message = null) => {
    // In selection mode without a specific message
    if (!message && selectedIds.size === 0) {
      toast.error('Select messages to forward');
      return;
    }

    if (message) {
      setForwardForMessage(message);
    }

    setForwardOpen(true);
    setForwardSearch('');
    setSelectedForForward([]);
    setForwardLoading(true);

    userAPI.getCurrentChatters()
      .then(res => {
        setForwardList(res?.data || []);
      })
      .catch(() => {
        setForwardList([]);
      })
      .finally(() => {
        setForwardLoading(false);
      });
  };

  const forwardToSelected = async () => {
    if (selectedForForward.length === 0) return;
    try {
      const receiverIds = selectedForForward.map(target => target._id);

      // Handle both single message forward and multi-select forward
      const messageIds = forwardForMessage ?
        [forwardForMessage._id] :
        Array.from(selectedIds);

      await messageAPI.forwardMessages(messageIds, receiverIds);

      toast.success(`${messageIds.length} message(s) forwarded to ${selectedForForward.length} chat(s)`);
      setForwardOpen(false);
      setForwardForMessage(null);
      setSelectedForForward([]);
      if (selectionMode) clearSelection();
    } catch (e) {
      toast.error(e.message || 'Forward failed');
    }
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedUser || sending) return;
    const text = newMessage.trim();
    setNewMessage('');

    try {
      setSending(true);
      const options = {};
      if (replyingTo) options.replyTo = replyingTo._id;

      let response;
      if (selectedUser.isGroup) {
        response = await messageAPI.sendGroupMessage(selectedUser._id, text, options);
      } else {
        response = await messageAPI.sendMessage(selectedUser._id, text, options);
      }

      // Signal to parent to update sidebar
      if (response && response.success) {
        onMessageSent && onMessageSent(selectedUser._id, text);
      }

      setReplyingTo(null);

      // Stop typing indicator when message is sent
      stopTyping(selectedUser._id);
    } catch (err) {
      toast.error(err.message || 'Failed to send message');
      setNewMessage(text);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const onFileSelected = async (e, type = 'any') => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;

    try {
      setIsUploading(true);
      const options = { file, caption: '' };
      if (replyingTo) options.replyTo = replyingTo._id;

      let response;
      if (selectedUser.isGroup) {
        response = await messageAPI.sendGroupMedia(selectedUser._id, options);
      } else {
        response = await messageAPI.sendMedia(selectedUser._id, options);
      }

      // Signal to parent to update sidebar
      if (response && response.success) {
        onMessageSent && onMessageSent(selectedUser._id, `📎 ${file.name.substring(0, 20)}`);
      }

      setReplyingTo(null);
    } catch (err) {
      toast.error('Failed to upload');
    } finally {
      setIsUploading(false);
      e.target.value = '';
      inputRef.current?.focus();
      setShowAttachMenu(false);
    }
  };

  const handleImageSelect = () => {
    imgInputRef.current?.click();
  };

  const handleDocumentSelect = () => {
    docInputRef.current?.click();
  };

  const deleteForMe = async (ids) => {
    try {
      const arr = Array.isArray(ids) ? ids : [ids];
      await messageAPI.deleteForMe(arr);

      // Completely remove the messages from the local state
      setMessages((prev) => prev.filter((m) => !arr.includes(m._id)));

      // Close the modal and clear selection
      setConfirmDeleteOpen({ open: false, deleteForEveryone: false });
      clearSelection();
    } catch {
      toast.error('Delete failed');
    }
  };

  const deleteForEveryone = async (ids) => {
    try {
      const arr = Array.isArray(ids) ? ids : [ids];
      const response = await messageAPI.deleteForEveryone(arr);

      if (response && response.success) {
        // Remove messages from the UI
        setMessages((prev) => prev.filter((m) => !arr.includes(m._id)));

        // Show success message
        toast.success("Messages deleted for everyone");

        // Close the modal and clear selection
        setConfirmDeleteOpen({ open: false, deleteForEveryone: false });
        clearSelection();
      } else {
        throw new Error("Delete operation failed");
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete messages for everyone');
    }
  };

  const toggleStarMessage = async (message) => {
    const isStarred = message.starredBy?.includes(currentUser._id);
    try {
      if (isStarred) {
        await messageAPI.unstar(message._id);
        setMessages(prev => prev.map(m =>
          m._id === message._id
            ? { ...m, starredBy: m.starredBy?.filter(id => id !== currentUser._id) }
            : m
        ));
        toast.success('Message unstarred');
      } else {
        await messageAPI.star(message._id);
        setMessages(prev => prev.map(m =>
          m._id === message._id
            ? { ...m, starredBy: [...(m.starredBy || []), currentUser._id] }
            : m
        ));
        toast.success('Message starred');
      }
    } catch {
      toast.error('Failed to update star');
    }
  };

  const toggleArchive = async () => {
    try {
      if (selectedUser.isGroup) {
        if (!archived) {
          await conversationAPI.archive(selectedUser._id);
          toast.success('Chat archived');
          setArchived(true);
          onConversationArchived?.(selectedUser._id, true, true);
        } else {
          await conversationAPI.unarchive(selectedUser._id);
          toast.success('Chat unarchived');
          setArchived(false);
          onConversationArchived?.(selectedUser._id, true, false);
        }
      } else {
        if (!oneToOneConvId) return toast.error('Unable to find conversation ID');
        if (!archived) {
          await conversationAPI.archive(oneToOneConvId);
          toast.success('Chat archived');
          setArchived(true);
          onConversationArchived?.(selectedUser._id, false, true);
        } else {
          await conversationAPI.unarchive(oneToOneConvId);
          toast.success('Chat unarchived');
          setArchived(false);
          onConversationArchived?.(selectedUser._id, false, false);
        }
      }
    } catch (e) {
      toast.error(e.message || 'Failed to update archive');
    }
  };

  const toggleBlock = async () => {
    try {
      if (selectedUser.isGroup) return;
      if (!blocked) {
        await userAPI.block(selectedUser._id);
        setBlocked(true);
        toast.success('User blocked');
      } else {
        await userAPI.unblock(selectedUser._id);
        setBlocked(false);
        toast.success('User unblocked');
      }
    } catch {
      toast.error('Failed to update block');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      mr.onstop = async () => {
        try {
          if (chunks.length === 0) return; // Don't process if canceled

          const blob = new Blob(chunks, { type: 'audio/webm' });
          const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
          setIsUploading(true);
          const options = { file, caption: '' };
          if (replyingTo) options.replyTo = replyingTo._id;

          let response;
          if (selectedUser.isGroup) {
            response = await messageAPI.sendGroupMedia(selectedUser._id, options);
          } else {
            response = await messageAPI.sendMedia(selectedUser._id, options);
          }

          // Update sidebar with new voice message
          if (response && response.success) {
            onMessageSent && onMessageSent(selectedUser._id, `🎵 Voice message`);
          }

          setReplyingTo(null);
        } catch (err) {
          toast.error('Failed to send voice message');
        } finally {
          setIsUploading(false);
          setRecording(false);
          setIsRecordingActive(false);
          setRecorder(null);
          clearInterval(recordTimerRef.current);
          setRecordSecs(0);
          stream.getTracks().forEach((t) => t.stop());
        }
      };

      mr.start();
      setRecorder(mr);
      setRecording(true);
      setIsRecordingActive(true);
      const startTime = Date.now();
      setRecordStartAt(startTime);
      setRecordSecs(0);
      recordTimerRef.current = setInterval(() =>
        setRecordSecs(Math.floor((Date.now() - startTime) / 1000)), 250
      );
    } catch (err) {
      toast.error('Microphone permission denied');
      setIsRecordingActive(false);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stopRecording = () => {
    try {
      recorder?.stop();
    } catch (err) {
      setRecording(false);
      setIsRecordingActive(false);
      setRecorder(null);
    }
  };

  const onEmojiClick = (emoji) => {
    setNewMessage((prev) => prev + (emoji.emoji || ''));
    inputRef.current?.focus();
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }
  };

  const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (ts) => {
    const date = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitials = (name) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';

  const renderMessageStatus = (message) => {
    if (selectedUser?.isGroup) return null; // omit ticks for group for now
    if (message.status === 'seen')
      return <CheckCheck className={styles.statusIconSeen} size={16} />;
    if (message.status === 'delivered')
      return <CheckCheck className={styles.statusIconDelivered} size={16} />;
    return <Check className={styles.statusIconSent} size={16} />;
  };

  // Unread divider should be for receiver side only (not for my own messages)
  const firstUnreadId = useMemo(() => {
    if (!lastVisitAt || !messages.length || !currentUser || !currentUser._id) return null;
    const myId = currentUser._id.toString();
    const idx = messages.findIndex((m) => {
      if (!m || !m.createdAt) return false;
      const t = new Date(m.createdAt).getTime();
      const senderId = typeof m.senderId === 'object' ? m.senderId?._id : m.senderId;
      return t > lastVisitAt && String(senderId) !== myId;
    });
    return idx >= 0 ? messages[idx]._id : null;
  }, [messages, lastVisitAt, currentUser]);

  // Group messages by day for date dividers
  const grouped = useMemo(() => {
    if (!messages || !messages.length) return [];

    const map = new Map();
    for (const m of messages) {
      if (!m || !m.createdAt) continue;
      const key = new Date(m.createdAt).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return Array.from(map.entries());
  }, [messages]);

  const filterForwardList = useMemo(() => {
    const q = forwardSearch.trim().toLowerCase();
    if (!q) return forwardList;
    return forwardList.filter((item) => {
      const name = item.isGroup ? item.name : item.fullname;
      const handle = item.isGroup ? item.name : item.username;
      return (name || '').toLowerCase().includes(q) || (handle || '').toLowerCase().includes(q);
    });
  }, [forwardSearch, forwardList]);

  const beginSelectionWith = (id) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return set;
    });
  };

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleForwardSelection = (target) => {
    setSelectedForForward(prev => {
      const exists = prev.find(item => item._id === target._id);
      if (exists) {
        return prev.filter(item => item._id !== target._id);
      } else {
        return [...prev, target];
      }
    });
  };

  const renderReplyPreview = (m) => {
    if (!m?.replyTo) return null;
    const rt = m.replyTo;

    const sender =
      typeof rt.senderId === 'object'
        ? rt.senderId.fullname || rt.senderId.username || 'Someone'
        : 'Someone';

    const label = rt.media
      ? rt.mediaType === 'image'
        ? '📷 Photo'
        : rt.mediaType === 'video'
          ? '🎥 Video'
          : rt.mediaType === 'audio'
            ? '🎵 Audio'
            : '📄 Document'
      : rt.message?.slice(0, 80);

    // Store the message ID we're replying to
    const replyId = rt._id;

    // Function to scroll to original message
    const scrollToOriginalMessage = () => {
      const messageElement = document.getElementById(`msg-${replyId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Highlight the message briefly
        messageElement.classList.add(styles.highlighted);
        setTimeout(() => {
          messageElement.classList.remove(styles.highlighted);
        }, 2000);
      }
    };

    return (
      <div
        className={styles.replyStrip}
        onClick={scrollToOriginalMessage}
      >
        <div className={styles.replySender}>{sender}</div>
        <div className={styles.replySnippet}>{label || ''}</div>
      </div>
    );
  };

  const renderForwardBadge = (m) => {
    if (!m.isForwarded) return null;
    const from =
      typeof m.forwardedFrom === 'object'
        ? m.forwardedFrom.fullname || m.forwardedFrom.username
        : null;
    return (
      <div className={styles.forwardBadge}>
        <Forward size={12} />
        Forwarded{from ? ` from ${from}` : ''}
      </div>
    );
  };

  const renderActions = (message, isOwn) => {
    const isStarred = message.starredBy?.includes(currentUser._id);

    return (
      <div className={styles.messageActions}>
        <button
          className={styles.actionBtn}
          title="Select"
          onClick={() => beginSelectionWith(message._id)}
        >
          <CheckSquare size={16} />
        </button>
        <button
          className={styles.actionBtn}
          title="Reply"
          onClick={() => setReplyingTo(message)}
        >
          <Reply size={16} />
        </button>
        <button
          className={styles.actionBtn}
          title={isStarred ? 'Unstar' : 'Star'}
          onClick={() => toggleStarMessage(message)}
        >
          <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
        </button>
        <button
          className={styles.actionBtn}
          title="Copy"
          onClick={() => {
            if (message.message) {
              navigator.clipboard.writeText(message.message);
              toast.success('Message copied');
            }
          }}
        >
          <Copy size={16} />
        </button>
        <button
          className={styles.actionBtn}
          title="Forward"
          onClick={() => openForwardModal(message)}
        >
          <Forward size={16} />
        </button>
        {selectedUser.isGroup && (
          <button
            className={styles.actionBtn}
            title="Message info"
            onClick={() => setInfoForMessage(message._id)}
          >
            <Info size={16} />
          </button>
        )}
      </div>
    );
  };

  if (!selectedUser) {
    return (
      <div className={styles.chatWindow}>
        <div className={styles.welcomeState}>
          <div className={styles.welcomeContent}>
            <div className={styles.logoContainer}>
              <div className={styles.logo}>
                <MessageCircle className={styles.logoIcon} />
              </div>
              <div className={styles.logoSparkle}></div>
            </div>
            <h2 className={styles.welcomeTitle}>Welcome to ChatCore</h2>
            <p className={styles.welcomeDescription}>
              Select a conversation from the sidebar to start chatting.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Header component with selection mode
  const Header = () => (
    <div className={styles.chatHeader}>
      {!selectionMode ? (
        <>
          {/* Regular chat header */}
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {selectedUser.isGroup ? (
                selectedUser.groupAvatar ? (
                  <img
                    src={resolveAssetUrl(selectedUser.groupAvatar)}
                    alt={selectedUser.name}
                    className={styles.avatarImage}
                  />
                ) : (
                  <span className={styles.avatarText}>
                    {(selectedUser.name || '?').slice(0, 2).toUpperCase()}
                  </span>
                )
              ) : selectedUser.profilepic ? (
                <img
                  src={resolveAssetUrl(selectedUser.profilepic)}
                  alt={selectedUser.fullname}
                  className={styles.avatarImage}
                />
              ) : (
                <span className={styles.avatarText}>{getInitials(selectedUser.fullname)}</span>
              )}
              {!selectedUser.isGroup && isUserOnline(selectedUser._id) && (
                <div className={styles.onlineDot}></div>
              )}
            </div>
            <div className={styles.userDetails}>
              <h3 className={styles.userName}>
                {selectedUser.isGroup ? selectedUser.name : selectedUser.fullname}
              </h3>
              <div className={styles.userStatus}>
                {selectedUser.isGroup ? (
                  <span className={styles.statusText}>Group</span>
                ) : isOtherUserTyping ? (
                  <div className={styles.typingIndicator}>
                    <span className={styles.typingText}>typing</span>
                    <div className={styles.typingDots}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                ) : (
                  <span className={styles.statusText}>
                    {isUserOnline(selectedUser._id) ? 'online' : 'offline'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Regular action buttons */}
          <div className={styles.headerActions}>
            {selectedUser.isGroup && (
              <button
                className={styles.headerButton}
                title="Edit group"
                onClick={() => setGroupEditOpen(true)}
              >
                <Edit3 className={styles.headerIcon} />
              </button>
            )}
            <button
              className={styles.headerButton}
              title={archived ? 'Unarchive chat' : 'Archive chat'}
              onClick={toggleArchive}
            >
              {archived ? (
                <ArchiveRestore className={styles.headerIcon} />
              ) : (
                <Archive className={styles.headerIcon} />
              )}
            </button>
            <button
              className={styles.headerButton}
              title="Clear chat"
              onClick={() => setShowClearChatModal(true)}
            >
              <Trash2 className={styles.headerIcon} />
            </button>
            {!selectedUser.isGroup && (
              <button
                className={styles.headerButton}
                title={blocked ? 'Unblock user' : 'Block user'}
                onClick={toggleBlock}
              >
                {blocked ? (
                  <ShieldCheck className={styles.headerIcon} />
                ) : (
                  <ShieldBan className={styles.headerIcon} />
                )}
              </button>
            )}
            <button className={styles.headerButton} title="Close chat" onClick={onClose}>
              <X className={styles.headerIcon} />
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Selection mode header */}
          <div className={styles.selectionHeader}>
            <button
              className={styles.headerButton}
              title="Cancel selection"
              onClick={clearSelection}
            >
              <X className={styles.headerIcon} />
            </button>
            <div className={styles.selectionInfo}>
              <span className={styles.selectionText}>{selectedIds.size} selected</span>
            </div>
            <div className={styles.selectionActions}>
              <button
                className={styles.headerButton}
                title="Forward selected"
                onClick={openForwardModal}
              >
                <Forward className={styles.headerIcon} />
              </button>
              <button
                className={styles.headerButton}
                title="Delete selected"
                onClick={() => setConfirmDeleteOpen({ open: true, deleteForEveryone: false })}
                disabled={selectedIds.size === 0}
                style={{ zIndex: 10 }} // Added to ensure clickability
              >
                <Trash2 className={styles.headerIcon} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className={styles.chatWindow}>
      <Header />

      <div className={styles.messagesContainer} ref={messagesContainerRef}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <LoadingSpinner />
            <p className={styles.loadingText}>Loading messages...</p>
          </div>
        ) : grouped.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <MessageCircle className={styles.emptyIconSvg} />
            </div>
            <h3 className={styles.emptyTitle}>No messages yet</h3>
            <p className={styles.emptyDescription}>
              {selectedUser.isGroup
                ? 'Start the conversation with your group.'
                : `Start the conversation with ${selectedUser.fullname}!`}
            </p>
          </div>
        ) : (
          <div className={styles.messagesArea}>
            {grouped.map(([dateKey, dayMessages]) => (
              <div key={dateKey} className={styles.messageGroup}>
                <div className={styles.dateDivider}>
                  <span className={styles.dateLabel}>
                    {formatDate(dayMessages[0].createdAt)}
                  </span>
                </div>
                {dayMessages.map((message) => {
                  const senderId =
                    typeof message.senderId === 'object'
                      ? message.senderId._id
                      : message.senderId;
                  const myId = currentUser._id.toString();
                  const isOwn = String(senderId) === myId;
                  const selected = selectedIds.has(message._id);
                  const isStarred = message.starredBy?.includes(currentUser._id);

                  return (
                    <React.Fragment key={message._id}>
                      {firstUnreadId === message._id && (
                        <div className={styles.unreadDivider}>
                          <span>New messages ({unreadCount})</span>
                        </div>
                      )}

                      <div
                        id={`msg-${message._id}`} // Added ID for scrolling to messages
                        className={`${styles.messageWrapper} ${isOwn ? styles.own : styles.other} ${selected ? styles.selected : ''}`}
                        onMouseLeave={() => setShowActionsFor(null)}
                        onClick={() => (selectionMode ? toggleSelect(message._id) : null)}
                      >
                        {selectionMode && (
                          <div
                            className={styles.selectCircle}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(message._id);
                            }}
                          >
                            {selected && <Check size={14} />}
                          </div>
                        )}
                        <div
                          className={`${styles.messageBubble} ${isStarred ? styles.starred : ''
                            }`}
                          onMouseEnter={() => setShowActionsFor(message._id)}
                        >
                          {renderForwardBadge(message)}
                          {renderReplyPreview(message)}

                          <div className={styles.messageContent}>
                            {selectedUser.isGroup && !isOwn && (
                              <div className={styles.groupSenderLine}>
                                <span className={styles.groupSenderName}>
                                  {typeof message.senderId === 'object'
                                    ? message.senderId.fullname ||
                                    message.senderId.username ||
                                    'Member'
                                    : 'Member'}
                                </span>
                              </div>
                            )}

                            {message.media && message.mediaType === 'image' && (
                              <img
                                src={resolveAssetUrl(message.media)}
                                alt={message.mediaName || 'image'}
                                className={styles.mediaImage}
                                onClick={() => {
                                  // Open image in modal/fullscreen
                                  window.open(resolveAssetUrl(message.media), '_blank');
                                }}
                              />
                            )}
                            {message.media && message.mediaType === 'video' && (
                              <video
                                className={styles.mediaVideo}
                                controls
                                src={resolveAssetUrl(message.media)}
                              />
                            )}
                            {message.media && message.mediaType === 'audio' && (
                              <div className={styles.audioMessage}>
                                <div className={styles.audioPlayer}>
                                  <div className={styles.audioPlayerIcon}>
                                    <Music size={16} />
                                  </div>
                                  <div className={styles.audioPlayerContent}>
                                    <div className={styles.audioPlayerInfo}>
                                      <span className={styles.audioPlayerTitle}>Voice Message</span>
                                      {message.mediaDuration && (
                                        <span className={styles.audioPlayerDuration}>
                                          {formatDuration(Math.floor(message.mediaDuration))}
                                        </span>
                                      )}
                                    </div>
                                    <audio
                                      className={styles.mediaAudio}
                                      controls
                                      src={resolveAssetUrl(message.media)}
                                      onLoadedMetadata={(e) => {
                                        // Optional: You can store the duration in the message if needed
                                        // This will show the actual duration of the loaded audio
                                        const duration = Math.floor(e.target.duration);
                                        if (duration && !message.mediaDuration) {
                                          setMessages(prev => prev.map(m =>
                                            m._id === message._id
                                              ? { ...m, mediaDuration: duration }
                                              : m
                                          ));
                                        }
                                      }}
                                    />
                                  </div>
                                  <div className={styles.audioPlayerTime}>
                                    {formatTime(message.createdAt)}
                                  </div>
                                </div>
                                {recording && message._id === 'temp-recording' && (
                                  <span className={styles.recordingTimer}>
                                    Recording... {recordSecs}s
                                  </span>
                                )}
                              </div>
                            )}
                            {message.media && message.mediaType === 'document' && (
                              <div className={styles.mediaDocument}>
                                <FileDownloadWithProgress
                                  url={resolveAssetUrl(message.media)}
                                  fileName={message.mediaName || 'file'}
                                  fileSize={message.mediaSize}
                                />
                              </div>
                            )}

                            {message.isDeletedForEveryone ? (
                              <em className={styles.deletedMessage}>
                                This message was deleted
                              </em>
                            ) : (
                              message.message && (
                                <p className={styles.messageText}>{message.message}</p>
                              )
                            )}

                            {isStarred && (
                              <div className={styles.starIndicator}>
                                <Star size={12} fill="currentColor" />
                              </div>
                            )}
                          </div>

                          <div className={styles.messageMeta}>
                            <span className={styles.messageTime}>
                              {formatTime(message.createdAt)}
                            </span>
                            {!selectedUser.isGroup && isOwn && !message.isDeletedForEveryone && (
                              <div className={styles.messageStatus}>
                                {renderMessageStatus(message)}
                              </div>
                            )}
                          </div>

                          {showActionsFor === message._id &&
                            !message.isDeletedForEveryone &&
                            !selectionMode &&
                            renderActions(message, isOwn)}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}

        {showScrollButton && (
          <button onClick={() => scrollToBottom()} className={styles.scrollButton}>
            <ArrowDown className={styles.scrollIcon} />
          </button>
        )}
      </div>

      {/* Replying bar */}
      {replyingTo && (
        <div className={styles.replyBar}>
          <div className={styles.replyBarLeft}>
            <Reply size={16} />
            <div className={styles.replyBarTexts}>
              <div className={styles.replyBarTitle}>Replying to</div>
              <div className={styles.replyBarSnippet}>
                {replyingTo.media
                  ? replyingTo.mediaType === 'image'
                    ? '📷 Photo'
                    : replyingTo.mediaType === 'video'
                      ? '🎥 Video'
                      : replyingTo.mediaType === 'audio'
                        ? '🎵 Audio'
                        : '📄 Document'
                  : replyingTo.message?.slice(0, 90)}
              </div>
            </div>
          </div>
          <button className={styles.replyBarClose} onClick={() => setReplyingTo(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {isRecordingActive ? (
        <div className={styles.recordingBox}>
          <div className={styles.recordingContent}>
            <div className={styles.recordingPulse}>
              <span className={styles.recordingIcon}></span>
            </div>
            <div className={styles.recordingWaveform}>
              {[...Array(10)].map((_, i) => (
                <span key={i} className={styles.waveformBar}></span>
              ))}
            </div>
            <div className={styles.recordingTimer}>
              <span className={styles.timerIcon}>🎙️</span>
              <span className={styles.timerText}>{formatDuration(recordSecs)}</span>
            </div>
            <div className={styles.recordingControls}>
              <button
                className={styles.recordingCancel}
                aria-label="Cancel recording"
                onClick={() => {
                  setIsRecordingActive(false);
                  setRecording(false);

                  // Stop recording without sending
                  if (recorder) {
                    // Remove the ondataavailable event to prevent data collection
                    recorder.ondataavailable = null;
                    recorder.onstop = null;
                    recorder.stop();

                    // Clean up MediaStream tracks
                    recorder.stream?.getTracks().forEach(track => track.stop());
                  }

                  clearInterval(recordTimerRef.current);
                  setRecordSecs(0);
                  setRecorder(null);
                }}
              >
                <X size={20} />
                <span className={styles.btnLabel}>Cancel</span>
              </button>
              <button
                className={styles.recordingSend}
                aria-label="Send recording"
                onClick={stopRecording}
              >
                <Send size={20} />
                <span className={styles.btnLabel}>Send</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.inputContainer}>
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className={styles.emojiPickerContainer}>
              <EmojiPicker
                onEmojiClick={onEmojiClick}
                theme="light"
                emojiStyle="native"
                width={350}
                height={400}
                previewConfig={{ showPreview: false }}
              />
            </div>
          )}

          <div className={styles.inputWrapper}>
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                inputRef.current?.focus();
              }}
              className={styles.inputButton}
              title="Emoji"
            >
              <Smile className={styles.inputIcon} />
            </button>

            {/* Enhanced Attach menu */}
            <div className={styles.attachWrap} ref={attachMenuRef}>
              <button
                className={styles.inputButton}
                title="Attach"
                onClick={() => setShowAttachMenu((s) => !s)}
                disabled={isUploading}
              >
                {isUploading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Paperclip className={styles.inputIcon} />
                )}
              </button>
              {showAttachMenu && (
                <div className={styles.attachMenu}>
                  <button
                    type="button"
                    className={styles.attachOption}
                    onClick={handleImageSelect}
                  >
                    <Image size={18} />
                    <span>Photo</span>
                  </button>
                  <button
                    type="button"
                    className={styles.attachOption}
                    onClick={handleDocumentSelect}
                  >
                    <FileText size={18} />
                    <span>Document</span>
                  </button>
                </div>
              )}
              <input
                ref={imgInputRef}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={(e) => onFileSelected(e, 'image')}
              />
              <input
                ref={docInputRef}
                type="file"
                accept="application/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                hidden
                onChange={(e) => onFileSelected(e, 'document')}
              />
            </div>

            <button
              className={styles.inputButton}
              title="Record voice message"
              onClick={startRecording}
            >
              <Mic className={styles.inputIcon} />
            </button>

            <div className={styles.textInputWrapper}>
              <textarea
                ref={inputRef}
                autoFocus
                value={newMessage}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className={styles.textInput}
                placeholder="Type a message..."
                rows={1}
                disabled={sending || recording}
              />
            </div>

            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim() || recording}
              className={styles.sendButton}
              title="Send message"
            >
              {sending ? (
                <LoadingSpinner size="sm" color="white" />
              ) : (
                <Send className={styles.sendIcon} />
              )}
            </button>
          </div>
        </div>
      )}

      {selectedUser.isGroup && (
        <GroupSettingsPanel
          open={groupEditOpen}
          onClose={() => setGroupEditOpen(false)}
          group={selectedUser}
          onUpdated={(g) => {
            onGroupUpdated?.(g);
            setGroupEditOpen(false);
          }}
        />
      )}

      {/* Message Info Drawer (for groups) */}
      <MessageInfoDrawer
        open={!!infoForMessage}
        onClose={() => setInfoForMessage(null)}
        messageId={infoForMessage}
        currentUser={currentUser}
      />

      {/* Forward Modal */}
      {forwardOpen && (
        <div className={styles.modalBackdrop} onClick={() => setForwardOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h4>Forward message to...</h4>
              <button className={styles.modalClose} onClick={() => setForwardOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <input
                className={styles.modalSearch}
                placeholder="Search chats..."
                value={forwardSearch}
                onChange={(e) => setForwardSearch(e.target.value)}
              />
              {selectedForForward.length > 0 && (
                <div className={styles.selectedForward}>
                  <div className={styles.selectedTitle}>
                    Selected: {selectedForForward.length}
                  </div>
                  <div className={styles.selectedList}>
                    {selectedForForward.map((item) => (
                      <span key={item._id} className={styles.selectedChip}>
                        {item.isGroup ? item.name : item.fullname}
                        <button onClick={() => toggleForwardSelection(item)}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {forwardLoading ? (
                <div className={styles.modalLoading}>
                  <LoadingSpinner /> Loading...
                </div>
              ) : filterForwardList.length === 0 ? (
                <div className={styles.modalEmpty}>No chats found</div>
              ) : (
                <div className={styles.forwardList}>
                  {filterForwardList.map((c) => {
                    const isSelected = selectedForForward.some(item => item._id === c._id);
                    return (
                      <button
                        key={c._id}
                        className={`${styles.forwardItem} ${isSelected ? styles.forwardItemSelected : ''
                          }`}
                        onClick={() => toggleForwardSelection(c)}
                      >
                        <div className={styles.forwardAvatar}>
                          {c.isGroup ? (
                            c.groupAvatar ? (
                              <img src={resolveAssetUrl(c.groupAvatar)} alt={c.name} />
                            ) : (
                              <span>{(c.name || 'G').slice(0, 1).toUpperCase()}</span>
                            )
                          ) : c.profilepic ? (
                            <img src={resolveAssetUrl(c.profilepic)} alt={c.fullname} />
                          ) : (
                            <span>{(c.fullname || '?').slice(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                        <div className={styles.forwardMeta}>
                          <div className={styles.forwardName}>
                            {c.isGroup ? c.name : c.fullname}
                          </div>
                          <div className={styles.forwardSub}>
                            {c.isGroup ? 'Group' : `@${c.username}`}
                          </div>
                        </div>
                        {isSelected && (
                          <div className={styles.forwardCheck}>
                            <Check size={16} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedForForward.length > 0 && (
              <div className={styles.modalFooter}>
                <button
                  className={styles.btnPrimary}
                  onClick={forwardToSelected}
                >
                  Forward to {selectedForForward.length} chat{selectedForForward.length > 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm delete selected */}
      {confirmDeleteOpen.open && (
        <div className={styles.modalBackdrop} onClick={() => setConfirmDeleteOpen({ open: false, deleteForEveryone: false })}>
          <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteModalHeader}>
              Delete messages?
            </div>
            <div className={styles.deleteModalBody}>
              <p>
                {selectedIds.size === 1
                  ? 'This message will be removed from your chat history.'
                  : `These ${selectedIds.size} messages will be removed from your chat history.`
                }
                <br />
                This action cannot be undone.
              </p>

              <div className={styles.deleteModalCheckbox}>
                <input
                  type="checkbox"
                  id="deleteForEveryone"
                  checked={confirmDeleteOpen.deleteForEveryone}
                  onChange={(e) => setConfirmDeleteOpen(prev => ({ ...prev, deleteForEveryone: e.target.checked }))}
                />
                <label htmlFor="deleteForEveryone">
                  Also remove for everyone in this chat
                </label>
              </div>
            </div>
            <div className={styles.deleteModalFooter}>
              <button
                className={`${styles.deleteModalBtn} ${styles.deleteModalCancel}`}
                onClick={() => setConfirmDeleteOpen({ open: false, deleteForEveryone: false })}
              >
                Cancel
              </button>
              <button
                className={`${styles.deleteModalBtn} ${styles.deleteModalConfirm}`}
                onClick={() => {
                  const ids = Array.from(selectedIds);
                  if (confirmDeleteOpen.deleteForEveryone) {
                    deleteForEveryone(ids);
                  } else {
                    deleteForMe(ids);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Chat */}
      {showClearChatModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowClearChatModal(false)}>
          <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.deleteModalHeader}>
              Clear chat history?
            </div>
            <div className={styles.deleteModalBody}>
              <p>
                All messages in this chat will be removed for you.
                <br />
                This action cannot be undone.
              </p>
            </div>
            <div className={styles.deleteModalFooter}>
              <button
                className={`${styles.deleteModalBtn} ${styles.deleteModalCancel}`}
                onClick={() => setShowClearChatModal(false)}
              >
                Cancel
              </button>
              <button
                className={`${styles.deleteModalBtn} ${styles.deleteModalConfirm}`}
                onClick={clearEntireChat}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;