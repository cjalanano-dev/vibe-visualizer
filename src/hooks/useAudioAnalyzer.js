import { useRef, useState, useEffect, useCallback } from 'react';

export const useAudioAnalyzer = () => {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const audioContext = useRef(null);
  const analyser = useRef(null);
  const gainNode = useRef(null);
  const dataArray = useRef(null);
  const source = useRef(null);
  const mediaStream = useRef(null); // For Mic
  const audioEl = useRef(null); // For File (Streaming)

  const initAudio = useCallback(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 512;
      analyser.current.smoothingTimeConstant = 0.8; // Smooth out the jitter

      gainNode.current = audioContext.current.createGain();
      gainNode.current.gain.value = volume;

      // Note: We don't connect gain->analyser here globally anymore 
      // because connection topology differs for Mic vs File

      const bufferLength = analyser.current.frequencyBinCount;
      dataArray.current = new Uint8Array(bufferLength);

      setIsReady(true);
    }

    if (audioContext.current.state === 'suspended') {
      audioContext.current.resume();
    }
  }, []);

  // Update gain when volume state changes
  useEffect(() => {
    if (gainNode.current) {
      gainNode.current.gain.value = volume;
    }
    if (audioEl.current) {
      audioEl.current.volume = volume; // Direct volume control for element
    }
  }, [volume]);

  const togglePlay = () => {
    if (audioEl.current) {
      if (audioEl.current.paused) {
        audioEl.current.play();
        setIsPlaying(true);
      } else {
        audioEl.current.pause();
        setIsPlaying(false);
      }
    } else if (audioContext.current) {
      // Fallback for Mic or non-element sources (mostly resume/suspend context)
      if (audioContext.current.state === 'running') {
        audioContext.current.suspend();
        setIsPlaying(false);
      } else if (audioContext.current.state === 'suspended') {
        audioContext.current.resume();
        setIsPlaying(true);
      }
    }
  };

  const disconnectAudio = () => {
    // Clean up Mic
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }

    // Clean up File (Audio Element)
    if (audioEl.current) {
      audioEl.current.pause();
      audioEl.current.src = '';
      audioEl.current = null;
    }

    // Clean up Source Nodes
    if (source.current) {
      source.current.disconnect();
      source.current = null;
    }

    setIsPlaying(false);
  };

  const connectMicrophone = async () => {
    disconnectAudio();
    initAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStream.current = stream;

      source.current = audioContext.current.createMediaStreamSource(stream);

      // Mic -> Gain -> Analyser (Do NOT connect to destination to avoid feedback)
      analyser.current.disconnect();
      source.current.connect(gainNode.current);
      gainNode.current.connect(analyser.current);

      setIsPlaying(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access denied or not available.');
    }
  };

  const connectFile = (file) => {
    disconnectAudio();
    initAudio();

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = volume;
    audioEl.current = audio;

    // Create Source from the DOM Element
    source.current = audioContext.current.createMediaElementSource(audio);

    // File -> Gain -> Analyser -> Destination
    analyser.current.connect(audioContext.current.destination);
    source.current.connect(gainNode.current);
    gainNode.current.connect(analyser.current);

    audio.play();
    setIsPlaying(true);
  };

  const getAudioData = () => {
    if (!analyser.current || !dataArray.current) return { bass: 0, mid: 0, treble: 0 };

    analyser.current.getByteFrequencyData(dataArray.current);
    const data = dataArray.current;

    const getAvg = (start, end) => {
      let sum = 0;
      for (let i = start; i < end; i++) sum += data[i];
      return sum / (end - start);
    };

    const bass = getAvg(0, 4) / 255.0;
    const mid = getAvg(4, 30) / 255.0;
    const treble = getAvg(30, 100) / 255.0;

    return { bass, mid, treble };
  };

  return {
    connectMicrophone,
    connectFile,
    disconnectAudio,
    getAudioData,
    isReady,
    isPlaying,
    togglePlay,
    volume,
    setVolume
  };
};
