// utils/musicTheoryUtils.ts

export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const CHORD_FORMULAS = {
  // Major: R, 3, 5
  'maj': [0, 4, 7],
  '': [0, 4, 7],
  // Minor: R, b3, 5
  'm': [0, 3, 7],
  'min': [0, 3, 7],
  // Dominant 7: R, 3, 5, b7
  '7': [0, 4, 7, 10],
  // Major 7: R, 3, 5, 7
  'maj7': [0, 4, 7, 11],
  // Minor 7: R, b3, 5, b7
  'm7': [0, 3, 7, 10],
  // Diminished: R, b3, b5
  'dim': [0, 3, 6],
  // Augmented: R, 3, #5
  'aug': [0, 4, 8],
  // Suspended 4: R, 4, 5
  'sus4': [0, 5, 7],
  // Suspended 2: R, 2, 5
  'sus2': [0, 2, 7],
};

// Common chord voicings for standard guitar tuning (EADGBe)
// 'x' = mute, number = fret
export const STANDARD_GUITAR_VOICINGS: Record<string, (string | number)[]> = {
  'A': ['x', 0, 2, 2, 2, 0], 'Am': ['x', 0, 2, 2, 1, 0], 'A7': ['x', 0, 2, 0, 2, 0], 'Amaj7': ['x', 0, 2, 1, 2, 0], 'Asus4': ['x', 0, 2, 2, 3, 0],
  'B': ['x', 2, 4, 4, 4, 2], 'Bm': ['x', 2, 4, 4, 3, 2], 'B7': ['x', 2, 1, 2, 0, 2],
  'C': ['x', 3, 2, 0, 1, 0], 'Cmaj7': ['x', 3, 2, 0, 0, 0], 'C7': ['x', 3, 2, 3, 1, 0],
  'D': ['x', 'x', 0, 2, 3, 2], 'Dm': ['x', 'x', 0, 2, 3, 1], 'D7': ['x', 'x', 0, 2, 1, 2], 'Dmaj7': ['x', 'x', 0, 2, 2, 2], 'Dsus4': ['x', 'x', 0, 2, 3, 3],
  'E': [0, 2, 2, 1, 0, 0], 'Em': [0, 2, 2, 0, 0, 0], 'E7': [0, 2, 0, 1, 0, 0],
  'F': [1, 3, 3, 2, 1, 1], 'Fm': [1, 3, 3, 1, 1, 1], 'Fmaj7': ['x', 'x', 3, 2, 1, 0],
  'G': [3, 2, 0, 0, 0, 3], 'G7': [3, 2, 0, 0, 0, 1], 'Gmaj7': [3, 'x', 0, 0, 0, 2],
  'F#': [2, 4, 4, 3, 2, 2], 'F#m': [2, 4, 4, 2, 2, 2],
  'C#m': ['x', 4, 6, 6, 5, 4],
  'G#': [4, 6, 6, 5, 4, 4], 'G#m': [4, 6, 6, 4, 4, 4],
  'D#': ['x', 6, 8, 8, 8, 6], 'D#m': ['x', 6, 8, 8, 7, 6],
  'A#': [6, 8, 8, 7, 6, 6], 'A#m': [6, 8, 8, 6, 6, 6],
};

const SCALE_FORMULAS = {
  'major': [0, 2, 4, 5, 7, 9, 11],
  'minor': [0, 2, 3, 5, 7, 8, 10],
};


const getNoteIndex = (note) => NOTES.indexOf(note.toUpperCase());

export const parseChord = (chordName) => {
    if (!chordName || typeof chordName !== 'string') return [];
    
    // Find root note
    let rootNote;
    let quality;
    
    if (chordName.length > 1 && (chordName[1] === '#' || chordName[1] === 'b')) {
        rootNote = chordName.substring(0, 2);
        quality = chordName.substring(2);
    } else {
        rootNote = chordName.substring(0, 1);
        quality = chordName.substring(1);
    }

    // Handle flats
    if (rootNote.includes('b')) {
        const noteIndex = getNoteIndex(rootNote[0]);
        rootNote = NOTES[(noteIndex + 11) % 12];
    }
    
    const rootIndex = getNoteIndex(rootNote);
    if (rootIndex === -1) return [];

    const formula = CHORD_FORMULAS[quality] ?? CHORD_FORMULAS['maj']; // Default to major
    if (!formula) return [];

    return formula.map(interval => NOTES[(rootIndex + interval) % 12]);
};

export const getScaleNotes = (key: string): string[] => {
    if (!key || typeof key !== 'string') return [];
    
    const parts = key.split(' ');
    const rootNoteName = parts[0];
    // Default to major if not specified, handle common case variations
    const scaleType = parts.length > 1 ? parts[1].toLowerCase().replace(/major/,'major').replace(/menor/,'minor') : 'major';

    let rootNote = rootNoteName;
    if (rootNote.length > 1 && rootNote.includes('b')) {
         const noteIndex = getNoteIndex(rootNote[0]);
         rootNote = NOTES[(noteIndex + 11) % 12];
    }
    
    const rootIndex = getNoteIndex(rootNote);
    if (rootIndex === -1) return [];

    const formula = SCALE_FORMULAS[scaleType] || SCALE_FORMULAS['major'];
    if (!formula) return [];

    return formula.map(interval => NOTES[(rootIndex + interval) % 12]);
};