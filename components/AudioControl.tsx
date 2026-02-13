
import React, { useState, useRef, useEffect } from 'react';
// Import from the correct utility files to fix "missing exported member" errors
import { decodeAudioData } from '../services/audio';
import { createWavBlob } from '../utils/audioUtils';

interface AudioControlProps {
  pcmData: Uint8Array;
}

const AudioControl: React.FC<AudioControlProps> = ({ pcmData }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const bufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    const initAudio = async () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      // Use decodeAudioData from services/audio with standard sampleRate (24000) and channel count (1)
      const buffer = await decodeAudioData(pcmData, audioCtxRef.current, 24000, 1);
      bufferRef.current = buffer;
      setDuration(buffer.duration);
    };

    initAudio();

    return () => {
      stopPlayback();
    };
  }, [pcmData]);

  const togglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    if (!audioCtxRef.current || !bufferRef.current) return;

    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }

    const source = audioCtxRef.current.createBufferSource();
    source.buffer = bufferRef.current;
    source.connect(audioCtxRef.current.destination);
    
    const offset = pausedTimeRef.current % bufferRef.current.duration;
    source.start(0, offset);
    startTimeRef.current = audioCtxRef.current.currentTime - offset;
    sourceNodeRef.current = source;
    setIsPlaying(true);

    source.onended = () => {
      if (Math.abs(audioCtxRef.current!.currentTime - startTimeRef.current - bufferRef.current!.duration) < 0.1) {
        setIsPlaying(false);
        pausedTimeRef.current = 0;
        setCurrentTime(0);
      }
    };
  };

  const pausePlayback = () => {
    if (sourceNodeRef.current && audioCtxRef.current) {
      pausedTimeRef.current = audioCtxRef.current.currentTime - startTimeRef.current;
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
      setIsPlaying(false);
    }
  };

  const stopPlayback = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    pausedTimeRef.current = 0;
    setCurrentTime(0);
  };

  useEffect(() => {
    let interval: number;
    if (isPlaying && audioCtxRef.current) {
      interval = window.setInterval(() => {
        const time = audioCtxRef.current!.currentTime - startTimeRef.current;
        setCurrentTime(Math.min(time, duration));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, duration]);

  const handleDownload = () => {
    // Use createWavBlob from utils/audioUtils and convert the incoming Uint8Array bytes to Int16Array
    const wavBlob = createWavBlob(new Int16Array(pcmData.buffer), 24000);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'youtube-voiceover.wav';
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 border border-red-500/20 shadow-2xl shadow-red-500/5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <i className="fa-solid fa-volume-high text-red-500"></i>
          Audio Voiceover
        </h3>
        <button 
          onClick={handleDownload}
          className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors flex items-center gap-2"
        >
          <i className="fa-solid fa-download"></i>
          Download WAV
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-red-600/20"
        >
          {isPlaying ? (
            <i className="fa-solid fa-pause text-xl"></i>
          ) : (
            <i className="fa-solid fa-play text-xl ml-1"></i>
          )}
        </button>

        <div className="flex-1">
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden relative">
            <div 
              className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-100 ease-linear"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] mt-1 text-white/50 uppercase tracking-widest font-semibold">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioControl;
