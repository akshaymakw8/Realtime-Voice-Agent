import { useState, useRef, useCallback } from 'react';

const TARGET_SAMPLE_RATE = 24000;

export function useAudioRecorder(onAudioData) {
  const [isRecording, setIsRecording] = useState(false);

  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const hasAudioDataRef = useRef(false);
  const onAudioDataRef = useRef(onAudioData);

  // Keep the callback ref current without re-creating startRecording
  onAudioDataRef.current = onAudioData;

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;
      hasAudioDataRef.current = false;

      // Create audio context - use browser's default sample rate
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const actualSampleRate = audioContext.sampleRate;
      console.log(`AudioContext sample rate: ${actualSampleRate}, target: ${TARGET_SAMPLE_RATE}`);

      // Create audio source from stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Use larger buffer for smoother processing
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Resample to target rate if needed
        let pcmData;
        if (actualSampleRate !== TARGET_SAMPLE_RATE) {
          pcmData = resampleAndConvert(inputData, actualSampleRate, TARGET_SAMPLE_RATE);
        } else {
          pcmData = floatTo16BitPCM(inputData);
        }

        // Convert to base64 and send directly via callback
        const base64 = arrayBufferToBase64(pcmData.buffer);
        hasAudioDataRef.current = true;

        if (onAudioDataRef.current) {
          onAudioDataRef.current(base64);
        }
      };

      // Connect nodes
      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      console.log('Started recording');
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please ensure microphone permissions are granted.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    // Clean up audio nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    console.log('Stopped recording');
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    hasAudioData: hasAudioDataRef
  };
}

// Convert Float32 samples to Int16 PCM
function floatTo16BitPCM(float32Array) {
  const int16Data = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Data;
}

// Resample audio from source rate to target rate and convert to Int16 PCM
function resampleAndConvert(float32Array, fromRate, toRate) {
  const ratio = fromRate / toRate;
  const newLength = Math.round(float32Array.length / ratio);
  const int16Data = new Int16Array(newLength);

  for (let i = 0; i < newLength; i++) {
    // Linear interpolation
    const srcIndex = i * ratio;
    const srcFloor = Math.floor(srcIndex);
    const srcCeil = Math.min(srcFloor + 1, float32Array.length - 1);
    const frac = srcIndex - srcFloor;

    const sample = float32Array[srcFloor] * (1 - frac) + float32Array[srcCeil] * frac;
    const s = Math.max(-1, Math.min(1, sample));
    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  return int16Data;
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}
