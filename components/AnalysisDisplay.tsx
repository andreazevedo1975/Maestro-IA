

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { AnalysisResult, InstrumentStem, SongSection, Source } from '../types.js';
import { getYouTubeEmbedUrl } from '../utils/youtubeUtils.js';
import { playChord, playMetronomeClick } from '../utils/audioUtils.js';
import { parseChord } from '../utils/musicTheoryUtils.js';
import { VirtualFretboard } from './VirtualFretboard.js';
import { SongPlayer } from './SongPlayer.js';
import { StemPlayer } from './StemPlayer.js';
import { ChevronDownIcon } from './icons/ChevronDownIcon.js';
import { ChevronUpIcon } from './icons/ChevronUpIcon.js';
import { MusicIcon } from './icons/MusicIcon.js';
import { GuitarIcon } from './icons/GuitarIcon.js';
import { BassIcon } from './icons/BassIcon.js';
import { DrumIcon } from './icons/DrumIcon.js';
import { MicIcon } from './icons/MicIcon.js';
import { KeyboardIcon } from './icons/KeyboardIcon.js';
import { LinkIcon } from './icons/LinkIcon.js';
import { PlayIcon } from './icons/PlayIcon.js';
import { StopIcon } from './icons/StopIcon.js';


// Helper to get an icon for an instrument
const getInstrumentIcon = (instrument: string) => {
    const lowerInstrument = instrument.toLowerCase();
    if (lowerInstrument.includes('guitar') || lowerInstrument.includes('violão')) return <GuitarIcon className="w-8 h-8 text-cyan-400" />;
    if (lowerInstrument.includes('bass') || lowerInstrument.includes('baixo')) return <BassIcon className="w-8 h-8 text-cyan-400" />;
    if (lowerInstrument.includes('drum') || lowerInstrument.includes('bateria') || lowerInstrument.includes('percussão')) return <DrumIcon className="w-8 h-8 text-cyan-400" />;
    if (lowerInstrument.includes('vocal') || lowerInstrument.includes('voz')) return <MicIcon className="w-8 h-8 text-cyan-400" />;
    if (lowerInstrument.includes('keyboard') || lowerInstrument.includes('piano') || lowerInstrument.includes('teclado')) return <KeyboardIcon className="w-8 h-8 text-cyan-400" />;
    return <MusicIcon className="w-8 h-8 text-cyan-400" />;
};

// Collapsible section component
type AccordionSectionProps = {
    title: string;
    // FIX: Made children optional to resolve a potential type inference issue where the compiler
    // incorrectly reports that the `children` prop is missing, even when it is provided.
    children?: React.ReactNode;
    defaultOpen?: boolean;
};

const AccordionSection = ({ title, children, defaultOpen = false }: AccordionSectionProps) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg mb-4 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 bg-gray-800/70 hover:bg-gray-700/50 transition"
            >
                <h3 className="text-xl font-bold font-teko tracking-wider uppercase text-white">{title}</h3>
                {isOpen ? <ChevronUpIcon className="w-6 h-6 text-gray-400" /> : <ChevronDownIcon className="w-6 h-6 text-gray-400" />}
            </button>
            {isOpen && (
                <div className="p-4 md:p-6 text-gray-300">
                    {children}
                </div>
            )}
        </div>
    );
};

