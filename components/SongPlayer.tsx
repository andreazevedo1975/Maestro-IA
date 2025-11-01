import React, { useState, useRef, useEffect, useCallback } from 'react';
import { decodeBase64, decodePcmAudioData } from '../utils/audioUtils.js';
import { PlayIcon } from './icons/PlayIcon.js';
import { StopIcon } from './icons/StopIcon.js';
import { SpeedIcon } from './icons/SpeedIcon.js';

const SAMPLE_RATE = 24000; // Gemini TTS standard sample rate

export const SongPlayer = ({ audioBase64 }: { audioBase64: string }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [playbackRate, setPlaybackRate] = useState(1);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    
    useEffect(() => {
        let isActive = true;
        const setupAudio = async () => {
            try {
                if (!audioBase64) return;

                // FIX: Cast window to 'any' to access vendor-prefixed webkitAudioContext for broader browser support.
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
            if (sourceNodeRef.current) {
                try {
                    sourceNodeRef.current.stop();
                } catch (e) {
                    // Ignore error if stop() is called on an already stopped source
                }
                sourceNodeRef.current.disconnect();
            }
        };
    }, [audioBase64]);

    const play = useCallback(() => {
        if (!audioBufferRef.current || !audioContextRef.current) return;
        
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
        source.connect(audioContextRef.current.destination);
        source.playbackRate.value = playbackRate;
        
        source.onended = () => {
            if (sourceNodeRef.current === source) {
                 setIsPlaying(false);
                 sourceNodeRef.current = null;
            }
        };

        source.start(0);
        sourceNodeRef.current = source;
        setIsPlaying(true);
    }, [playbackRate]);

    const stop = useCallback(() => {
        if (sourceNodeRef.current) {
            try {
                sourceNodeRef.current.stop();
            } catch (e) {
                // onended will handle state changes
            }
        }
    }, []);

    const handleTogglePlay = () => {
        if (isPlaying) {
            stop();
        } else {
            play();
        }
    };
    
    const handlePlaybackRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newRate = parseFloat(e.target.value);
        setPlaybackRate(newRate);
        if (sourceNodeRef.current) {
            sourceNodeRef.current.playbackRate.value = newRate;
        }
    };

    if (error) return <p className="text-red-400 text-sm">{error}</p>;
    if (!isReady) return <p className="text-gray-500 text-sm">Carregando melodia...</p>;

    return (
        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 space-y-3">
            <div className="flex items-center justify-center">
                <button 
                    onClick={handleTogglePlay} 
                    className="text-cyan-400 hover:text-white transition p-2 rounded-full bg-gray-700 hover:bg-gray-600" 
                    title={isPlaying ? 'Parar' : 'Tocar Melodia'}
                >
                    {isPlaying ? <StopIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8" />}
                </button>
            </div>
            <div className="flex items-center gap-2">
                 <SpeedIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                 <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={playbackRate}
                    onChange={handlePlaybackRateChange}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <span className="text-xs text-gray-400 w-10 text-right">{`${playbackRate.toFixed(2)}x`}</span>
            </div>
        </div>
    );
};