// utils/audioUtils.ts

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodePcmAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

/**
 * Encodes raw 16-bit PCM audio data into a WAV file Blob.
 * @param samples The raw audio data as signed 16-bit integers.
 * @param sampleRate The sample rate of the audio (e.g., 24000).
 * @param numChannels The number of audio channels (e.g., 1 for mono).
 * @returns A Blob containing the WAV file data.
 */
export function encodeWav(samples: Int16Array, sampleRate: number, numChannels: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const bitsPerSample = 16;
    const blockAlign = numChannels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* chunk size */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (1 for PCM) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate */
    view.setUint32(28, byteRate, true);
    /* block align */
    view.setUint16(32, blockAlign, true);
    /* bits per sample */
    view.setUint16(34, bitsPerSample, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    // Write the PCM data
    for (let i = 0; i < samples.length; i++) {
        view.setInt16(44 + i * 2, samples[i], true);
    }

    return new Blob([view], { type: 'audio/wav' });
}


const A4 = 440.0;
const A4_INDEX = 57; 
const NOTES_MAP: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

const getNoteFrequency = (note: string): number => {
    const noteNameMatch = note.match(/([A-G][#b]?)/);
    if (!noteNameMatch) return 0;
    const noteName = noteNameMatch[0];
    
    const octaveMatch = note.match(/\d/);
    const noteOctave = octaveMatch ? parseInt(octaveMatch[0], 10) : 4; // Default to octave 4 if not specified
    
    const keyNumber = NOTES_MAP[noteName] + (noteOctave + 1) * 12;
    const halfStepsFromA4 = keyNumber - A4_INDEX;
    return A4 * Math.pow(2, halfStepsFromA4 / 12);
};

export function playChord(notes: string[], audioContext: AudioContext, duration = 0.6) {
    if (!audioContext || notes.length === 0) return;
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(1.0 / notes.length, audioContext.currentTime);
    masterGain.connect(audioContext.destination);

    notes.forEach(note => {
        // Use a default octave for chord playing, as it's just for quick reference
        const freq = getNoteFrequency(note);
        
        const oscillator = audioContext.createOscillator();
        oscillator.type = 'triangle'; 
        oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
        
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(masterGain);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    });
}

// FIX: Added optional 'time' parameter to allow scheduling the click sound.
export function playMetronomeClick(audioContext: AudioContext, time?: number) {
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    const scheduleTime = time ?? audioContext.currentTime;

    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, scheduleTime); // A5, a clear click sound

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(1, scheduleTime);
    // Sharp decay for a "tick" sound
    gainNode.gain.exponentialRampToValueAtTime(0.0001, scheduleTime + 0.05);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(scheduleTime);
    oscillator.stop(scheduleTime + 0.05);
}

let activeNoteSource: OscillatorNode | null = null;

export function playNote(note: string, audioContext: AudioContext, duration: number = 3) {
    if (!audioContext) return;
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    stopNote();

    const freq = getNoteFrequency(note);
    if (freq === 0) return;

    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + duration - 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);

    activeNoteSource = oscillator;
    
    oscillator.onended = () => {
        if (activeNoteSource === oscillator) {
            activeNoteSource = null;
        }
    };
}

export function stopNote() {
    if (activeNoteSource) {
        try {
            activeNoteSource.stop();
        } catch (e) { /* Ignore if already stopped */ }
        activeNoteSource = null;
    }
}