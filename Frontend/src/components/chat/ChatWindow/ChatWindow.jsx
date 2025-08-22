import React, { useState, useEffect, useRef } from 'react';
import { messageAPI, conversationAPI, userAPI } from '../../../services/api.js';
import { useSocket } from '../../../contexts/SocketContext.jsx';
import LoadingSpinner from '../../common/LoadingSpinner/LoadingSpinner.jsx';
import GroupSettingsPanel from '../Group/GroupSettingsPanel.jsx';
import MessageInfoDrawer from './MessageInfoDrawer.jsx';
import styles from './ChatWindow.module.css';

// Import our new components
import ChatHeader from './components/ChatHeader/ChatHeader';
import MessageList from './components/MessageList/MessageList';
import InputArea from './components/InputArea/InputArea';
import ReplyBar from './components/ReplyBar/ReplyBar';
import ForwardModal from './components/ForwardModal/ForwardModal';
import DeleteModal from './components/DeleteModal/DeleteModal';
import ClearChatModal from './components/ClearChatModal/ClearChatModal';
import WelcomeState from './components/WelcomeState/WelcomeState';
import AudioRecorder from './components/AudioRecorder/AudioRecorder';

const ChatWindow = ({
  currentUser,
  selectedUser,
  onClose,
  onConversationArchived,
  onGroupUpdated,
  onMessageSent,
  onListNeedsRefresh, // ask parent (sidebar) to refresh list (lastMessage/ordering) after mutations
}) => {
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
  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardForMessage, setForwardForMessage] = useState(null);
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardList, setForwardList] = useState([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwardSearch, setForwardSearch] = useState('');
  const [selectedForForward, setSelectedForForward] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState({
    open: false,
    deleteForEveryone: false
  });
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [recordStartAt, setRecordStartAt] = useState(null);
  const [recordSecs, setRecordSecs] = useState(0);
  const recordTimerRef = useRef(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [lastVisitAt, setLastVisitAt] = useState(0);
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

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

  // Persist last-visit per chat
  const visitKey = React.useMemo(
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
      const { scrollTop, clientHeight, scrollHeight } = container;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowScrollButton(!isNearBottom);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Socket: receive messages and deletions; mark delivered/seen via API and emit status updates
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = async (message) => {
      const myId = currentUser._id.toString();
      const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
      const isMine = String(senderId) === myId;

      // Immediately record delivered for messages I receive and notify via socket for tick updates
      if (!isMine) {
        try {
          await messageAPI.markDelivered(message._id);
          socket.emit('message-delivered', { messageId: message._id });
        } catch { }
      }

      const isGroupMsg = !!message.isGroup;
      const receiverId = typeof message.receiverId === 'object' ? message.receiverId?._id : message.receiverId;

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
            socket.emit('message-seen', { messageId: message._id });
          } catch { }
        }
        // Keep sidebar preview fresh
        onListNeedsRefresh?.();
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
              socket.emit('message-seen', { messageId: message._id });
            } catch { }
          }
          // Ensure sidebar preview reflects latest message
          onListNeedsRefresh?.();
        }
      }
    };

    const handleDeletedForEveryone = ({ messageId }) => {
      // Do NOT remove message; mark it as deleted so placeholder appears
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isDeletedForEveryone: true } : m))
      );
      // Sidebar preview may change (previous message becomes last)
      onListNeedsRefresh?.();
    };

    const handleStatusUpdate = ({ messageId, status }) => {
      setMessages(prev => prev.map(m => (m._id === messageId ? { ...m, status } : m)));
    };

    socket.on('new-message', handleNewMessage);
    socket.on('message-deleted-everyone', handleDeletedForEveryone);
    socket.on('message-status-update', handleStatusUpdate);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('message-deleted-everyone', handleDeletedForEveryone);
      socket.off('message-status-update', handleStatusUpdate);
    };
  }, [socket, selectedUser, currentUser, onListNeedsRefresh]);

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
        socket?.emit('message-seen', { messageId: id });
      } catch { }
    }
  };

  const handleTextareaChange = (text) => {
    setNewMessage(text);

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
      setShowClearChatModal(false);
      // Sidebar needs to re-evaluate last message after clear
      onListNeedsRefresh?.();
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedUser || selectedUser.isGroup) return;
    try {
      setLoading(true);
      const response = await messageAPI.getMessages(selectedUser._id);
      setMessages(response.data || []);
      await markAllSeen(response.data || []);
    } catch (error) {
      console.error(error);
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
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openForwardModal = (message = null) => {
    if (!message && selectedIds.size === 0) return;

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
      const messageIds = forwardForMessage ?
        [forwardForMessage._id] :
        Array.from(selectedIds);

      await messageAPI.forwardMessages(messageIds, receiverIds);
      setForwardOpen(false);
      setForwardForMessage(null);
      setSelectedForForward([]);
      if (selectionMode) clearSelection();
      // Sidebar may need to update previews for receivers; we refresh my list anyway
      onListNeedsRefresh?.();
    } catch (error) {
      console.error(error);
    }
  };

  const sendMessage = async () => {
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
        // Pull fresh server-computed preview too
        onListNeedsRefresh?.();
      }

      setReplyingTo(null);

      // Stop typing indicator when message is sent
      stopTyping(selectedUser._id);
    } catch (err) {
      setNewMessage(text);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const onFileSelected = async (file) => {
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
        onListNeedsRefresh?.();
      }

      setReplyingTo(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      inputRef.current?.focus();
    }
  };

  const deleteForMe = async (ids) => {
    try {
      const arr = Array.isArray(ids) ? ids : [ids];
      await messageAPI.deleteForMe(arr);
      setMessages((prev) => prev.filter((m) => !arr.includes(m._id)));
      setConfirmDeleteOpen({ open: false, deleteForEveryone: false });
      clearSelection();
      // Refresh sidebar last-message preview
      onListNeedsRefresh?.();
    } catch (error) {
      console.error(error);
    }
  };

  const deleteForEveryone = async (ids) => {
    try {
      const arr = Array.isArray(ids) ? ids : [ids];
      const response = await messageAPI.deleteForEveryone(arr);

      if (response && response.success) {
        // Do not remove messages; mark them as deleted
        setMessages((prev) =>
          prev.map((m) => (arr.includes(m._id) ? { ...m, isDeletedForEveryone: true } : m))
        );
        setConfirmDeleteOpen({ open: false, deleteForEveryone: false });
        clearSelection();
        // Update sidebar preview as last message may change
        onListNeedsRefresh?.();
      }
    } catch (error) {
      console.error(error);
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
      } else {
        await messageAPI.star(message._id);
        setMessages(prev => prev.map(m =>
          m._id === message._id
            ? { ...m, starredBy: [...(m.starredBy || []), currentUser._id] }
            : m
        ));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleArchive = async () => {
    try {
      if (selectedUser.isGroup) {
        if (!archived) {
          await conversationAPI.archive(selectedUser._id);
          setArchived(true);
          onConversationArchived?.(selectedUser._id, true, true);
        } else {
          await conversationAPI.unarchive(selectedUser._id);
          setArchived(false);
          onConversationArchived?.(selectedUser._id, true, false);
        }
      } else {
        if (!oneToOneConvId) return;
        
        if (!archived) {
          await conversationAPI.archive(oneToOneConvId);
          setArchived(true);
          onConversationArchived?.(selectedUser._id, false, true);
        } else {
          await conversationAPI.unarchive(oneToOneConvId);
          setArchived(false);
          onConversationArchived?.(selectedUser._id, false, false);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleBlock = async () => {
    try {
      if (selectedUser.isGroup) return;
      
      if (!blocked) {
        await userAPI.block(selectedUser._id);
        setBlocked(true);
      } else {
        await userAPI.unblock(selectedUser._id);
        setBlocked(false);
      }
    } catch (error) {
      console.error(error);
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
            onListNeedsRefresh?.();
          }

          setReplyingTo(null);
        } catch (err) {
          console.error(err);
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
      console.error(err);
      setIsRecordingActive(false);
    }
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

  const cancelRecording = () => {
    setIsRecordingActive(false);
    setRecording(false);

    // Stop recording without sending
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
      recorder.stream?.getTracks().forEach(track => track.stop());
    }

    clearInterval(recordTimerRef.current);
    setRecordSecs(0);
    setRecorder(null);
  };

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      });
    }
  };

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

  // Unread divider should be for receiver side only (not for my own messages)
  const firstUnreadId = React.useMemo(() => {
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

  if (!selectedUser) {
    return <WelcomeState />;
  }

  return (
    <div className={styles.chatWindow}>
      <ChatHeader 
        selectedUser={selectedUser}
        isUserOnline={isUserOnline}
        isOtherUserTyping={isOtherUserTyping}
        archived={archived}
        blocked={blocked}
        onClose={onClose}
        onArchive={toggleArchive}
        onBlock={toggleBlock}
        onClearChat={() => setShowClearChatModal(true)}
        onEditGroup={() => setGroupEditOpen(true)}
        selectionMode={selectionMode}
        selectedCount={selectedIds.size}
        onCancelSelection={clearSelection}
        onDeleteSelected={() => setConfirmDeleteOpen({ open: true, deleteForEveryone: false })}
        onForwardSelected={openForwardModal}
      />

      <MessageList
        messages={messages}
        loading={loading}
        currentUser={currentUser}
        selectedUser={selectedUser}
        firstUnreadId={firstUnreadId}
        unreadCount={unreadCount}
        messagesContainerRef={messagesContainerRef}
        messagesEndRef={messagesEndRef}
        showScrollButton={showScrollButton}
        scrollToBottom={scrollToBottom}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        toggleSelect={toggleSelect}
        beginSelectionWith={beginSelectionWith}
        showActionsFor={showActionsFor}
        setShowActionsFor={setShowActionsFor}
        setInfoForMessage={setInfoForMessage}
        toggleStarMessage={toggleStarMessage}
        setReplyingTo={setReplyingTo}
        openForwardModal={openForwardModal}
      />

      {replyingTo && (
        <ReplyBar 
          replyingTo={replyingTo} 
          onCancel={() => setReplyingTo(null)} 
        />
      )}

      {isRecordingActive ? (
        <AudioRecorder 
          recording={recording}
          recordSecs={recordSecs}
          stopRecording={stopRecording}
          cancelRecording={cancelRecording}
        />
      ) : (
        <InputArea
          newMessage={newMessage}
          sending={sending}
          isUploading={isUploading}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          inputRef={inputRef}
          onChange={handleTextareaChange}
          onSend={sendMessage}
          onFileSelected={onFileSelected}
          onStartRecording={startRecording}
        />
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

      {/* Modals */}
      {forwardOpen && (
        <ForwardModal
          forwardList={forwardList}
          forwardSearch={forwardSearch}
          setForwardSearch={setForwardSearch}
          forwardLoading={forwardLoading}
          selectedForForward={selectedForForward}
          toggleForwardSelection={toggleForwardSelection}
          forwardToSelected={forwardToSelected}
          onClose={() => setForwardOpen(false)}
        />
      )}

      {confirmDeleteOpen.open && (
        <DeleteModal 
          count={selectedIds.size}
          deleteForEveryone={confirmDeleteOpen.deleteForEveryone}
          onToggleDeleteForEveryone={() => 
            setConfirmDeleteOpen(prev => ({...prev, deleteForEveryone: !prev.deleteForEveryone}))}
          onDelete={() => {
            const ids = Array.from(selectedIds);
            if (confirmDeleteOpen.deleteForEveryone) {
              deleteForEveryone(ids);
            } else {
              deleteForMe(ids);
            }
          }}
          onCancel={() => setConfirmDeleteOpen({ open: false, deleteForEveryone: false })}
        />
      )}

      {showClearChatModal && (
        <ClearChatModal
          onConfirm={clearEntireChat}
          onCancel={() => setShowClearChatModal(false)}
        />
      )}
    </div>
  );
};

export default ChatWindow;