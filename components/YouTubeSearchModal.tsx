import React, { useState } from 'react';
import { searchYouTube } from '../services/geminiService.js';
import type { YouTubeVideo } from '../types.js';
import { XCircleIcon } from './icons/XCircleIcon.js';
import { LoadingSpinner } from './LoadingSpinner.js';

interface YouTubeSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (video: YouTubeVideo) => void;
}

export const YouTubeSearchModal: React.FC<YouTubeSearchModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<YouTubeVideo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults([]);

        try {
            const searchResults = await searchYouTube(query);
            setResults(searchResults);
            if(searchResults.length === 0) {
                setError("Nenhum resultado encontrado. Tente uma busca diferente.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectVideo = (video: YouTubeVideo) => {
        onSelect(video);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="youtube-search-title"
        >
            <div
                className="bg-gray-800 border border-gray-700 text-white rounded-xl shadow-2xl w-full max-w-2xl animate-fade-in flex flex-col"
                style={{ height: 'clamp(300px, 90vh, 700px)' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700 flex-shrink-0">
                    <h2 id="youtube-search-title" className="text-2xl font-teko font-bold tracking-wider uppercase">
                        Buscar no YouTube
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700 transition" aria-label="Fechar busca">
                        <XCircleIcon className="w-6 h-6 text-gray-400 hover:text-white" />
                    </button>
                </div>
                <div className="p-4 flex-shrink-0">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ex: Queen Bohemian Rhapsody"
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-md transition-all duration-200 disabled:bg-gray-600 flex-shrink-0"
                            disabled={isLoading || !query.trim()}
                        >
                            {isLoading ? '...' : 'Buscar'}
                        </button>
                    </form>
                </div>
                <div className="overflow-y-auto p-4 space-y-3 flex-grow">
                    {isLoading && <LoadingSpinner text="Buscando vídeos..." />}
                    {error && !isLoading && <div className="text-center text-red-400 p-4">{error}</div>}
                    {!isLoading && results.length > 0 && (
                        <ul className="space-y-3">
                            {results.map((video) => (
                                <li key={video.videoId}>
                                    <button
                                        onClick={() => handleSelectVideo(video)}
                                        className="w-full flex items-center gap-4 text-left p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700/80 transition-all border border-transparent hover:border-cyan-500"
                                    >
                                        <img src={video.thumbnailUrl} alt={video.title} className="w-32 h-18 object-cover rounded-md flex-shrink-0" />
                                        <div className="flex flex-col">
                                            <p className="font-bold text-white line-clamp-2">{video.title}</p>
                                            <p className="text-sm text-gray-400 mt-1">{video.channelName}</p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};
