import React, { useState, useRef, useEffect, useCallback } from 'react';
import { decodeBase64, decodePcmAudioData, encodeWav } from '../utils/audioUtils.js';
import { PlayIcon } from './icons/PlayIcon.js';
import { PauseIcon } from './icons/PauseIcon.js';
import { LoopIcon } from './icons/LoopIcon.js';
import { VolumeUpIcon } from './icons/VolumeUpIcon.js';
import { VolumeMuteIcon } from './icons/VolumeMuteIcon.js';
import { DownloadIcon } from './icons/DownloadIcon.js';
import { SpeedIcon } from './icons/SpeedIcon.js';
import { WaveformVisualizer } from './WaveformVisualizer.js';

const SAMPLE_RATE = 24000; // Gemini TTS standard sample rate

export const StemPlayer = ({ instrumentName, audioBase64 }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLooping, setIsLooping] = useState(false);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playbackRate, setPlaybackRate] = useState(1);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    
    useEffect(() => {
        let isActive = true;
        const setupAudio = async () => {
            try {
                if (!audioBase64) return;
                
                // FIX: Cast window to any to access vendor-prefixed webkitAudioContext
                const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
                if (!AudioCtor) {
                    throw new Error("Web Audio API is not supported by this browser.");
                }

                if (!audioContextRef.current) {
                    audioContextRef.current = new AudioCtor({ sampleRate: SAMPLE_RATE });
                }
                const context = audioContextRef.current;
                
                const decodedBytes = decodeBase64(audioBase64);
                const buffer = await decodePcmAudioData(decodedBytes, context, SAMPLE_RATE, 1);
                
                if (isActive) {
                    audioBufferRef.current = buffer;
                    if (!gainNodeRef.current) {
                        gainNodeRef.current = context.createGain();
                        gainNodeRef.current.connect(context.destination);
                    }
                    if (!analyserNodeRef.current) {
                        analyserNodeRef.current = context.createAnalyser();
                    }
                    setIsReady(true);
                    setError(null);
                }
            } catch (err) {
                console.error("Failed to setup audio:", err);
                if (isActive) setError("Não foi possível carregar o áudio.");
            }
        };

        setupAudio();

        return () => {
            isActive = false;
            if (sourceNodeRef.current) {
                sourceNodeRef.current.stop();
                sourceNodeRef.current.disconnect();
            }
        };
    }, [audioBase64]);

    const play = useCallback(() => {
        if (!audioBufferRef.current || !audioContextRef.current || !gainNodeRef.current || !analyserNodeRef.current) return;
        
        // Resume context if it's suspended
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(analyserNodeRef.current);
        analyserNodeRef.current.connect(gainNodeRef.current);
        source.loop = isLooping;
        source.playbackRate.value = playbackRate;
        
        source.onended = () => {
            if (sourceNodeRef.current === source) {
                 setIsPlaying(false);
            }
        };

        source.start(0);
        sourceNodeRef.current = source;
        setIsPlaying(true);
    }, [isLooping, playbackRate]);

    const stop = useCallback(() => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }
        setIsPlaying(false);
    }, []);

    const handleTogglePlay = () => {
        if (isPlaying) {
            stop();
        } else {
            play();
        }
    };

    const handleToggleLoop = () => {
        const newLoopingState = !isLooping;
        setIsLooping(newLoopingState);
        if (sourceNodeRef.current) {
            sourceNodeRef.current.loop = newLoopingState;
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.setValueAtTime(newVolume, audioContextRef.current?.currentTime ?? 0);
        }
        if (newVolume > 0) setIsMuted(false);
    };
    
    const handleToggleMute = () => {
        const currentlyMuted = isMuted;
        if(gainNodeRef.current){
           gainNodeRef.current.gain.setValueAtTime(currentlyMuted ? volume : 0, audioContextRef.current?.currentTime ?? 0);
        }
        setIsMuted(!currentlyMuted);
    }
    
    const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newRate = parseFloat(e.target.value);
        setPlaybackRate(newRate);
        if (sourceNodeRef.current) {
            sourceNodeRef.current.playbackRate.value = newRate;
        }
    };

    const handleDownload = useCallback(() => {
        if (!audioBase64 || !instrumentName) return;

        try {
            const pcmBytes = decodeBase64(audioBase64);
            // The PCM data is 16-bit signed integers.
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            
            const wavBlob = encodeWav(pcmInt16, SAMPLE_RATE, 1);
            
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${instrumentName.replace(/ /g, '_')}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error("Failed to create download file:", err);
            setError("Falha ao preparar o arquivo para download.");
        }
    }, [audioBase64, instrumentName]);
    
    if (error) return <p className="text-red-400 text-sm">{error}</p>;
    if (!isReady) return <p className="text-gray-500 text-sm">Carregando áudio do instrumento...</p>;

    return (
        <div className="bg-gray-300/50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-400 dark:border-gray-700 space-y-2">
            <WaveformVisualizer analyserNode={analyserNodeRef.current} isPlaying={isPlaying} />
            <div className="flex items-center gap-3">
                <button onClick={handleTogglePlay} className="text-cyan-600 dark:text-cyan-400 hover:text-gray-900 dark:hover:text-white transition" title={isPlaying ? 'Pausar' : 'Tocar'}>
                    {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                </button>
                <button onClick={handleToggleLoop} className={`${isLooping ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-500'} hover:text-gray-900 dark:hover:text-white transition`} title="Repetir (Loop)">
                    <LoopIcon className="w-5 h-5" />
                </button>
                <button onClick={handleToggleMute} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition" title={isMuted ? 'Ativar Som' : 'Silenciar'}>
                    {isMuted || volume === 0 ? <VolumeMuteIcon className="w-5 h-5"/> : <VolumeUpIcon className="w-5 h-5"/>}
                </button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full flex-1 h-2 bg-gray-400 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">{`${Math.round((isMuted ? 0 : volume) * 100)}%`}</span>
                <button onClick={handleDownload} className="text-gray-600 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition" title="Baixar Áudio">
                    <DownloadIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex items-center gap-3">
                <SpeedIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={playbackRate}
                    onChange={handlePlaybackRateChange}
                    className="w-full flex-1 h-2 bg-gray-400 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">{`${playbackRate.toFixed(2)}x`}</span>
            </div>
        </div>
    );
};
