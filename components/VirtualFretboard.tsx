// components/VirtualFretboard.js
import React, { useEffect } from 'react';
import { parseChord, STANDARD_GUITAR_VOICINGS } from '../utils/musicTheoryUtils.js';
import type { InstrumentStem } from '../types.js';
import { TUNINGS } from '../contexts/SettingsContext.js';

const FRET_COUNT = 5;
const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const getInstrumentType = (instrumentName: string | undefined): 'guitar' | 'bass' => {
    if (!instrumentName) return 'guitar';
    const lowerName = instrumentName.toLowerCase();
    if (lowerName.includes('bass') || lowerName.includes('baixo')) {
        return 'bass';
    }
    return 'guitar'; // Default to guitar
};

export const VirtualFretboard = ({ chordName, instrument, tuningName, setTuningName, highlightedNotes, displayTitle }: { 
    chordName: string | null, 
    instrument: InstrumentStem | null,
    tuningName: string,
    setTuningName: (name: string) => void,
    highlightedNotes?: string[],
    displayTitle?: string,
}) => {
    const instrumentType = getInstrumentType(instrument?.instrument);
    const availableTunings = TUNINGS[instrumentType];
    
    // Reset tuning if the current one is not available for the new instrument type
    useEffect(() => {
        if (!availableTunings[tuningName]) {
            setTuningName(Object.keys(availableTunings)[0]);
        }
    }, [instrumentType, tuningName, availableTunings, setTuningName]);


    const openStrings = (availableTunings as Record<string, string[]>)[tuningName];
    const stringCount = openStrings.length;

    const getNoteOnString = (stringIndex: number, fret: number) => {
        const openNoteWithOctave = openStrings[stringIndex];
        const openNote = openNoteWithOctave.toUpperCase().replace(/\d/g, ''); // Remove octave for calculation
        const openNoteIndex = ALL_NOTES.indexOf(openNote);
        if (openNoteIndex === -1) return '?';
        const noteIndex = (openNoteIndex + fret) % 12;
        return ALL_NOTES[noteIndex];
    };

    // Determine mode: Voicing diagram or Scale highlighting
    const tuningNotesOnly = openStrings.map(note => note.replace(/\d/g, ''));
    const isStandardGuitarTuning = instrumentType === 'guitar' && JSON.stringify(tuningNotesOnly) === JSON.stringify(['E', 'A', 'D', 'G', 'B', 'E']);
    const voicing = (chordName && isStandardGuitarTuning) ? STANDARD_GUITAR_VOICINGS[chordName] : null;

    // Determine notes to highlight if not in voicing mode
    const notesToHighlight = voicing ? [] : (highlightedNotes || (chordName ? parseChord(chordName) : []));
    const rootNote = notesToHighlight[0] || null;

    // Determine base fret for display (for barre chords)
    const fretsInVoicing = voicing ? voicing.map(f => Number(f)).filter(f => f > 0) : [];
    const minFret = fretsInVoicing.length > 0 ? Math.min(...fretsInVoicing) : 0;
    const baseFret = voicing && minFret > 1 ? minFret : 1;
    
    let titleText = displayTitle;
    if (!titleText) {
        if (voicing) {
            titleText = chordName;
        } else if (chordName) {
            titleText = `${chordName} (notas)`;
        } else if (highlightedNotes) {
             titleText = 'Notas da Escala';
        } else {
            titleText = 'Passe o mouse sobre uma cifra';
        }
    }

    const hasContent = !!voicing || notesToHighlight.length > 0;


    const renderFrets = () => {
        return Array.from({ length: FRET_COUNT + 1 }).map((_, i) => (
             <div key={`fret-line-${i}`} className="absolute h-full border-r border-gray-400 dark:border-gray-500" style={{ left: `${(i / (FRET_COUNT + 1)) * 100}%`, right: 'auto' }}></div>
        ));
    };
    
    const renderFretNumbers = () => {
        return (
            <div className="flex">
                {baseFret > 1 && <div className="text-xs text-gray-500 pt-1 pr-1 font-mono">{baseFret}fr</div>}
                <div className="flex-1 flex pl-[calc(100%/(FRET_COUNT+1)/2)] pr-[calc(100%/(FRET_COUNT+1)/2)]">
                    {Array.from({ length: FRET_COUNT }).map((_, i) => (
                        <div key={`fret-num-${i+1}`} className="flex-1 text-center text-xs text-gray-500">
                            {i + baseFret}
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    
    const renderInlays = () => {
        const inlays = [];
        const inlayPositions = [3, 5, 7, 9, 12].map(p => baseFret > 1 ? p - baseFret + 1 : p).filter(p => p > 0);
        for (const pos of inlayPositions) {
            if (pos <= FRET_COUNT) {
                 inlays.push(
                    <div key={`inlay-${pos}`} className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" style={{ left: `calc(${(pos - 0.5) / (FRET_COUNT + 1) * 100}%)` }}></div>
                );
            }
        }
        return inlays;
    }

    const renderStrings = () => {
        return (
            <div className="relative flex flex-col h-full">
                {/* Voicing Mode: Mute/Open string indicators */}
                {voicing && (
                    <div className="absolute -top-5 w-full h-4">
                        {voicing.map((fret, i) => (
                             <div key={`indicator-${i}`} className="absolute -translate-x-1/2 text-center text-sm font-bold text-gray-500 dark:text-gray-400" style={{ left: `calc(${(0 / (FRET_COUNT + 1)) * 100}% - 1.25rem)`, top: `calc(${(i / (stringCount-1)) * 100}% - 0.4rem)` }}>
                                {fret === 'x' ? 'x' : fret === 0 ? 'o' : ''}
                            </div>
                        ))}
                    </div>
                )}
                {/* Strings and Dots */}
                {Array.from({ length: stringCount }).map((_, i) => (
                    <div key={`string-${i}`} className="relative flex-1 border-b border-gray-500 dark:border-gray-400">
                        {/* Voicing Mode Rendering */}
                        {voicing && (() => {
                            const fret = voicing[i];
                            if (typeof fret !== 'number' || fret <= 0) return null;
                            const fretPos = baseFret > 1 ? fret - baseFret + 1 : fret;
                            if (fretPos <= 0 || fretPos > FRET_COUNT) return null;

                            return (
                                <div 
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center bg-cyan-500"
                                    style={{ left: `calc(${(fretPos - 0.5) / (FRET_COUNT + 1) * 100}%)` }}
                                >
                                    <span className="text-xs font-bold text-white">{getNoteOnString(i, fret)}</span>
                                </div>
                            );
                        })()}
                        {/* Scale Highlight Mode Rendering */}
                        {!voicing && Array.from({ length: FRET_COUNT + 1 }).map((_, fretIndex) => {
                            const note = getNoteOnString(i, fretIndex);
                            const isNoteInScale = notesToHighlight.includes(note);
                            const isRootNote = note === rootNote;
                            
                            let noteClasses = '';
                            let textClasses = 'text-gray-800 dark:text-gray-200';

                            if (isRootNote) {
                                noteClasses = 'bg-cyan-500';
                                textClasses = 'text-white';
                            } else if (isNoteInScale) {
                                noteClasses = 'bg-cyan-400/70 border border-cyan-500';
                                textClasses = 'text-gray-900 dark:text-white';
                            }

                            return (
                                <div 
                                    key={`note-${i}-${fretIndex}`} 
                                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center transform transition-all duration-200 ease-in-out ${isNoteInScale ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
                                    style={{ left: `calc(${(fretIndex) / (FRET_COUNT + 1) * 100}%)` }}
                                >
                                    <div className={`w-full h-full rounded-full flex items-center justify-center ${noteClasses}`}>
                                        <span className={`text-xs font-bold ${textClasses}`}>{note}</span>
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
        <div className={`bg-gray-200 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700 transition-opacity duration-300 ${hasContent ? 'opacity-100' : 'opacity-50 h-auto'}`}>
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <p className="font-bold text-lg text-gray-900 dark:text-white truncate">{titleText}</p>
                <select
                    value={tuningName}
                    onChange={(e) => setTuningName(e.target.value)}
                    className="bg-gray-300 dark:bg-gray-700 border border-gray-400 dark:border-gray-600 rounded-md px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                    {Object.keys(availableTunings).map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>
            <div className="relative" style={{ height: `${stringCount * 1.5}rem`}}>
                <div className="absolute top-0 left-0 w-full h-full bg-gray-100 dark:bg-gray-700 rounded-md">
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