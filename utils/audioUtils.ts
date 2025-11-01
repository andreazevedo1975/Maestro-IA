
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


const A4 = 440.0;
const A4_INDEX = 57; 
const NOTES_MAP: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
    'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
};

const getNoteFrequency = (note: string, octave = 4): number => {
    const noteNameMatch = note.match(/([A-G][#b]?)/);
    if (!noteNameMatch) return 0;
    const noteName = noteNameMatch[0];
    
    const octaveMatch = note.match(/\d/);
    const noteOctave = octaveMatch ? parseInt(octaveMatch[0], 10) : NaN;
    
    const baseOctave = isNaN(noteOctave) ? octave : noteOctave;
    const keyNumber = NOTES_MAP[noteName] + (baseOctave + 1) * 12;
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
        const freq = getNoteFrequency(note, note.startsWith('G') || note.startsWith('A') || note.startsWith('B') ? 3 : 4);
        
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
