import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TUNINGS } from '../contexts/SettingsContext.js';
import { playNote, stopNote } from '../utils/audioUtils.js';
import { PlayIcon } from './icons/PlayIcon.js';
import { StopIcon } from './icons/StopIcon.js';
import { GuitarIcon } from './icons/GuitarIcon.js';
import { BassIcon } from './icons/BassIcon.js';

type InstrumentType = 'guitar' | 'bass';

interface InstrumentTunerProps {
    initialInstrumentType: InstrumentType;
}

export const InstrumentTuner: React.FC<InstrumentTunerProps> = ({ initialInstrumentType }) => {
    const [instrumentType, setInstrumentType] = useState<InstrumentType>(initialInstrumentType);
    const [tuningName, setTuningName] = useState(Object.keys(TUNINGS[initialInstrumentType])[0]);
    const [playingNote, setPlayingNote] = useState<string | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);

    // Update tuning options when instrument type changes
    useEffect(() => {
        setTuningName(Object.keys(TUNINGS[instrumentType])[0]);
    }, [instrumentType]);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            stopNote();
        };
    }, []);

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtor) {
                audioContextRef.current = new AudioCtor();
            }
        }
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const handlePlayNote = (note: string) => {
        if (playingNote === note) {
            stopNote();
            setPlayingNote(null);
        } else {
            const context = getAudioContext();
            if (context) {
                const DURATION = 3; // seconds
                playNote(note, context, DURATION);
                setPlayingNote(note);
                setTimeout(() => {
                    setPlayingNote(current => (current === note ? null : current));
                }, DURATION * 1000);
            }
        }
    };

    const currentTuning = TUNINGS[instrumentType][tuningName];
    // Reverse the tuning for standard display (e.g., high E string on top for guitar)
    const displayTuning = [...currentTuning].reverse();

    return (
        <div className="max-w-md mx-auto">
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <label htmlFor="instrument-type" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Instrumento</label>
                    <select
                        id="instrument-type"
                        value={instrumentType}
                        onChange={(e) => setInstrumentType(e.target.value as InstrumentType)}
                        className="w-full bg-gray-200 dark:bg-gray-700 border border-gray-400 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                        <option value="guitar">Guitarra / Violão</option>
                        <option value="bass">Contrabaixo</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label htmlFor="tuning-select" className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Afinação</label>
                    <select
                        id="tuning-select"
                        value={tuningName}
                        onChange={(e) => setTuningName(e.target.value)}
                         className="w-full bg-gray-200 dark:bg-gray-700 border border-gray-400 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                        {Object.keys(TUNINGS[instrumentType]).map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-center text-sm text-gray-500 dark:text-gray-400">Clique em uma corda para ouvir a nota de referência.</p>
                {displayTuning.map((note, index) => (
                    <div key={`${note}-${index}`} className="flex items-center justify-between bg-gray-200/50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-300 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            {instrumentType === 'guitar' ? <GuitarIcon className="w-5 h-5 text-gray-500"/> : <BassIcon className="w-5 h-5 text-gray-500"/>}
                            <span className="font-mono text-xl font-bold text-gray-900 dark:text-white w-8">{note}</span>
                        </div>
                        <button
                            onClick={() => handlePlayNote(note)}
                            className={`p-2 rounded-full transition-colors transform active:scale-90 ${playingNote === note ? 'bg-cyan-500 text-white' : 'bg-gray-300 dark:bg-gray-700 hover:bg-cyan-400/50 text-cyan-700 dark:text-cyan-400'}`}
                            aria-label={`Tocar nota ${note}`}
                        >
                            {playingNote === note ? <StopIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};