// Main component
export const AnalysisDisplay = ({ result }: { result: AnalysisResult }) => {
    const [hoveredChord, setHoveredChord] = useState<string | null>(null);
    const [selectedInstrument, setSelectedInstrument] = useState<InstrumentStem | null>(result.instrumentStems?.[0] || null);
    const [isTablatureOpen, setIsTablatureOpen] = useState(true);
    const [playingSectionPart, setPlayingSectionPart] = useState<string | null>(null);
    const [playingChordIndex, setPlayingChordIndex] = useState<number | null>(null);
    const [isMetronomeOn, setIsMetronomeOn] = useState(false);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const playbackIntervalRef = useRef<number | null>(null);

    const initAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtor) {
                audioContextRef.current = new AudioCtor();
            }
        }
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    }, []);

    const handleChordInteraction = useCallback((chord: string) => {
        initAudioContext();
        if (audioContextRef.current) {
            const notes = parseChord(chord);
            playChord(notes, audioContextRef.current);
        }
    }, [initAudioContext]);

    const stopPlayback = useCallback(() => {
        if (playbackIntervalRef.current) {
            clearInterval(playbackIntervalRef.current);
            playbackIntervalRef.current = null;
        }
        setPlayingSectionPart(null);
        setPlayingChordIndex(null);
        setHoveredChord(null); // Clear fretboard highlight
    }, []);

    const handlePlaySequence = useCallback((section: SongSection) => {
        if (playingSectionPart === section.part) {
            stopPlayback();
            return;
        }

        stopPlayback(); // Stop any other sequence before starting
        initAudioContext();

        setPlayingSectionPart(section.part);

        let chordIdx = 0;
        const playNextChord = () => {
            if (!audioContextRef.current || chordIdx >= section.chords.length) {
                stopPlayback();
                return;
            }

            const currentChord = section.chords[chordIdx];
            setPlayingChordIndex(chordIdx);
            setHoveredChord(currentChord); // Sync with fretboard
            handleChordInteraction(currentChord);
            
            if (isMetronomeOn) {
                const beatDuration = 60 / result.bpm;
                const now = audioContextRef.current.currentTime;
                for (let i = 0; i < 4; i++) { // Assuming 4 beats per chord
                    playMetronomeClick(audioContextRef.current, now + beatDuration * i);
                }
            }

            chordIdx++;
        };

        const beatsPerChord = 4; // Assume 4/4 time and one chord per measure
        const intervalDuration = (60 / result.bpm) * beatsPerChord * 1000;
        
        playNextChord(); // Play the first chord immediately
        playbackIntervalRef.current = window.setInterval(playNextChord, intervalDuration);

    }, [playingSectionPart, result.bpm, isMetronomeOn, stopPlayback, handleChordInteraction, initAudioContext]);

    useEffect(() => {
        return () => stopPlayback(); // Cleanup on unmount
    }, [stopPlayback]);


    const renderLyrics = () => {
        if (!result.lyrics) return <p>Letra não disponível.</p>;
        const parts = result.lyrics.split(/(\[[A-Ga-g][#b]?(?:m|maj|min|dim|aug|sus|7|9|11|13)*\/?(?:[A-Ga-g][#b]?)?\])/g);

        return (
            <div className="whitespace-pre-wrap leading-relaxed font-mono bg-gray-900/50 p-4 rounded-md text-lg">
                {parts.map((part, index) => {
                    const match = part.match(/\[(.*?)\]/);
                    if (match) {
                        const chord = match[1];
                        return (
                            <strong
                                key={index}
                                className="font-bold text-cyan-400 cursor-pointer hover:text-cyan-300 hover:bg-gray-700 rounded px-1 py-0.5"
                                onMouseEnter={() => setHoveredChord(chord)}
                                onMouseLeave={() => setHoveredChord(null)}
                                onClick={() => handleChordInteraction(chord)}
                            >
                                {chord}
                            </strong>
                        );
                    }
                    return part;
                })}
            </div>
        );
    };

    const embedUrl = result.previewUrl ? getYouTubeEmbedUrl(result.previewUrl) : null;

    return (
        <div className="animate-fade-in space-y-8">
            <header className="text-center">
                <h2 className="text-4xl sm:text-5xl font-teko font-bold tracking-wide text-white">{result.songTitle}</h2>
                <p className="text-2xl text-gray-400">{result.artist}</p>
            </header>
            
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
                <p className="text-lg text-gray-300 italic">{result.summary}</p>
            </div>

            {embedUrl && (
                 <AccordionSection title="Prévia da Música (YouTube)">
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                            src={embedUrl}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute top-0 left-0 w-full h-full rounded-lg"
                        ></iframe>
                    </div>
                 </AccordionSection>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400 uppercase">Tonalidade</p>
                    <p className="text-2xl font-bold text-white">{result.key || 'N/A'}</p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400 uppercase">Tempo</p>
                    <p className="text-2xl font-bold text-white">{result.bpm || 'N/A'} <span className="text-lg">BPM</span></p>
                </div>
                <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400 uppercase">Compasso</p>
                    <p className="text-2xl font-bold text-white">{result.timeSignature || 'N/A'}</p>
                </div>
                 <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 col-span-2 md:col-span-1">
                    <p className="text-sm text-gray-400 uppercase">Melodia Principal</p>
                    {result.mainMelodyAudio ? <SongPlayer audioBase64={result.mainMelodyAudio} /> : <p className="text-gray-500 mt-2">Indisponível</p>}
                </div>
            </div>

            <AccordionSection title="Letra e Cifras" defaultOpen={true}>
                 <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        {renderLyrics()}
                    </div>
                    <div className="md:col-span-1">
                        <VirtualFretboard chordName={hoveredChord} instrument={selectedInstrument} />
                    </div>
                </div>
            </AccordionSection>

            <AccordionSection title="Instrumentos" defaultOpen={true}>
                <div className="flex flex-wrap justify-center gap-4 mb-6 pb-6 border-b border-gray-700">
                    {result.instrumentStems.map((stem: InstrumentStem, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                setSelectedInstrument(stem);
                                setIsTablatureOpen(true); // Reset to open when switching
                            }}
                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition w-24 h-24 justify-center ${selectedInstrument?.instrument === stem.instrument ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-700 hover:border-cyan-600 hover:bg-cyan-500/5'}`}
                        >
                            {getInstrumentIcon(stem.instrument)}
                            <span className="text-sm font-semibold text-center">{stem.instrument}</span>
                        </button>
                    ))}
                </div>
                
                {selectedInstrument && (
                    <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-700 animate-fade-in">
                        <div className="flex items-center gap-3 mb-3">
                            {getInstrumentIcon(selectedInstrument.instrument)}
                            <h4 className="text-xl font-semibold text-white">{selectedInstrument.instrument}</h4>
                        </div>
                        <p className="text-gray-400 mb-4">{selectedInstrument.description}</p>
                        
                        {selectedInstrument.tablature && (
                            <div className="mb-4">
                                <button
                                    onClick={() => setIsTablatureOpen(!isTablatureOpen)}
                                    className="w-full flex justify-between items-center p-2 bg-gray-800/70 hover:bg-gray-700/50 rounded-t-lg transition"
                                >
                                    <h5 className="text-sm text-gray-300 uppercase font-bold">Tablatura / Padrão Rítmico</h5>
                                    {isTablatureOpen ? <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
                                </button>
                                {isTablatureOpen && (
                                    <pre className="bg-gray-900/50 p-3 rounded-b-lg font-mono text-sm text-cyan-300 overflow-x-auto">{selectedInstrument.tablature}</pre>
                                )}
                            </div>
                        )}

                        {selectedInstrument.audio ? <StemPlayer instrumentName={selectedInstrument.instrument} audioBase64={selectedInstrument.audio} /> : <p className="text-sm text-gray-500">Áudio indisponível</p>}
                    </div>
                )}
            </AccordionSection>
            
            <AccordionSection title="Estrutura da Música">
                <div className="space-y-6">
                    {result.sections.map((section: SongSection, index) => {
                        const isPlayingThisSection = playingSectionPart === section.part;
                        return (
                            <div key={index} className="bg-gray-900/40 p-4 rounded-lg border border-gray-700">
                                <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                                    <div>
                                        <h4 className="text-xl font-semibold text-white">{section.part}</h4>
                                        <p className="text-gray-400 text-sm">{section.description}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                         <label className="flex items-center cursor-pointer text-sm text-gray-400">
                                            <input type="checkbox" checked={isMetronomeOn} onChange={() => setIsMetronomeOn(!isMetronomeOn)} className="form-checkbox h-4 w-4 text-cyan-600 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500" />
                                            <span className="ml-2">Metrônomo</span>
                                        </label>
                                        <button onClick={() => handlePlaySequence(section)} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold p-2 rounded-full transition duration-300 flex items-center justify-center w-10 h-10" title={isPlayingThisSection ? 'Parar Sequência' : 'Tocar Sequência'}>
                                            {isPlayingThisSection ? <StopIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {section.chords.map((chord, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => handleChordInteraction(chord)}
                                            onMouseEnter={() => setHoveredChord(chord)}
                                            onMouseLeave={() => setHoveredChord(null)}
                                            className={`relative bg-cyan-900/50 text-cyan-300 font-mono px-4 py-2 rounded-lg text-base border border-cyan-800 hover:bg-cyan-800/70 transition ${isPlayingThisSection && playingChordIndex === i ? 'ring-2 ring-cyan-400 animate-pulse' : ''}`}
                                        >
                                            {chord}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </AccordionSection>

            {result.sources && result.sources.length > 0 && (
                <AccordionSection title="Fontes">
                    <ul className="space-y-2">
                        {result.sources.map((source: Source, index) => (
                             <li key={index} className="flex items-start gap-2">
                                <LinkIcon className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
                                <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline break-all">
                                    {source.title || source.uri}
                                </a>
                            </li>
                        ))}
                    </ul>
                </AccordionSection>
            )}

        </div>
    );
};
