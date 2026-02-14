import { useState, useRef, useCallback } from 'react';

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioContextRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isProcessingRef = useRef(false);
  const currentSourceRef = useRef(null);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000
      });
    }
    return audioContextRef.current;
  }, []);

  const playAudio = useCallback(async (base64Audio) => {
    try {
      const audioContext = initAudioContext();

      // Decode base64 to ArrayBuffer
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert Int16 PCM to Float32
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF);
      }

      // Add to queue
      audioQueueRef.current.push(float32Array);

      // Process queue if not already processing
      if (!isProcessingRef.current) {
        processAudioQueue(audioContext);
      }

      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }, [initAudioContext]);

  const processAudioQueue = useCallback(async (audioContext) => {
    isProcessingRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift();

      // Create audio buffer
      const audioBuffer = audioContext.createBuffer(1, audioData.length, 24000);
      audioBuffer.getChannelData(0).set(audioData);

      // Create and play source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      currentSourceRef.current = source;

      // Wait for audio to finish playing
      await new Promise((resolve) => {
        source.onended = resolve;
        source.start(0);
      });
    }

    isProcessingRef.current = false;
    currentSourceRef.current = null;
    setIsPlaying(false);
  }, []);

  const stopAudio = useCallback(() => {
    // Stop current audio
    if (currentSourceRef.current) {
      try {
        currentSourceRef.current.stop();
      } catch (error) {
        // Already stopped
      }
      currentSourceRef.current = null;
    }

    // Clear queue
    audioQueueRef.current = [];
    isProcessingRef.current = false;
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    playAudio,
    stopAudio
  };
}
