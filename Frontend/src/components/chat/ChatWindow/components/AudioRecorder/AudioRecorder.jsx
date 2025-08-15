import React from 'react';
import { X, Send } from 'lucide-react';
import styles from './AudioRecorder.module.css';

const AudioRecorder = ({ recording, recordSecs, stopRecording, cancelRecording }) => {
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
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
            onClick={cancelRecording}
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
  );
};

export default AudioRecorder;