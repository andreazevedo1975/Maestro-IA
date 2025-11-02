import React, { useRef, useEffect } from 'react';

interface WaveformVisualizerProps {
    analyserNode: AnalyserNode | null;
    isPlaying: boolean;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ analyserNode, isPlaying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameIdRef = useRef<number | null>(null);

    // Effect for drawing the waveform
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !analyserNode) return;

        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        analyserNode.fftSize = 2048;
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const drawWaveform = () => {
            if (!isPlaying || !analyserNode) {
                if (animationFrameIdRef.current) {
                    cancelAnimationFrame(animationFrameIdRef.current);
                    animationFrameIdRef.current = null;
                }
                 // Clear canvas when not playing
                 const { width, height } = canvas.getBoundingClientRect();
                 canvasCtx.clearRect(0, 0, width, height);
                return;
            }

            animationFrameIdRef.current = requestAnimationFrame(drawWaveform);
            analyserNode.getByteTimeDomainData(dataArray);
            
            const { width, height } = canvas.getBoundingClientRect();
            canvasCtx.clearRect(0, 0, width, height);
            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = 'rgb(6 182 212)'; // Tailwind's cyan-500

            canvasCtx.beginPath();

            const sliceWidth = (width * 1.0) / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0; // value is between 0 and 2
                const y = (v * height) / 2;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(width, height / 2);
            canvasCtx.stroke();
        };
        
        drawWaveform();

        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
        };

    }, [analyserNode, isPlaying]);
    
    // Effect for handling canvas resizing
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeObserver = new ResizeObserver(() => {
            const { width, height } = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            const ctx = canvas.getContext('2d');
            ctx?.scale(dpr, dpr);
        });

        resizeObserver.observe(canvas);
        return () => resizeObserver.disconnect();
    }, []);

    return <canvas ref={canvasRef} className="w-full h-16 rounded bg-black/10 dark:bg-white/5"></canvas>;
};
