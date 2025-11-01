
// components/VirtualFretboard.js
import React, { useState, useEffect } from 'react';
import { parseChord } from '../utils/musicTheoryUtils.js';
import type { InstrumentStem } from '../types.js';

const FRET_COUNT = 5;
const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const TUNINGS = {
    guitar: {
        'Padrão (EADGBe)': ['E', 'A', 'D', 'G', 'B', 'E'],
        'Drop D (DADGBe)': ['D', 'A', 'D', 'G', 'B', 'E'],
        'Open G (DGDGBd)': ['D', 'G', 'D', 'G', 'B', 'D'],
    },
    bass: {
        'Padrão (EADG)': ['E', 'A', 'D', 'G'],
        'Drop D (DADG)': ['D', 'A', 'D', 'G'],
    }
};

const getInstrumentType = (instrumentName: string | undefined): 'guitar' | 'bass' => {
    if (!instrumentName) return 'guitar';
    const lowerName = instrumentName.toLowerCase();
    if (lowerName.includes('bass') || lowerName.includes('baixo')) {
        return 'bass';
    }
    return 'guitar'; // Default to guitar
};

export const VirtualFretboard = ({ chordName, instrument }: { chordName: string | null, instrument: InstrumentStem | null }) => {
    const instrumentType = getInstrumentType(instrument?.instrument);
    const availableTunings = TUNINGS[instrumentType];
    const defaultTuningName = Object.keys(availableTunings)[0];

    const [tuningName, setTuningName] = useState(defaultTuningName);
    
    // Reset tuning when instrument changes
    useEffect(() => {
        const newDefaultTuning = Object.keys(TUNINGS[instrumentType])[0];
        setTuningName(newDefaultTuning);
    }, [instrumentType]);

    // FIX: `availableTunings` is a union type of objects with different keys. Indexing it directly
    // causes TypeScript to infer the result as `never`. By casting it to a generic Record,
    // we can correctly access the property, as our logic ensures `tuningName` is a valid key.
    const openStrings = (availableTunings as Record<string, string[]>)[tuningName];
    const stringCount = openStrings.length;

    const getNoteOnString = (stringIndex: number, fret: number) => {
        const openNote = openStrings[stringIndex].toUpperCase(); // Handle cases like 'd' in Open G
        const openNoteIndex = ALL_NOTES.indexOf(openNote);
        if (openNoteIndex === -1) return '?';
        const noteIndex = (openNoteIndex + fret) % 12;
        return ALL_NOTES[noteIndex];
    };

    const chordNotes = chordName ? parseChord(chordName) : [];
    const rootNote = chordNotes[0] || null;

    const renderFrets = () => {
        return Array.from({ length: FRET_COUNT + 1 }).map((_, i) => (
             <div key={`fret-line-${i}`} className="absolute h-full border-r border-gray-500" style={{ left: `${(i / (FRET_COUNT + 1)) * 100}%`, right: 'auto' }}></div>
        ));
    };
    
    const renderFretNumbers = () => {
        return (
            <div className="flex pl-[calc(100%/(FRET_COUNT+1)/2)] pr-[calc(100%/(FRET_COUNT+1)/2)]">
                {Array.from({ length: FRET_COUNT }).map((_, i) => (
                    <div key={`fret-num-${i+1}`} className="flex-1 text-center text-xs text-gray-500">
                        {i + 1}
                    </div>
                ))}
            </div>
        );
    }
    
    const renderInlays = () => {
        const inlays = [];
        const inlayPositions = [3, 5, 7, 9, 12]; // Common inlay positions
        for (const pos of inlayPositions) {
            if (pos <= FRET_COUNT) {
                 inlays.push(
                    <div key={`inlay-${pos}`} className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-600 rounded-full" style={{ left: `calc(${(pos - 0.5) / (FRET_COUNT + 1) * 100}%)` }}></div>
                );
            }
        }
        return inlays;
    }

    const renderStrings = () => {
        return (
            <div className="flex flex-col h-full">
                {Array.from({ length: stringCount }).map((_, i) => (
                    <div key={`string-${i}`} className="relative flex-1 border-b border-gray-400">
                        {Array.from({ length: FRET_COUNT + 1 }).map((_, fretIndex) => {
                            const note = getNoteOnString(i, fretIndex);
                            const isNoteInChord = chordNotes.includes(note);
                            const isRoot = note === rootNote;

                            if (!isNoteInChord) return null;

                            return (
                                <div 
                                    key={`note-${i}-${fretIndex}`} 
                                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-opacity duration-300 ${isNoteInChord ? 'opacity-100' : 'opacity-0'}`}
                                    style={{ left: `calc(${(fretIndex) / (FRET_COUNT + 1) * 100}%)` }}
                                >
                                    <div className={`w-full h-full rounded-full flex items-center justify-center ${isRoot ? 'bg-cyan-500' : 'bg-gray-200'}`}>
                                        <span className={`text-xs font-bold ${isRoot ? 'text-white' : 'text-gray-800'}`}>{note}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className={`bg-gray-800 p-4 rounded-lg border border-gray-700 transition-opacity duration-300 ${chordName ? 'opacity-100' : 'opacity-50 h-auto'}`}>
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <p className="font-bold text-lg text-white truncate">{chordName || 'Passe o mouse sobre uma cifra'}</p>
                <select
                    value={tuningName}
                    onChange={(e) => setTuningName(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                    {Object.keys(availableTunings).map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>
            <div className="relative" style={{ height: `${stringCount * 1.5}rem`}}>
                <div className="absolute top-0 left-0 w-full h-full bg-gray-700 rounded-md">
                    {renderFrets()}
                    {renderInlays()}
                </div>
                 <div className="relative h-full">
                    {renderStrings()}
                 </div>
            </div>
            {renderFretNumbers()}
        </div>
    );
};
