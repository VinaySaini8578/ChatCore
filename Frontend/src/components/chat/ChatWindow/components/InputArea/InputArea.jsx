import React, { useState, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import { Send, Smile, Paperclip, Mic } from 'lucide-react';
import LoadingSpinner from '../../../../common/LoadingSpinner/LoadingSpinner';
import styles from './InputArea.module.css';

const InputArea = ({
  newMessage,
  sending,
  isUploading,
  showEmojiPicker,
  setShowEmojiPicker,
  inputRef,
  onChange,
  onSend,
  onFileSelected,
  onStartRecording
}) => {
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const imgInputRef = useRef(null);
  const docInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const attachMenuRef = useRef(null);

  const handleTextareaChange = (e) => {
    const text = e.target.value;
    onChange(text);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleEmojiClick = (emoji) => {
    onChange(newMessage + (emoji.emoji || ''));
    inputRef.current?.focus();
  };

  const handleImageSelect = () => {
    imgInputRef.current?.click();
  };

  const handleDocumentSelect = () => {
    docInputRef.current?.click();
  };

  const handleFileInputChange = (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelected(file);
      e.target.value = '';
      setShowAttachMenu(false);
    }
  };

  return (
    <div className={styles.inputContainer}>
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className={styles.emojiPickerContainer}>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
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

        {/* Attach menu */}
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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span>Photo</span>
              </button>
              <button
                type="button"
                className={styles.attachOption}
                onClick={handleDocumentSelect}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                <span>Document</span>
              </button>
            </div>
          )}
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={(e) => handleFileInputChange(e, 'image')}
          />
          <input
            ref={docInputRef}
            type="file"
            accept="application/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            hidden
            onChange={(e) => handleFileInputChange(e, 'document')}
          />
        </div>

        <button
          className={styles.inputButton}
          title="Record voice message"
          onClick={onStartRecording}
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
                onSend();
              }
            }}
            className={styles.textInput}
            placeholder="Type a message..."
            rows={1}
            disabled={sending}
          />
        </div>

        <button
          onClick={onSend}
          disabled={sending || !newMessage.trim()}
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
  );
};

export default InputArea;