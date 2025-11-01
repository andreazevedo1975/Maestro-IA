import React from 'react';
import { useSettings, TUNINGS, AppSettings } from '../contexts/SettingsContext.js';
import { XCircleIcon } from './icons/XCircleIcon.js';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const { settings, updateSettings } = useSettings();

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let processedValue: string | number | null = value;
        if (type === 'number') {
            processedValue = value === '' ? null : parseInt(value, 10);
        }

        updateSettings({ [name]: processedValue } as Partial<AppSettings>);
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
        >
            <div 
                className="bg-gray-800 border border-gray-700 text-white rounded-xl shadow-2xl w-full max-w-lg animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 id="settings-title" className="text-2xl font-teko font-bold tracking-wider uppercase">
                        Configurações
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700 transition" aria-label="Fechar configurações">
                        <XCircleIcon className="w-6 h-6 text-gray-400 hover:text-white" />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    {/* Theme Setting */}
                    <div>
                        <label htmlFor="theme" className="block text-sm font-medium text-gray-300 mb-2">Tema da Interface</label>
                        <select
                            id="theme"
                            name="theme"
                            value={settings.theme}
                            onChange={handleInputChange}
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                        >
                            <option value="dark">Escuro</option>
                            <option value="light">Claro</option>
                        </select>
                    </div>

                    {/* Default BPM Setting */}
                    <div>
                        <label htmlFor="defaultBpm" className="block text-sm font-medium text-gray-300 mb-2">BPM Padrão</label>
                        <input
                            type="number"
                            id="defaultBpm"
                            name="defaultBpm"
                            value={settings.defaultBpm ?? ''}
                            onChange={handleInputChange}
                            placeholder="Ex: 120 (deixe em branco para usar o da música)"
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                        />
                    </div>

                    {/* Preferred Guitar Tuning Setting */}
                    <div>
                        <label htmlFor="preferredGuitarTuning" className="block text-sm font-medium text-gray-300 mb-2">Afinação de Guitarra Preferida</label>
                        <select
                            id="preferredGuitarTuning"
                            name="preferredGuitarTuning"
                            value={settings.preferredGuitarTuning}
                            onChange={handleInputChange}
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                        >
                            {Object.keys(TUNINGS.guitar).map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Preferred Bass Tuning Setting */}
                    <div>
                        <label htmlFor="preferredBassTuning" className="block text-sm font-medium text-gray-300 mb-2">Afinação de Contrabaixo Preferida</label>
                        <select
                            id="preferredBassTuning"
                            name="preferredBassTuning"
                            value={settings.preferredBassTuning}
                            onChange={handleInputChange}
                            className="w-full bg-gray-900/50 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                        >
                            {Object.keys(TUNINGS.bass).map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                </div>
                 <div className="p-4 bg-gray-900/30 rounded-b-xl text-right">
                    <button 
                        onClick={onClose}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-md transition-all duration-200 transform active:scale-95"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};