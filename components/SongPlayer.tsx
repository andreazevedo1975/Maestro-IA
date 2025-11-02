import React, { useState, useRef, useEffect, useCallback } from 'react';
import { decodeBase64, decodePcmAudioData } from '../utils/audioUtils.js';
import { PlayIcon } from './icons/PlayIcon.js';
import { StopIcon } from './icons/StopIcon.js';
import { SpeedIcon } from './icons/SpeedIcon.js';
import { WaveformVisualizer } from './WaveformVisualizer.js';
import { VolumeUpIcon } from './icons/VolumeUpIcon.js';
import { VolumeMuteIcon } from './icons/VolumeMuteIcon.js';

const SAMPLE_RATE = 24000; // Gemini TTS standard sample rate

interface SongPlayerProps {
    audioBase64: string;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onPlaybackEnd: () => void;
}

export const SongPlayer = ({ audioBase64, isPlaying, onTogglePlay, onPlaybackEnd }: SongPlayerProps) => {
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

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

                const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
                if (!AudioCtor) {
                    throw new Error("Web Audio API is not supported by this browser.");
                }

                if (!audioContextRef.current) {
                    audioContextRef.current = new AudioCtor({ sampleRate: SAMPLE_RATE });
                }
                const context = audioContextRef.current;
                
                if (!gainNodeRef.current) {
                    gainNodeRef.current = context.createGain();
                    gainNodeRef.current.connect(context.destination);
                }
                if (!analyserNodeRef.current) {
                    analyserNodeRef.current = context.createAnalyser();
                }
                
                const decodedBytes = decodeBase64(audioBase64);
                const buffer = await decodePcmAudioData(decodedBytes, context, SAMPLE_RATE, 1);
                
                if (isActive) {
                    audioBufferRef.current = buffer;
                    setIsReady(true);
                    setError(null);
                }
            } catch (err) {
                console.error("Failed to setup audio for song:", err);
                if (isActive) setError("Não foi possível carregar a melodia.");
            }
        };

        setupAudio();

        return () => {
            isActive = false;
        };
    }, [audioBase64]);

    const play = useCallback(() => {
        if (!audioBufferRef.current || !audioContextRef.current || !analyserNodeRef.current || !gainNodeRef.current) return;
        
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
            } catch (e) {}
            sourceNodeRef.current.disconnect();
        }

        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(analyserNodeRef.current);
        analyserNodeRef.current.connect(gainNodeRef.current);
        source.playbackRate.value = playbackRate;
        
        source.onended = () => {
            if (sourceNodeRef.current === source) {
                onPlaybackEnd();
                sourceNodeRef.current = null;
            }
        };

        source.start(0);
        sourceNodeRef.current = source;
    }, [playbackRate, onPlaybackEnd]);

    const stop = useCallback(() => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.onended = null; // Prevent onended from firing on manual stop
            try {
                sourceNodeRef.current.stop();
            } catch (e) {
                // Ignore error if stop() is called on an already stopped source
            }
            sourceNodeRef.current.disconnect();
            sourceNodeRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (isPlaying && isReady) {
            play();
        } else {
            stop();
        }
    }, [isPlaying, isReady, play, stop]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stop();
        };
    }, [stop]);
    
    const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newRate = parseFloat(e.target.value);
        setPlaybackRate(newRate);
        if (sourceNodeRef.current) {
            sourceNodeRef.current.playbackRate.value = newRate;
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

    if (error) return <p className="text-red-400 text-sm">{error}</p>;
    if (!isReady) return <p className="text-gray-500 text-sm">Carregando melodia...</p>;

    return (
        <div className="bg-gray-200/50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-300 dark:border-gray-700 space-y-3">
            <WaveformVisualizer analyserNode={analyserNodeRef.current} isPlaying={isPlaying} />
            <div className="flex items-center justify-center">
                <button 
                    onClick={onTogglePlay} 
                    className="text-cyan-600 dark:text-cyan-400 hover:text-gray-900 dark:hover:text-white transition p-2 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-gray-400/50 dark:hover:bg-gray-600" 
                    title={isPlaying ? 'Parar' : 'Tocar Melodia'}
                >
                    {isPlaying ? <StopIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                </button>
            </div>
            <div className="flex items-center gap-2">
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
                    className="w-full h-2 bg-gray-400 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">{`${Math.round((isMuted ? 0 : volume) * 100)}%`}</span>
            </div>
            <div className="flex items-center gap-2">
                 <SpeedIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                 <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={playbackRate}
                    onChange={handlePlaybackRateChange}
                    className="w-full h-2 bg-gray-400 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-10 text-right">{`${playbackRate.toFixed(2)}x`}</span>
            </div>
        </div>
    );
};