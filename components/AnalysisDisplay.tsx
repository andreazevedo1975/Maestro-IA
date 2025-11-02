import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import type { AnalysisResult, InstrumentStem, SongSection, Source } from '../types.js';
import { getYouTubeEmbedUrl } from '../utils/youtubeUtils.js';
import { parseChord } from '../utils/musicTheoryUtils.js';
import { playChord, playMetronomeClick, decodeBase64, decodePcmAudioData, encodeWav } from '../utils/audioUtils.js';
import { useSettings, TUNINGS } from '../contexts/SettingsContext.js';

import { SongPlayer } from './SongPlayer.js';
import { StemPlayer } from './StemPlayer.js';
import { VirtualFretboard } from './VirtualFretboard.js';
import { VirtualKeyboard } from './VirtualKeyboard.js';
import { StudyMaterials } from './StudyMaterials.js';
import { ChordDiagram } from './ChordDiagram.js';
import { InstrumentTuner } from './InstrumentTuner.js';

import { MusicIcon } from './icons/MusicIcon.js';
import { GuitarIcon } from './icons/GuitarIcon.js';
import { BassIcon } from './icons/BassIcon.js';
import { DrumIcon } from './icons/DrumIcon.js';
import { MicIcon } from './icons/MicIcon.js';
import { KeyboardIcon } from './icons/KeyboardIcon.js';
import { LinkIcon } from './icons/LinkIcon.js';
import { DownloadIcon } from './icons/DownloadIcon.js';
import { ExportIcon } from './icons/ExportIcon.js';
import { TunerIcon } from './icons/TunerIcon.js';

