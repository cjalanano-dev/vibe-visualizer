import { useState, useEffect } from 'react';
import ThreeCanvas from './components/ThreeCanvas';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import {
  MicIcon,
  FolderIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  VolumeLowIcon,
  VolumeHighIcon,
  SensitivityLowIcon,
  SensitivityHighIcon,
  SkipBackIcon,
  SkipForwardIcon
} from './components/Icons';
import './App.css';

// Formatting helper for time (MM:SS)
const formatTime = (time) => {
  if (!time || isNaN(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

function App() {
  const {
    connectMicrophone,
    connectFile,
    disconnectAudio,
    getAudioData,
    isPlaying,
    isLoading,
    togglePlay,
    volume,
    setVolume,
    duration,
    currentTime,
    seek
  } = useAudioAnalyzer();

  const [mode, setMode] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [trackTitle, setTrackTitle] = useState("Unknown Track");

  // Drag & Drop Handlers
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      setIsDragging(true);
    };
    const handleDragLeave = () => {
      setIsDragging(false);
    };
    const handleDrop = (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('audio/')) {
        setTrackTitle(file.name.replace(/\.[^/.]+$/, "")); // Remove extension
        connectFile(file);
        setMode('file');
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [connectFile]);

  const handleMicClick = async () => {
    await connectMicrophone();
    setMode('mic');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setTrackTitle(file.name.replace(/\.[^/.]+$/, ""));
      connectFile(file);
      setMode('file');
    }
  };

  const handleStop = () => {
    disconnectAudio();
    setMode(null);
  };

  const handleVolumeChange = (e) => {
    setVolume(parseFloat(e.target.value));
  };

  const handleSeek = (e) => {
    seek(parseFloat(e.target.value));
  };

  return (
    <div className={`app-container ${isDragging ? 'dragging' : ''}`}>
      <ThreeCanvas getAudioData={getAudioData} />

      <div className="ui-overlay">
        <header className="header">
          <h1>VIBE</h1>
          <p>Audio Visualizer</p>
        </header>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-state">
            <span className="spinner"></span>
            <p>Loading Audio...</p>
          </div>
        )}

        {/* Start Menu */}
        {!mode && !isLoading && (
          <main className="controls-center fade-in">
            <div className="start-menu">
              <button className="primary-btn" onClick={handleMicClick} aria-label="Use Microphone">
                <MicIcon /> Live Microphone
              </button>

              <div className="file-input-wrapper">
                <button className="primary-btn" aria-label="Upload Audio File">
                  <FolderIcon /> Upload Audio
                </button>
                <input type="file" accept="audio/*" onChange={handleFileChange} aria-hidden="true" />
              </div>
            </div>
            <div className="drag-hint">
              <p>or drag & drop an MP3 here</p>
            </div>
          </main>
        )}

        {/* --- MIC MODE UI (Capsule) --- */}
        {mode === 'mic' && !isLoading && (
          <div className="mic-capsule fade-in">
            <div className="live-indicator">
              <span className="dot"></span> LIVE
            </div>

            <div className="mic-controls">
              <span className="icon-small"><SensitivityLowIcon /></span>
              <input
                type="range"
                className="volume-slider short"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                title="Sensitivity"
              />
              <span className="icon-small"><SensitivityHighIcon /></span>
            </div>

            <div className="divider"></div>

            <button className="circle-btn small stop-btn" onClick={handleStop} title="Stop Mic">
              <StopIcon />
            </button>
          </div>
        )}


        {/* --- FILE MODE UI (Bottom Player Bar) --- */}
        {mode === 'file' && !isLoading && (
          <div className="player-bar fade-in">
            <div className="track-info">
              <p className="track-title">{trackTitle}</p>
              <p className="track-status">{isPlaying ? "Now Playing" : "Paused"}</p>
            </div>

            <div className="player-center">
              <div className="player-controls">
                {/* Skip Back */}
                <button className="circle-btn small" onClick={() => seek(currentTime - 10)} title="-10s">
                  <SkipBackIcon />
                </button>

                <button
                  className="circle-btn large"
                  onClick={togglePlay}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>

                {/* Skip Forward */}
                <button className="circle-btn small" onClick={() => seek(currentTime + 10)} title="+10s">
                  <SkipForwardIcon />
                </button>
              </div>

              <div className="progress-bar-container">
                <span className="time-text">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  className="progress-slider"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                />
                <span className="time-text">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="volume-section">
              <button className="circle-btn small stop-btn-bar" onClick={handleStop} title="Close Player">
                <StopIcon />
              </button>
              <div className="divider-v"></div>
              <span className="icon-small"><VolumeLowIcon /></span>
              <input
                type="range"
                className="volume-slider"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                title="Volume"
              />
              <span className="icon-small"><VolumeHighIcon /></span>
            </div>
          </div>
        )}

        {/* Footer info - Hide when active */}
        {!mode && (
          <footer className="footer">
            <p>Select a source to begin</p>
          </footer>
        )}
      </div>
    </div>
  );
}

export default App;
