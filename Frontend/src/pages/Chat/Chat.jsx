import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import ChatSidebar from '../../components/chat/ChatSidebar/ChatSidebar';
import ChatWindow from '../../components/chat/ChatWindow/ChatWindow';
import { userAPI } from '../../services/api';
import toast from 'react-hot-toast';
import styles from './Chat.module.css';

import NewGroupPanel from '../../components/chat/NewGroup/NewGroupPanel';
import StarredPanel from '../../components/chat/Starred/StarredPanel';
import ArchivedPanel from '../../components/chat/Archived/ArchivedPanel';
import SettingsPanel from '../../components/chat/Settings/SettingsPanel';
import BlockedPanel from '../../components/chat/Blocked/BlockedPanel';

const Chat = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [selected, setSelected] = useState(null);
  const [chatters, setChatters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState({});

  const [openNewGroup, setOpenNewGroup] = useState(false);
  const [openStarred, setOpenStarred] = useState(false);
  const [openArchived, setOpenArchived] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [openBlocked, setOpenBlocked] = useState(false);

  useEffect(() => {
    refreshChatters();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = async (message) => {
      const myId = user._id.toString();

      // Group message: increment unread for that group if it's not currently selected
      if (message.isGroup && message.conversationId) {
        const groupId = typeof message.conversationId === 'object' ? message.conversationId._id || message.conversationId : message.conversationId;
        if (!selected || !selected.isGroup || selected._id !== String(groupId)) {
          setUnreadCounts(prev => ({ ...prev, [String(groupId)]: (prev[String(groupId)] || 0) + 1 }));
        }
        // refresh list so group moves to top
        refreshChatters();
        return;
      }

      // 1:1
      const senderId = typeof message.senderId === 'object' ? message.senderId._id : message.senderId;
      const receiverId = typeof message.receiverId === 'object' ? message.receiverId._id : message.receiverId;
      const otherUserId = senderId === myId ? receiverId : senderId;

      if (!selected || selected.isGroup || selected._id !== otherUserId) {
        setUnreadCounts(prev => ({ ...prev, [otherUserId]: (prev[otherUserId] || 0) + 1 }));
      }

      // IMPORTANT: refresh sidebar so brand-new conversations or latest preview appear immediately
      refreshChatters();
    };

    socket.on('new-message', handleNewMessage);
    return () => socket.off('new-message', handleNewMessage);
  }, [socket, selected, user]);

  const refreshChatters = async () => {
    try {
      const response = await userAPI.getCurrentChatters();
      setChatters(response?.data || []);
    } catch {
      if (!loading) toast.error('Failed to load chat list');
      setChatters([]);
    } finally {
      setLoading(false);
    }
  };

  // Update the last message & bump chat to top when I send something
  const handleMessageSent = (userId, messageText) => {
    // Update the last message for this chatter in the sidebar
    setChatters(prev => prev.map(chatter => {
      if ((chatter.isGroup && chatter._id === userId) || (!chatter.isGroup && chatter._id === userId)) {
        return {
          ...chatter,
          lastMessage: messageText.substring(0, 50),
          lastMessageTime: new Date()
        };
      }
      return chatter;
    }));
    // Sort chatters to move this conversation to top
    setChatters(prev => {
      const updatedChatter = prev.find(c => (c.isGroup && c._id === userId) || (!c.isGroup && c._id === userId));
      if (updatedChatter) {
        const filtered = prev.filter(c => !((c.isGroup && c._id === userId) || (!c.isGroup && c._id === userId)));
        return [updatedChatter, ...filtered];
      }
      return prev;
    });
    // Also ensure backend-derived preview stays in sync
    refreshChatters();
  };

  const handleSelect = (item) => {
    setSelected(item);
    setUnreadCounts(prev => ({ ...prev, [item._id]: 0 }));
  };

  const handleCloseChat = () => setSelected(null);

  const addNewChatter = (newUser) => {
    setChatters(prev => {
      if (prev.some(c => !c.isGroup && c._id === newUser._id)) return prev;
      return [{ ...newUser, isGroup: false }, ...prev];
    });
  };

  const onConversationArchived = (conversationId, isGroup, archived) => {
    if (archived) {
      setChatters(prev => prev.filter(c => !(c.isGroup === isGroup && c._id === conversationId)));
      if (selected && selected._id === conversationId) setSelected(null);
    } else {
      refreshChatters();
    }
  };

  const onGroupUpdated = (group) => {
    setChatters(prev => prev.map(c => (c.isGroup && c._id === group._id ? { ...c, name: group.name, groupAvatar: group.groupAvatar } : c)));
    if (selected?.isGroup && selected._id === group._id) {
      setSelected(prev => ({ ...prev, name: group.name, groupAvatar: group.groupAvatar }));
    }
  };

  const addNewGroupToList = (groupConv) => {
    const item = { isGroup: true, _id: groupConv._id, name: groupConv.name, groupAvatar: groupConv.groupAvatar, lastMessage: '', lastMessageTime: groupConv.updatedAt };
    setChatters(prev => [item, ...prev]);
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.backgroundPattern}>
        <div className={styles.patternCircle1}></div>
        <div className={styles.patternCircle2}></div>
        <div className={styles.patternCircle3}></div>
      </div>

      <div className={styles.chatWrapper}>
        <div className={styles.chatInterface}>
          <div className={styles.sidebarContainer}>
            <ChatSidebar
              currentUser={user}
              chatters={chatters}
              selectedUser={selected}
              onUserSelect={handleSelect}
              onNewChatter={addNewChatter}
              loading={loading}
              unreadCounts={unreadCounts}
              onOpenNewGroup={() => setOpenNewGroup(true)}
              onOpenStarred={() => setOpenStarred(true)}
              onOpenArchived={() => setOpenArchived(true)}
              onOpenSettings={() => setOpenSettings(true)}
              onOpenBlocked={() => setOpenBlocked(true)}
            />
          </div>

          <div className={styles.chatWindowContainer}>
            <ChatWindow
              currentUser={user}
              selectedUser={selected}
              onClose={handleCloseChat}
              onConversationArchived={onConversationArchived}
              onGroupUpdated={onGroupUpdated}
              onMessageSent={handleMessageSent}
              onListNeedsRefresh={refreshChatters}   // NEW: let window ask sidebar to refresh after clear/delete
            />
          </div>
        </div>
      </div>

      <NewGroupPanel open={openNewGroup} onClose={() => setOpenNewGroup(false)} onCreate={addNewGroupToList} />
      <StarredPanel open={openStarred} onClose={() => setOpenStarred(false)} />
      <ArchivedPanel open={openArchived} onClose={() => { setOpenArchived(false); refreshChatters(); }} />
      <SettingsPanel open={openSettings} onClose={() => setOpenSettings(false)} user={user} />
      <BlockedPanel open={openBlocked} onClose={() => setOpenBlocked(false)} />
    </div>
  );
};

export default Chat;