const renderInstrumentIcon = (instrumentName: string) => {
    const lowerName = instrumentName.toLowerCase();
    if (lowerName.includes('guitar') || lowerName.includes('violão')) return <GuitarIcon className="w-6 h-6" />;
    if (lowerName.includes('bass') || lowerName.includes('baixo')) return <BassIcon className="w-6 h-6" />;
    if (lowerName.includes('drum') || lowerName.includes('bateria')) return <DrumIcon className="w-6 h-6" />;
    if (lowerName.includes('vocal') || lowerName.includes('voz')) return <MicIcon className="w-6 h-6" />;
    if (lowerName.includes('key') || lowerName.includes('piano') || lowerName.includes('teclado')) return <KeyboardIcon className="w-6 h-6" />;
    return <MusicIcon className="w-6 h-6" />;
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
    const { settings } = useSettings();
    const embedUrl = useMemo(() => getYouTubeEmbedUrl(result.previewUrl || ''), [result.previewUrl]);
    const [hoveredChord, setHoveredChord] = useState<string | null>(null);
    const [selectedInstrument, setSelectedInstrument] = useState<InstrumentStem | null>(result.instrumentStems?.[0] ?? null);
    const [currentBpm, setCurrentBpm] = useState(settings.defaultBpm ?? result.bpm);
    const [activeTab, setActiveTab] = useState('lyrics');
    const [isMelodyPlaying, setIsMelodyPlaying] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const TABS = useMemo(() => [
        { id: 'lyrics', title: 'Letra e Cifras' },
        { id: 'instruments', title: 'Instrumentos' },
        { id: 'structure', title: 'Estrutura' },
        { id: 'study', title: 'Estudo' },
        { id: 'tuner', title: 'Afinador' },
        result.sources && result.sources.length > 0 && { id: 'sources', title: 'Fontes' }
    ].filter(Boolean) as { id: string; title: string }[], [result.sources]);
    
    // Lifted tuning state
    const instrumentType = useMemo(() => getInstrumentType(selectedInstrument?.instrument), [selectedInstrument]);
    const preferredTuning = instrumentType === 'bass' ? settings.preferredBassTuning : settings.preferredGuitarTuning;
    const availableTunings = TUNINGS[instrumentType];
    const [tuningName, setTuningName] = useState(preferredTuning);
    
    // When instrument changes, reset the tuning to its preferred default
    useEffect(() => {
        const newInstrumentType = getInstrumentType(selectedInstrument?.instrument);
        const newPreferredTuning = newInstrumentType === 'bass' ? settings.preferredBassTuning : settings.preferredGuitarTuning;
        setTuningName(newPreferredTuning);
    }, [selectedInstrument, settings.preferredBassTuning, settings.preferredGuitarTuning]);

    const currentTuning = (availableTunings as Record<string, string[]>)[tuningName];
    const uniqueChords = useMemo(() => [...new Set(result.chords ?? [])], [result.chords]);

    const audioContextRef = useRef<AudioContext | null>(null);
    const decodedAudioCache = useRef<Map<string, AudioBuffer>>(new Map());
    const activePreviewSource = useRef<AudioBufferSourceNode | null>(null);

    // Keyboard shortcuts handler
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Don't trigger shortcuts if user is typing in an input, select, or textarea
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
                return;
            }

            // Play/Pause melody with spacebar
            if (event.code === 'Space' && result.mainMelodyAudio) {
                event.preventDefault();
                setIsMelodyPlaying(prev => !prev);
            }

            // Switch tabs with numbers 1-6
            if (['1', '2', '3', '4', '5', '6'].includes(event.key)) {
                event.preventDefault();
                const tabIndex = parseInt(event.key, 10) - 1;
                if (TABS[tabIndex]) {
                    setActiveTab(TABS[tabIndex].id);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [TABS, result.mainMelodyAudio]);


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
                                className="font-bold text-cyan-600 dark:text-cyan-400 cursor-pointer transition-all hover:text-white hover:bg-cyan-500/20 dark:hover:bg-cyan-500/10 rounded-md px-1 relative -top-4 inline-block mx-1 transform active:scale-95"
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
    const [playingSectionIndex, setPlayingSectionIndex] = useState<number | null>(null);
    const [activeChordNotes, setActiveChordNotes] = useState<string[]>([]);

    const stopSequence = useCallback(() => {
        if (sequenceTimeoutRef.current) {
            clearTimeout(sequenceTimeoutRef.current);
            sequenceTimeoutRef.current = null;
        }
        setPlayingSectionIndex(null);
        setActiveChordIndex(null);
        setActiveChordNotes([]);
    }, []);

    const handlePlaySequence = useCallback((chords: string[], sectionIndex: number) => {
        if (playingSectionIndex === sectionIndex) {
            stopSequence();
            return;
        }

        const context = getAudioContext();
        if (!context || !currentBpm || currentBpm <= 0) return;
        
        stopSequence();
        setPlayingSectionIndex(sectionIndex);

        const interval = (60 / currentBpm) * 1000;
        let index = 0;

        const playNextChord = () => {
            if (index >= chords.length) {
                stopSequence();
                return;
            }
            
            const chord = chords[index];
            const notes = parseChord(chord);
            setActiveChordNotes(notes);
            setActiveChordIndex(index);
            setHoveredChord(chord);
            
            playChord(notes, context);
            playMetronomeClick(context);

            index++;
            sequenceTimeoutRef.current = window.setTimeout(playNextChord, interval);
        };

        playNextChord();
    }, [playingSectionIndex, stopSequence, getAudioContext, currentBpm]);
    
    useEffect(() => {
        return () => stopSequence();
    }, [stopSequence]);

    const handleDownloadTab = (instrument: InstrumentStem) => {
        if (!instrument.tablature) return;
        const blob = new Blob([instrument.tablature], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = (result.songTitle || 'Untitled_Track').replace(/ /g, '_');
        a.download = `${fileName}_${instrument.instrument}_Tab.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExportMix = async () => {
        if (isExporting) return;
        setIsExporting(true);

        try {
            const audioSourcesB64 = [
                result.mainMelodyAudio,
                ...result.instrumentStems.map(stem => stem.audio)
            ].filter((audio): audio is string => !!audio);

            if (audioSourcesB64.length === 0) {
                console.warn("No audio sources to export.");
                return;
            }

            const context = getAudioContext();
            if (!context) {
                throw new Error("AudioContext not available.");
            }
            
            const decodedBuffers = await Promise.all(
                audioSourcesB64.map(async b64 => {
                    const decodedBytes = decodeBase64(b64);
                    return decodePcmAudioData(decodedBytes, context, 24000, 1);
                })
            );
            
            const maxLength = Math.max(...decodedBuffers.map(b => b.length));
            const offlineCtx = new OfflineAudioContext(1, maxLength, 24000);
            
            decodedBuffers.forEach(buffer => {
                const source = offlineCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(offlineCtx.destination);
                source.start(0);
            });
            
            const mixedBuffer = await offlineCtx.startRendering();
            
            const channelData = mixedBuffer.getChannelData(0);
            const pcmData = new Int16Array(channelData.length);
            for (let i = 0; i < channelData.length; i++) {
                const sample = Math.max(-1, Math.min(1, channelData[i])); // Clamp
                pcmData[i] = sample < 0 ? sample * 32768 : sample * 32767;
            }
            
            const wavBlob = encodeWav(pcmData, 24000, 1);
            
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            const fileName = (result.songTitle || 'Untitled_Track').replace(/ /g, '_');
            a.download = `${fileName}_Mix.wav`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error("Failed to export audio mix:", error);
        } finally {
            setIsExporting(false);
        }
    };


    return (
        <div className="animate-fade-in space-y-8">
            <header className="text-center">
                <h2 className="text-4xl sm:text-5xl font-teko font-bold tracking-wider text-gray-900 dark:text-white uppercase">{result.songTitle}</h2>
                <p className="text-xl text-gray-600 dark:text-gray-400">{result.artist}</p>
            </header>

            <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-300 dark:border-gray-700">
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">{result.summary}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="bg-gray-200/50 dark:bg-gray-900/50 p-4 rounded-lg">
                        <p className="text-sm text-cyan-700 dark:text-cyan-400 font-bold uppercase tracking-wider">Tonalidade</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">{result.key}</p>
                    </div>
                     <div className="bg-gray-200/50 dark:bg-gray-900/50 p-4 rounded-lg col-span-2">
                        <p className="text-sm text-cyan-700 dark:text-cyan-400 font-bold uppercase tracking-wider">Tempo (BPM)</p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                             <input 
                                type="range" 
                                min={Math.max(20, result.bpm - 50)} 
                                max={result.bpm + 50}
                                value={currentBpm}
                                onChange={(e) => setCurrentBpm(Number(e.target.value))}
                                className="w-full h-2 bg-gray-400 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                             />
                             <p className="text-2xl font-semibold text-gray-900 dark:text-white w-24 text-right">{currentBpm} <span className="text-base font-normal">BPM</span></p>
                        </div>
                    </div>
                     <div className="bg-gray-200/50 dark:bg-gray-900/50 p-4 rounded-lg">
                        <p className="text-sm text-cyan-700 dark:text-cyan-400 font-bold uppercase tracking-wider">Compasso</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">{result.timeSignature}</p>
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
            
            {result.mainMelodyAudio && (
                <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-300 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white font-teko uppercase tracking-wider">Melodia Principal (Atalho: Barra de Espaço)</h3>
                        <button
                            onClick={handleExportMix}
                            disabled={isExporting}
                            className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-bold py-2 px-3 rounded-md transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Exportar mix completo como .WAV"
                        >
                            <ExportIcon className="w-4 h-4" />
                            <span>{isExporting ? 'Exportando...' : 'Exportar Mix'}</span>
                        </button>
                    </div>
                    <SongPlayer
                        audioBase64={result.mainMelodyAudio}
                        isPlaying={isMelodyPlaying}
                        onTogglePlay={() => setIsMelodyPlaying(p => !p)}
                        onPlaybackEnd={() => setIsMelodyPlaying(false)}
                    />
                </div>
            )}

            <div>
                 <div className="border-b border-gray-300 dark:border-gray-700">
                    <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto" aria-label="Tabs">
                        {TABS.map((tab, index) => (
                             <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center whitespace-nowrap py-3 px-2 sm:px-4 border-b-2 font-bold uppercase tracking-wider text-sm sm:text-base transition-colors focus:outline-none ${
                                    activeTab === tab.id
                                        ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400'
                                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-gray-500'
                                }`}
                            >
                                {tab.title}
                                <span className="ml-2 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs font-mono rounded-full px-1.5 py-0.5 leading-none">
                                    {index + 1}
                                </span>
                            </button>
                        ))}
                    </nav>
                </div>
                
                <div className="mt-6 bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg p-4 md:p-6 text-gray-700 dark:text-gray-300 min-h-[300px]">
                    {activeTab === 'lyrics' && (
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
                    )}
                    
                    {activeTab === 'instruments' && (
                        <div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {(result.instrumentStems ?? []).map((stem) => (
                                    <button
                                        key={stem.instrument}
                                        onClick={() => handleInstrumentSelect(stem)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 transform active:scale-95 ${selectedInstrument?.instrument === stem.instrument ? 'bg-cyan-500/20 border-cyan-500 text-gray-900 dark:text-white' : 'bg-gray-200/50 dark:bg-gray-700/50 border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50 hover:border-gray-500 dark:hover:border-gray-500'}`}
                                    >
                                        {renderInstrumentIcon(stem.instrument)}
                                        <span className="font-semibold">{stem.instrument}</span>
                                    </button>
                                ))}
                            </div>
                            {selectedInstrument && (
                                <div className="bg-gray-200/40 dark:bg-gray-900/40 p-4 rounded-lg border border-gray-300 dark:border-gray-700 animate-fade-in">
                                    <div className="grid md:grid-cols-2 md:gap-x-8 gap-y-6">
                                        {/* Coluna Esquerda: Áudio e Descrição */}
                                        <div className="space-y-4">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{selectedInstrument.description}</p>
                                            {selectedInstrument.audio ? (
                                                <StemPlayer instrumentName={selectedInstrument.instrument} audioBase64={selectedInstrument.audio} />
                                            ) : (
                                                <p className="text-gray-500 text-sm">Áudio indisponível para este instrumento.</p>
                                            )}
                                            {currentTuning && (
                                                <div>
                                                    <h6 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Afinação Atual ({tuningName})</h6>
                                                    <div className="flex items-center justify-around bg-gray-300/50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-400 dark:border-gray-700">
                                                        {[...currentTuning].reverse().map((note, index) => (
                                                            <div key={index} className="text-center">
                                                                <span className="font-mono text-xl font-bold text-gray-900 dark:text-white">{note}</span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 block">{index + 1}ª</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Coluna Direita: Tablatura e Cifras */}
                                        <div className="space-y-4">
                                            {selectedInstrument.tablature && (
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <h6 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tablatura / Padrão Rítmico</h6>
                                                        <button onClick={() => handleDownloadTab(selectedInstrument)} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition transform active:scale-95">
                                                            <DownloadIcon className="w-4 h-4" />
                                                            <span>Baixar</span>
                                                        </button>
                                                    </div>
                                                    <pre className="text-sm text-gray-800 dark:text-gray-300 whitespace-pre-wrap font-mono mt-1 bg-gray-200 dark:bg-gray-800 p-3 rounded-md">{selectedInstrument.tablature}</pre>
                                                </div>
                                            )}
                                            <div>
                                                <h4 className="font-bold text-lg text-cyan-700 dark:text-cyan-400 mb-3">Acordes da Música</h4>
                                                <div className="flex flex-wrap gap-x-4 gap-y-6 justify-center sm:justify-start p-2 bg-gray-200 dark:bg-gray-800 rounded-md">
                                                    {uniqueChords.length > 0 ? uniqueChords.map((chord, index) => (
                                                        <ChordDiagram key={index} chordName={chord} tuning={currentTuning} />
                                                    )) : <p className="text-gray-500 w-full text-center">Nenhuma cifra principal para exibir.</p>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'structure' && (
                        <>
                            <div className="space-y-4">
                                {(result.sections ?? []).map((section: SongSection, index: number) => (
                                    <div key={index} className="bg-gray-200/40 dark:bg-gray-900/40 p-4 rounded-lg border border-gray-300 dark:border-gray-700 transition-all hover:border-cyan-600 dark:hover:border-cyan-700 hover:shadow-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-teko font-bold text-cyan-700 dark:text-cyan-400 text-2xl uppercase tracking-wider">{section.part}</h4>
                                                <p className="text-gray-700 dark:text-gray-300 mt-1 mb-3">{section.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => handlePlaySequence(section.chords, index)}
                                                    className="p-2 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-cyan-500 text-cyan-700 dark:text-cyan-400 hover:text-white transition-all transform active:scale-90"
                                                    title={playingSectionIndex === index ? "Parar sequência" : "Tocar sequência de acordes"}
                                                >
                                                    <MusicIcon className={`w-5 h-5 ${playingSectionIndex === index ? 'animate-subtle-pulse' : ''}`} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="border-t border-gray-300 dark:border-gray-700 pt-3 mt-3">
                                            <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Acordes da Seção</h5>
                                            <div className="flex flex-wrap gap-2">
                                                {section.chords.map((chord, i) => (
                                                    <button 
                                                        key={i} 
                                                        onMouseEnter={() => handleChordHover(chord)}
                                                        onMouseLeave={() => handleChordHover(null)}
                                                        onClick={() => handleChordClick(chord)}
                                                        className={`font-mono text-sm px-2 py-1 rounded transition-colors ${activeChordIndex === i && playingSectionIndex === index ? 'bg-cyan-500 text-white animate-subtle-pulse' : 'bg-gray-300 dark:bg-gray-800 text-cyan-800 dark:text-cyan-300 hover:bg-cyan-500 hover:text-white'}`}
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
                            <div className="mt-8 pt-4 border-t border-gray-300 dark:border-gray-700">
                                <h4 className="font-teko font-bold text-xl text-center text-cyan-700 dark:text-cyan-400 uppercase tracking-wider mb-3">Teclado Virtual</h4>
                                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    As notas do acorde tocado na sequência serão destacadas aqui.
                                </p>
                                <VirtualKeyboard highlightedNotes={activeChordNotes} />
                            </div>
                        </>
                    )}

                    {activeTab === 'study' && (
                         <StudyMaterials 
                            result={result} 
                            selectedInstrument={selectedInstrument} 
                            tuningName={tuningName} 
                            setTuningName={setTuningName}
                         />
                    )}

                    {activeTab === 'tuner' && (
                        <InstrumentTuner 
                            initialInstrumentType={instrumentType}
                        />
                    )}

                    {activeTab === 'sources' && (
                        <ul className="space-y-2">
                            {result.sources.map((source: Source, index: number) => (
                                <li key={index}>
                                    <a
                                        href={source.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 hover:underline transition group"
                                    >
                                        <LinkIcon className="w-4 h-4 flex-shrink-0" />
                                        <span className="truncate" title={source.title}>{source.title}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};