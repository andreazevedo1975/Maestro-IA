import React, { useState } from 'react';
import { AnalysisDisplay } from './components/AnalysisDisplay.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import { analyzeMusicTrack } from './services/geminiService.js';

function App() {
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!song.trim() || !artist.trim()) {
      setError('Por favor, insira o nome da música e do artista.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeMusicTrack(song, artist);
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

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans p-4 sm:p-8 selection:bg-cyan-500/30">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
            <h1 className="text-5xl sm:text-6xl font-teko font-bold tracking-wider text-white uppercase">Maestro de IA</h1>
            <p className="text-gray-400 mt-2">Desvende a genialidade por trás de suas músicas favoritas.</p>
        </header>

        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8 border border-gray-700">
            <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-4 items-center">
                <input
                    type="text"
                    value={song}
                    onChange={(e) => setSong(e.target.value)}
                    placeholder="Nome da Música (ex: Garota de Ipanema)"
                    className="w-full sm:w-1/2 bg-gray-900/50 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                    disabled={isLoading}
                />
                <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Nome do Artista (ex: Tom Jobim)"
                    className="w-full sm:w-1/2 bg-gray-900/50 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-md transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0"
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
            <p>Digite uma música e um artista para começar a análise musical.</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;