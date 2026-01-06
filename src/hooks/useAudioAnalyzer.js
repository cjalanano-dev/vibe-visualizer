import { useRef, useState, useEffect, useCallback } from 'react';

export const useAudioAnalyzer = () => {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.5);

  // Track Info
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const audioContext = useRef(null);
  const analyser = useRef(null);
  const gainNode = useRef(null);
  const dataArray = useRef(null);
  const source = useRef(null);
  const mediaStream = useRef(null);
  const audioEl = useRef(null);

  const audioValues = useRef({ bass: 0, mid: 0, treble: 0, isBeat: false });
  const beatState = useRef({
    instantEnergy: 0,
    localEnergyAverage: 0,
    historyBuffer: [],
  });

  const initAudio = useCallback(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
      analyser.current = audioContext.current.createAnalyser();
      analyser.current.fftSize = 512;
      analyser.current.smoothingTimeConstant = 0.8;

      gainNode.current = audioContext.current.createGain();
      gainNode.current.gain.value = volume;

      const bufferLength = analyser.current.frequencyBinCount;
      dataArray.current = new Uint8Array(bufferLength);

      setIsReady(true);
    }

    if (audioContext.current.state === 'suspended') {
      audioContext.current.resume();
    }
  }, []);

  useEffect(() => {
    if (gainNode.current) {
      gainNode.current.gain.value = volume;
    }
    if (audioEl.current) {
      audioEl.current.volume = volume;
    }
  }, [volume]);

  // Sync Current Time for UI
  useEffect(() => {
    let rafId;
    const updateTime = () => {
      if (audioEl.current && !audioEl.current.paused) {
        setCurrentTime(audioEl.current.currentTime);
        rafId = requestAnimationFrame(updateTime);
      }
    };

    if (isPlaying) {
      updateTime();
    } else {
      cancelAnimationFrame(rafId);
    }
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);


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
      if (audioContext.current.state === 'running') {
        audioContext.current.suspend();
        setIsPlaying(false);
      } else if (audioContext.current.state === 'suspended') {
        audioContext.current.resume();
        setIsPlaying(true);
      }
    }
  };

  const seek = (time) => {
    if (audioEl.current) {
      audioEl.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const disconnectAudio = () => {
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }
    if (audioEl.current) {
      audioEl.current.pause();
      audioEl.current.src = '';
      audioEl.current = null;
    }
    if (source.current) {
      source.current.disconnect();
      source.current = null;
    }
    setIsPlaying(false);
    setIsLoading(false);
    setDuration(0);
    setCurrentTime(0);
  };

  const connectMicrophone = async () => {
    disconnectAudio();
    setIsLoading(true);
    initAudio();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStream.current = stream;

      source.current = audioContext.current.createMediaStreamSource(stream);
      analyser.current.disconnect();
      source.current.connect(gainNode.current);
      gainNode.current.connect(analyser.current);

      setIsPlaying(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      // alert('Microphone access denied or not available.'); // removed alert for better UX
    } finally {
      setIsLoading(false);
    }
  };

  const connectFile = (file) => {
    disconnectAudio();
    setIsLoading(true);
    initAudio();

    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.loop = true; // Loop by default for visualizer
    audio.volume = volume;
    audioEl.current = audio;

    // Metadata loaded
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('canplay', () => {
      setIsPlaying(true);
      setIsLoading(false);
      audio.play();
    }, { once: true });

    source.current = audioContext.current.createMediaElementSource(audio);

    analyser.current.connect(audioContext.current.destination);
    source.current.connect(gainNode.current);
    gainNode.current.connect(analyser.current);
  };

  const getAudioData = () => {
    if (!analyser.current || !dataArray.current) return audioValues.current;

    analyser.current.getByteFrequencyData(dataArray.current);
    const data = dataArray.current;
    const sampleRate = audioContext.current ? audioContext.current.sampleRate : 44100;
    const binCount = analyser.current.frequencyBinCount;
    const nyquist = sampleRate / 2;
    const binSize = nyquist / binCount;

    const bassEnd = Math.min(binCount, Math.round(250 / binSize));
    const midEnd = Math.min(binCount, Math.round(4000 / binSize));

    const getAvg = (start, end) => {
      let sum = 0;
      if (start >= end) return 0;
      for (let i = start; i < end; i++) sum += data[i];
      return sum / (end - start);
    };

    const bass = getAvg(0, bassEnd) / 255.0;
    const mid = getAvg(bassEnd, midEnd) / 255.0;
    const treble = getAvg(midEnd, binCount) / 255.0;

    const instantEnergy = bass;
    const history = beatState.current.historyBuffer;
    history.push(instantEnergy);
    if (history.length > 60) history.shift();

    const localAvg = history.reduce((a, b) => a + b, 0) / history.length;
    const isBeat = instantEnergy > localAvg * 1.5 && instantEnergy > 0.3;

    audioValues.current.bass = bass;
    audioValues.current.mid = mid;
    audioValues.current.treble = treble;
    audioValues.current.isBeat = isBeat;

    return audioValues.current;
  };

  return {
    connectMicrophone,
    connectFile,
    disconnectAudio,
    getAudioData,
    isReady,
    isPlaying,
    isLoading,
    togglePlay,
    volume,
    setVolume,
    duration,
    currentTime,
    seek
  };
};
