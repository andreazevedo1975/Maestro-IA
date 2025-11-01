import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import type { AnalysisResult, InstrumentStem, SongSection, Source } from '../types.js';
import { getYouTubeEmbedUrl } from '../utils/youtubeUtils.js';
import { parseChord } from '../utils/musicTheoryUtils.js';
import { playChord, playMetronomeClick, decodeBase64, decodePcmAudioData } from '../utils/audioUtils.js';

import { AccordionSection } from './AccordionSection.js';
import { SongPlayer } from './SongPlayer.js';
import { StemPlayer } from './StemPlayer.js';
import { VirtualFretboard } from './VirtualFretboard.js';
import { StudyMaterials } from './StudyMaterials.js';
import { ChordDiagram } from './ChordDiagram.js';

import { MusicIcon } from './icons/MusicIcon.js';
import { GuitarIcon } from './icons/GuitarIcon.js';
import { BassIcon } from './icons/BassIcon.js';
import { DrumIcon } from './icons/DrumIcon.js';
import { MicIcon } from './icons/MicIcon.js';
import { KeyboardIcon } from './icons/KeyboardIcon.js';
import { LinkIcon } from './icons/LinkIcon.js';
import { DownloadIcon } from './icons/DownloadIcon.js';

const renderInstrumentIcon = (instrumentName: string) => {
    const lowerName = instrumentName.toLowerCase();
    if (lowerName.includes('guitar') || lowerName.includes('violão')) return <GuitarIcon className="w-6 h-6" />;
    if (lowerName.includes('bass') || lowerName.includes('baixo')) return <BassIcon className="w-6 h-6" />;
    if (lowerName.includes('drum') || lowerName.includes('bateria')) return <DrumIcon className="w-6 h-6" />;
    if (lowerName.includes('vocal') || lowerName.includes('voz')) return <MicIcon className="w-6 h-6" />;
    if (lowerName.includes('key') || lowerName.includes('piano') || lowerName.includes('teclado')) return <KeyboardIcon className="w-6 h-6" />;
    return <MusicIcon className="w-6 h-6" />;
};

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
    return 'guitar';
};


