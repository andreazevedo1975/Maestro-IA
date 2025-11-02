import React from 'react';
import { STANDARD_GUITAR_VOICINGS } from '../utils/musicTheoryUtils.js';

// FIX: Define props with an interface for better readability and to avoid potential issues with type checking special React props like 'key'.
interface ChordDiagramProps {
    chordName: string;
    tuning: string[];
}

// FIX: Explicitly type the component with React.FC to ensure React-specific props like 'key' are handled correctly by TypeScript's JSX type checking.
export const ChordDiagram: React.FC<ChordDiagramProps> = ({ chordName, tuning }) => {
    const isGuitar = tuning.length === 6;
    const isBass = tuning.length === 4;

    let voicing: (string | number)[] | undefined;
    const ALL_NOTES = ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#'];
    
    // Create a version of the tuning without octaves for comparison
    const tuningNotesOnly = tuning.map(note => note.replace(/\d/g, ''));
    
    if (isGuitar && JSON.stringify(tuningNotesOnly) === JSON.stringify(['E', 'A', 'D', 'G', 'B', 'E'])) {
        voicing = STANDARD_GUITAR_VOICINGS[chordName];
    } else if (isBass) {
        // Simple logic for bass: find the root note on the lowest possible fret
        const rootNoteMatch = chordName.match(/^([A-G][#b]?)/);
        if (rootNoteMatch) {
            let rootNote = rootNoteMatch[0];
             if (rootNote.includes('b')) {
                const noteIndex = ALL_NOTES.indexOf(rootNote[0]);
                rootNote = ALL_NOTES[(noteIndex + 11) % 12];
            }

            let found = false;
            const bassVoicing: (string | number)[] = ['x', 'x', 'x', 'x'];
            for (let s = 0; s < tuningNotesOnly.length; s++) {
                const openNote = tuningNotesOnly[s];
                const openNoteIndex = ALL_NOTES.indexOf(openNote);
                for (let f = 0; f < 12; f++) { // Check up to 12th fret for bass
                    const currentNote = ALL_NOTES[(openNoteIndex + f) % 12];
                    if (currentNote === rootNote) {
                        bassVoicing[s] = f;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
             voicing = bassVoicing;
        }
    }
    
    if (!voicing) {
        return null; // Don't render a diagram if voicing is unknown
    }

    const FRET_COUNT = 5;
    const stringCount = tuning.length;

    // Find min and max frets to display fret numbers correctly for barre chords
    const fretsInVoicing = voicing.map(f => Number(f)).filter(f => f > 0);
    const minFret = fretsInVoicing.length > 0 ? Math.min(...fretsInVoicing) : 0;
    const baseFret = minFret > 1 ? minFret : 1;


    return (
        <div className="flex-shrink-0">
            <p className="text-center font-bold text-sm text-gray-900 dark:text-white mb-1">{chordName}</p>
            <div className="flex items-start gap-1">
                { baseFret > 1 && <div className="text-xs text-gray-500 dark:text-gray-400 pt-1 pr-1 font-mono">{baseFret}fr</div> }
                <div className="relative bg-gray-300/50 dark:bg-gray-700/50 rounded-sm" style={{ width: `${stringCount * 12}px`, height: '70px' }}>
                    {/* Frets */}
                    {Array.from({ length: FRET_COUNT + 1 }).map((_, i) => (
                        <div key={`fret-${i}`} className="absolute left-0 w-full border-b border-gray-400 dark:border-gray-500" style={{ top: `${(i / FRET_COUNT) * 100}%` }}></div>
                    ))}
                    {/* Strings */}
                    {Array.from({ length: stringCount }).map((_, i) => (
                         <div key={`string-${i}`} className="absolute top-0 h-full border-r border-gray-400 dark:border-gray-500" style={{ left: `${(i / (stringCount - 1)) * 100}%` }}></div>
                    ))}
                    {/* Voicing */}
                    {voicing.map((fret, stringIndex) => {
                        if (fret === 'x' || fret === undefined) return (
                             <div key={`dot-${stringIndex}`} className="absolute -translate-x-1/2 text-gray-500 font-bold text-xs" style={{ top: '-12px', left: `${(stringIndex / (stringCount - 1)) * 100}%` }}>x</div>
                        );

                        if (fret === 0) { // Open string
                            return <div key={`dot-${stringIndex}`} className="absolute -translate-x-1/2 w-2 h-2 border-2 border-cyan-600 dark:border-cyan-400 rounded-full" style={{ top: '-10px', left: `${(stringIndex / (stringCount - 1)) * 100}%` }}></div>
                        }
                        
                        const fretPos = baseFret > 1 ? Number(fret) - baseFret + 1 : Number(fret);

                        // Barre chord indicator
                        if (baseFret > 1 && Number(fret) === baseFret && voicing.indexOf(fret) === stringIndex) {
                             const firstString = voicing.indexOf(baseFret);
                             const lastString = voicing.lastIndexOf(baseFret);
                             const width = (lastString - firstString) / (stringCount - 1) * 100;
                             return (
                                 <div key={`barre-${stringIndex}`} className="absolute -translate-y-1/2 h-3 bg-cyan-600 dark:bg-cyan-400 rounded-full" style={{ 
                                    top: `${((fretPos - 0.5) / FRET_COUNT) * 100}%`, 
                                    left: `${(firstString / (stringCount - 1)) * 100}%`,
                                    width: `${width}%`
                                }}></div>
                             )
                        }
                        
                        // Normal fretted note
                        if (Number(fret) >= baseFret){
                             return (
                                <div key={`dot-${stringIndex}`} className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-600 dark:bg-cyan-400 rounded-full" style={{ 
                                    top: `${((fretPos - 0.5) / FRET_COUNT) * 100}%`, 
                                    left: `${(stringIndex / (stringCount - 1)) * 100}%` 
                                }}></div>
                            )
                        }
                        return null;
                    })}
                </div>
            </div>
        </div>
    );
};