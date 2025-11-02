import React, { useState } from 'react';
import { AnalysisDisplay } from './components/AnalysisDisplay.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import { analyzeMusicTrack, analyzeAudioFile, parseVideoTitle } from './services/geminiService.js';
import { XCircleIcon } from './components/icons/XCircleIcon.js';
import { GearIcon } from './components/icons/GearIcon.js';
import { SettingsModal } from './components/SettingsModal.js';
import { YouTubeIcon } from './components/icons/YouTubeIcon.js';
import { YouTubeSearchModal } from './components/YouTubeSearchModal.js';
import type { YouTubeVideo } from './types.js';


function App() {
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isYouTubeSearchOpen, setIsYouTubeSearchOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setAudioFile(file);
          setSong('');
          setArtist('');
          setError(null);
      }
  };

  const clearFile = () => {
    setAudioFile(null);
    const fileInput = document.getElementById('audio-upload') as HTMLInputElement;
    if(fileInput) fileInput.value = ''; // Reset file input
  }

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!audioFile && (!song.trim() || !artist.trim())) {
      setError('Por favor, insira uma música e artista, ou envie um arquivo de áudio.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = audioFile 
        ? await analyzeAudioFile(audioFile)
        : await analyzeMusicTrack(song, artist);
      setAnalysis(result);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido durante a análise.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleYouTubeSelect = async (video: YouTubeVideo) => {
      setIsLoading(true);
      setError(null);
      try {
          const { song, artist } = await parseVideoTitle(video.title);
          setSong(song);
          setArtist(artist);
      } catch(err) {
          setError(err instanceof Error ? err.message : "Não foi possível processar o vídeo selecionado.");
          // Fallback to just using the title if parsing fails
          setSong(video.title);
          setArtist('');
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <>
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <YouTubeSearchModal 
        isOpen={isYouTubeSearchOpen}
        onClose={() => setIsYouTubeSearchOpen(false)}
        onSelect={handleYouTubeSelect}
      />
      <div className="min-h-screen font-sans p-4 sm:p-8 selection:bg-cyan-500/30">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8 relative">
              <h1 className="text-5xl sm:text-6xl font-teko font-bold tracking-wider text-gray-900 dark:text-white uppercase">Maestro de IA</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Desvende a genialidade por trás de suas músicas favoritas.</p>
               <button 
                  onClick={() => setIsSettingsOpen(true)}
                  className="absolute top-0 right-0 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                  aria-label="Abrir configurações"
              >
                  <GearIcon className="w-6 h-6" />
              </button>
          </header>

          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8 border border-gray-300 dark:border-gray-700">
              <form onSubmit={handleAnalyze}>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <input
                          type="text"
                          value={song}
                          onChange={(e) => setSong(e.target.value)}
                          placeholder="Nome da Música (ex: Garota de Ipanema)"
                          className="w-full sm:w-1/2 bg-gray-200/50 dark:bg-gray-900/50 border border-gray-400 dark:border-gray-600 rounded-md px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition disabled:bg-gray-300/50 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed"
                          disabled={isLoading || !!audioFile}
                      />
                      <input
                          type="text"
                          value={artist}
                          onChange={(e) => setArtist(e.target.value)}
                          placeholder="Nome do Artista (ex: Tom Jobim)"
                          className="w-full sm:w-1/2 bg-gray-200/50 dark:bg-gray-900/50 border border-gray-400 dark:border-gray-600 rounded-md px-4 py-2 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition disabled:bg-gray-300/50 dark:disabled:bg-gray-700/50 disabled:cursor-not-allowed"
                          disabled={isLoading || !!audioFile}
                      />
                  </div>

                  <div className="flex items-center my-4">
                    <div className="flex-grow border-t border-gray-400 dark:border-gray-600"></div>
                    <span className="flex-shrink mx-4 text-gray-500 text-sm">OU</span>
                    <div className="flex-grow border-t border-gray-400 dark:border-gray-600"></div>
                  </div>
                  
                  <div className="space-y-4">
                      <button
                          type="button"
                          onClick={() => setIsYouTubeSearchOpen(true)}
                          disabled={isLoading || !!audioFile}
                          className="w-full flex items-center justify-center gap-3 bg-gray-200/50 dark:bg-gray-900/50 border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-md px-4 py-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:border-red-500 hover:text-red-500 dark:hover:text-red-400 transition disabled:cursor-not-allowed disabled:opacity-50"
                      >
                          <YouTubeIcon className="w-6 h-6 text-red-600 dark:text-red-500" />
                          <span>Buscar música no YouTube</span>
                      </button>

                      {audioFile ? (
                        <div className="flex items-center justify-between bg-gray-200/50 dark:bg-gray-900/50 border border-gray-400 dark:border-gray-600 rounded-md px-4 py-2 text-cyan-600 dark:text-cyan-400 animate-fade-in">
                              <span className="truncate" title={audioFile.name}>{audioFile.name}</span>
                              <button type="button" onClick={clearFile} disabled={isLoading} className="ml-2 p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-700 transition">
                                  <XCircleIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white" />
                              </button>
                          </div>
                      ) : (
                          <label htmlFor="audio-upload" className="w-full text-center block bg-gray-200/50 dark:bg-gray-900/50 border-2 border-dashed border-gray-400 dark:border-gray-600 rounded-md px-4 py-3 text-gray-500 dark:text-gray-400 cursor-pointer hover:border-cyan-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition">
                              <span>Clique para enviar um arquivo de áudio</span>
                              <input id="audio-upload" type="file" className="hidden" onChange={handleFileChange} accept="audio/*" disabled={isLoading} />
                          </label>
                      )}
                  </div>


                  <button
                      type="submit"
                      className="w-full mt-6 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-md transition-all duration-200 disabled:bg-gray-500 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0 transform active:scale-95"
                      disabled={isLoading}
                  >
                      {isLoading ? 'Analisando...' : 'Analisar'}
                  </button>
              </form>
          </div>

          {error && <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg text-center mb-8">{error}</div>}

          {isLoading && <LoadingSpinner />}

          {analysis && <AnalysisDisplay result={analysis} />}

          {!isLoading && !analysis && !error && (
            <div className="text-center text-gray-500 py-16">
              <p>Digite uma música e um artista ou envie um arquivo para começar.</p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default App;