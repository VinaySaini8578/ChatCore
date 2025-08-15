import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import styles from './AudioPlayer.module.css';

const AudioPlayer = ({ 
  audioUrl,
  isOwnMessage = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  
  // Format time in mm:ss
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Update progress bar and current time
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateTime = () => setCurrentTime(audio.currentTime);
    const loadMetadata = () => setAudioDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', loadMetadata);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', loadMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);
  
  // Handle seeking
  const handleSeek = (e) => {
    if (!audioRef.current || !progressRef.current) return;
    
    const progressRect = progressRef.current.getBoundingClientRect();
    const seekPosition = (e.clientX - progressRect.left) / progressRect.width;
    const seekTime = seekPosition * audioDuration;
    
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  return (
    <div className={`${styles.audioPlayer} ${isOwnMessage ? styles.own : ''}`}>
      <button 
        onClick={togglePlay}
        className={styles.playButton}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>
      
      <div className={styles.playerContent}>
        <div className={styles.playerProgress}>
          <div 
            className={styles.progressBar}
            ref={progressRef}
            onClick={handleSeek}
          >
            <div 
              className={styles.progressFill} 
              style={{ width: `${audioDuration ? (currentTime / audioDuration) * 100 : 0}%` }}
            />
          </div>
          <span className={styles.duration}>
            {formatTime(currentTime)}
          </span>
        </div>
      </div>
      
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
    </div>
  );
};

export default AudioPlayer;