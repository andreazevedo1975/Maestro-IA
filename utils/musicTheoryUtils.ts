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