export const AnalysisDisplay = ({ result }: { result: AnalysisResult }) => {
    const embedUrl = useMemo(() => getYouTubeEmbedUrl(result.previewUrl || ''), [result.previewUrl]);
    const [hoveredChord, setHoveredChord] = useState<string | null>(null);
    const [selectedInstrument, setSelectedInstrument] = useState<InstrumentStem | null>(result.instrumentStems?.[0] ?? null);
    const [currentBpm, setCurrentBpm] = useState(result.bpm);
    
    // Lifted tuning state
    const instrumentType = useMemo(() => getInstrumentType(selectedInstrument?.instrument), [selectedInstrument]);
    const availableTunings = TUNINGS[instrumentType];
    const [tuningName, setTuningName] = useState(Object.keys(availableTunings)[0]);
    
    // When instrument changes, reset the tuning to its default
    useEffect(() => {
        const newInstrumentType = getInstrumentType(selectedInstrument?.instrument);
        const newAvailableTunings = TUNINGS[newInstrumentType];
        setTuningName(Object.keys(newAvailableTunings)[0]);
    }, [selectedInstrument]);

    const currentTuning = (availableTunings as Record<string, string[]>)[tuningName];
    const uniqueChords = useMemo(() => [...new Set(result.chords ?? [])], [result.chords]);

    const audioContextRef = useRef<AudioContext | null>(null);
    const decodedAudioCache = useRef<Map<string, AudioBuffer>>(new Map());
    const activePreviewSource = useRef<AudioBufferSourceNode | null>(null);

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
             const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
             if(AudioCtor) {
                 audioContextRef.current = new AudioCtor();
             }
        }
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);
    
    const handleChordHover = (chord: string | null) => {
        setHoveredChord(chord);
    };
    
    const handleChordClick = (chord: string) => {
        const context = getAudioContext();
        if (context) {
            const notes = parseChord(chord);
            playChord(notes, context);
        }
    };
    
    const handleInstrumentSelect = useCallback(async (instrument: InstrumentStem) => {
        setSelectedInstrument(instrument);

        const context = getAudioContext();
        if (!context || !instrument.audio) return;
        
        if (activePreviewSource.current) {
            try { activePreviewSource.current.stop(); } catch (e) {}
            activePreviewSource.current = null;
        }

        let audioBuffer = decodedAudioCache.current.get(instrument.instrument);

        if (!audioBuffer) {
            try {
                const decodedBytes = decodeBase64(instrument.audio);
                audioBuffer = await decodePcmAudioData(decodedBytes, context, 24000, 1);
                if (audioBuffer) decodedAudioCache.current.set(instrument.instrument, audioBuffer);
            } catch (e) {
                console.error("Failed to decode preview audio", e);
                return;
            }
        }
        
        if (!audioBuffer) return;

        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        source.start(0, 0, 3); 
        activePreviewSource.current = source;

    }, [getAudioContext]);
    
    const renderLyricsWithChords = (lyrics: string) => {
        if (!lyrics) return <p>Letra não disponível.</p>;

        const parts = lyrics.split(/(\[[^\]]+\])/g);
        return (
            <p className="whitespace-pre-wrap leading-relaxed font-mono text-lg">
                {parts.map((part, index) => {
                    if (part.startsWith('[') && part.endsWith(']')) {
                        const chord = part.slice(1, -1);
                        return (
                            <strong
                                key={index}
                                onMouseEnter={() => handleChordHover(chord)}
                                onMouseLeave={() => handleChordHover(null)}
                                onClick={() => handleChordClick(chord)}
                                className="font-bold text-cyan-400 cursor-pointer transition-all hover:text-white hover:bg-cyan-500/10 rounded-md px-1 relative -top-4 inline-block mx-1 transform active:scale-95"
                            >
                                {chord}
                            </strong>
                        );
                    }
                    return <span key={index}>{part}</span>;
                })}
            </p>
        );
    };

    // Metronome and Sequence Player
    const sequenceTimeoutRef = useRef<number | null>(null);
    const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null);
    const [isPlayingSequence, setIsPlayingSequence] = useState(false);

    const stopSequence = useCallback(() => {
        if (sequenceTimeoutRef.current) {
            clearTimeout(sequenceTimeoutRef.current);
            sequenceTimeoutRef.current = null;
        }
        setIsPlayingSequence(false);
        setActiveChordIndex(null);
    }, []);

    const handlePlaySequence = useCallback((chords: string[]) => {
        if (isPlayingSequence) {
            stopSequence();
            return;
        }

        const context = getAudioContext();
        if (!context || !currentBpm || currentBpm <= 0) return;
        
        stopSequence();
        setIsPlayingSequence(true);

        const interval = (60 / currentBpm) * 1000;
        let index = 0;

        const playNextChord = () => {
            if (index >= chords.length) {
                stopSequence();
                return;
            }
            
            const chord = chords[index];
            setActiveChordIndex(index);
            setHoveredChord(chord);
            
            const notes = parseChord(chord);
            playChord(notes, context);
            playMetronomeClick(context);

            index++;
            sequenceTimeoutRef.current = window.setTimeout(playNextChord, interval);
        };

        playNextChord();
    }, [isPlayingSequence, stopSequence, getAudioContext, currentBpm]);
    
    useEffect(() => {
        return () => stopSequence();
    }, [stopSequence]);

    const handleDownloadTab = (instrument: InstrumentStem) => {
        if (!instrument.tablature) return;
        const blob = new Blob([instrument.tablature], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${result.songTitle}_${instrument.instrument}_Tab.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };


    const [isSticky, setIsSticky] = useState(false);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const navRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

    const navItems = [
        { id: 'lyrics', title: 'Letra e Cifras' },
        { id: 'instruments', title: 'Instrumentos' },
        { id: 'structure', title: 'Estrutura' },
        { id: 'study', title: 'Estudo' },
        result.sources && result.sources.length > 0 && { id: 'sources', title: 'Fontes' }
    ].filter(Boolean) as { id: string; title: string }[];

     useEffect(() => {
        const handleScroll = () => {
            if (navRef.current) {
                setIsSticky(navRef.current.offsetTop > 0 && window.scrollY > navRef.current.offsetTop);
            }

            let currentSection: string | null = null;
            for (const item of navItems) {
                const element = sectionRefs.current[item.id];
                if (element && window.scrollY >= element.offsetTop - 150) {
                    currentSection = item.id;
                }
            }
            setActiveSection(currentSection);
        };

        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [navItems]);

    const handleNavClick = (id: string) => {
        sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };


    return (
        <div className="animate-fade-in space-y-8">
            <header className="text-center">
                <h2 className="text-4xl sm:text-5xl font-teko font-bold tracking-wider text-white uppercase">{result.songTitle}</h2>
                <p className="text-xl text-gray-400">{result.artist}</p>
            </header>

            <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-700">
                <p className="text-lg text-gray-300 mb-6">{result.summary}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="bg-gray-900/50 p-4 rounded-lg">
                        <p className="text-sm text-cyan-400 font-bold uppercase tracking-wider">Tonalidade</p>
                        <p className="text-2xl font-semibold text-white">{result.key}</p>
                    </div>
                     <div className="bg-gray-900/50 p-4 rounded-lg col-span-2">
                        <p className="text-sm text-cyan-400 font-bold uppercase tracking-wider">Tempo (BPM)</p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                             <input 
                                type="range" 
                                min={Math.max(20, result.bpm - 50)} 
                                max={result.bpm + 50}
                                value={currentBpm}
                                onChange={(e) => setCurrentBpm(Number(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                             />
                             <p className="text-2xl font-semibold text-white w-24 text-right">{currentBpm} <span className="text-base font-normal">BPM</span></p>
                        </div>
                    </div>
                     <div className="bg-gray-900/50 p-4 rounded-lg">
                        <p className="text-sm text-cyan-400 font-bold uppercase tracking-wider">Compasso</p>
                        <p className="text-2xl font-semibold text-white">{result.timeSignature}</p>
                    </div>
                </div>
            </div>

            {embedUrl && (
                <div className="aspect-w-16 aspect-h-9">
                    <iframe
                        src={embedUrl}
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full rounded-lg shadow-lg"
                    ></iframe>
                </div>
            )}
            
            <nav ref={navRef} className={`bg-gray-800/80 backdrop-blur-md rounded-lg p-2 z-10 transition-all duration-300 ${isSticky ? 'sticky top-4 shadow-lg' : ''}`}>
                <ul className="flex justify-center items-center gap-2 sm:gap-4">
                    {navItems.map(item => (
                        <li key={item.id}>
                             <button
                                onClick={() => handleNavClick(item.id)}
                                className={`text-sm sm:text-base font-bold px-3 py-2 rounded-md transition-colors ${activeSection === item.id ? 'bg-cyan-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                            >
                                {item.title}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>

            <div ref={el => sectionRefs.current['lyrics'] = el}>
                <AccordionSection title="Letra e Cifras" defaultOpen={true}>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                            {renderLyricsWithChords(result.lyrics)}
                        </div>
                        <div className="md:col-span-1">
                           <VirtualFretboard 
                                chordName={hoveredChord} 
                                instrument={selectedInstrument} 
                                tuningName={tuningName}
                                setTuningName={setTuningName}
                           />
                        </div>
                    </div>
                </AccordionSection>
            </div>

            <div ref={el => sectionRefs.current['instruments'] = el}>
                <AccordionSection title="Instrumentos" defaultOpen={true}>
                     <div className="flex flex-wrap gap-2 mb-4">
                         {(result.instrumentStems ?? []).map((stem) => (
                             <button
                                 key={stem.instrument}
                                 onClick={() => handleInstrumentSelect(stem)}
                                 className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 transform active:scale-95 ${selectedInstrument?.instrument === stem.instrument ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600/50 hover:border-gray-500'}`}
                             >
                                 {renderInstrumentIcon(stem.instrument)}
                                 <span className="font-semibold">{stem.instrument}</span>
                             </button>
                         ))}
                     </div>

                    {selectedInstrument && (
                        <div className="bg-gray-900/40 p-4 rounded-lg border border-gray-700 animate-fade-in">
                            <p className="text-sm text-gray-400 mb-3">{selectedInstrument.description}</p>
                            {selectedInstrument.audio ? (
                                <StemPlayer instrumentName={selectedInstrument.instrument} audioBase64={selectedInstrument.audio} />
                            ) : (
                                <p className="text-gray-500 text-sm">Áudio indisponível para este instrumento.</p>
                            )}
                            {selectedInstrument.tablature && (
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-1">
                                         <h6 className="text-xs font-bold text-gray-400 uppercase">Tablatura / Padrão Rítmico</h6>
                                         <button onClick={() => handleDownloadTab(selectedInstrument)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-cyan-400 transition transform active:scale-95">
                                            <DownloadIcon className="w-4 h-4" />
                                            <span>Baixar</span>
                                         </button>
                                    </div>
                                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono mt-1 bg-gray-800 p-3 rounded-md">{selectedInstrument.tablature}</pre>
                                </div>
                            )}

                             <div>
                                <h4 className="font-bold text-lg text-cyan-400 mt-6 mb-3">Cifras Simplificadas para {selectedInstrument.instrument}</h4>
                                <div className="flex flex-wrap gap-x-4 gap-y-6 justify-center sm:justify-start p-2 bg-gray-800 rounded-md">
                                    {uniqueChords.length > 0 ? uniqueChords.map((chord, index) => (
                                        <ChordDiagram key={index} chordName={chord} tuning={currentTuning} />
                                    )) : <p className="text-gray-500 w-full text-center">Nenhuma cifra principal para exibir.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </AccordionSection>
            </div>
            
             <div ref={el => sectionRefs.current['structure'] = el}>
                <AccordionSection title="Estrutura da Música">
                    <div className="space-y-4">
                        {(result.sections ?? []).map((section: SongSection, index: number) => (
                            <div key={index} className="bg-gray-900/40 p-4 rounded-lg border border-gray-700 transition-all hover:border-cyan-700 hover:shadow-lg">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="font-teko font-bold text-cyan-400 text-2xl uppercase tracking-wider">{section.part}</h4>
                                        <p className="text-gray-300 mt-1 mb-3">{section.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handlePlaySequence(section.chords)}
                                            className="p-2 rounded-full bg-gray-700 hover:bg-cyan-600 text-cyan-400 hover:text-white transition-all transform active:scale-90"
                                            title={isPlayingSequence ? "Parar sequência" : "Tocar sequência de acordes"}
                                        >
                                            {isPlayingSequence ? <MusicIcon className="w-5 h-5 animate-pulse" /> : <MusicIcon className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="border-t border-gray-700 pt-3 mt-3">
                                    <h5 className="text-xs font-bold text-gray-400 uppercase mb-2">Acordes da Seção</h5>
                                     <div className="flex flex-wrap gap-2">
                                        {section.chords.map((chord, i) => (
                                            <button 
                                                key={i} 
                                                onMouseEnter={() => handleChordHover(chord)}
                                                onMouseLeave={() => handleChordHover(null)}
                                                onClick={() => handleChordClick(chord)}
                                                className={`font-mono text-sm px-2 py-1 rounded transition-colors ${activeChordIndex === i && isPlayingSequence ? 'bg-cyan-500 text-white animate-pulse' : 'bg-gray-800 text-cyan-300 hover:bg-cyan-500 hover:text-white'}`}
                                            >
                                                {chord}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(result.sections ?? []).length === 0 && <p className="text-gray-500">Estrutura da música não disponível.</p>}
                    </div>
                </AccordionSection>
            </div>
            
            <div ref={el => sectionRefs.current['study'] = el}>
                 <StudyMaterials result={result} />
            </div>

            {result.sources && result.sources.length > 0 && (
                <div ref={el => sectionRefs.current['sources'] = el}>
                    <AccordionSection title="Fontes da Análise">
                        <ul className="space-y-2">
                            {result.sources.map((source: Source, index: number) => (
                                <li key={index}>
                                    <a
                                        href={source.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:underline transition group"
                                    >
                                        <LinkIcon className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate" title={source.title}>{source.title}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </AccordionSection>
                </div>
            )}
        </div>
    );
};