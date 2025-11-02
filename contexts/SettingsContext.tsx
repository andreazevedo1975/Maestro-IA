import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Centralized tunings to be accessible by settings and components
export const TUNINGS = {
    guitar: {
        'Padrão (EADGBe)': ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
        'Drop D (DADGBe)': ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
        'Open G (DGDGBd)': ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
    },
    bass: {
        'Padrão (EADG)': ['E1', 'A1', 'D2', 'G2'],
        'Drop D (DADG)': ['D1', 'A1', 'D2', 'G2'],
    }
};

export type Theme = 'light' | 'dark';
export type GuitarTuning = keyof typeof TUNINGS.guitar;
export type BassTuning = keyof typeof TUNINGS.bass;

export interface AppSettings {
    theme: Theme;
    defaultBpm: number | null;
    preferredGuitarTuning: GuitarTuning;
    preferredBassTuning: BassTuning;
}

interface SettingsContextType {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
    theme: 'dark',
    defaultBpm: null,
    preferredGuitarTuning: 'Padrão (EADGBe)',
    preferredBassTuning: 'Padrão (EADG)',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// FIX: Updated component signature to use React.FC<React.PropsWithChildren> to resolve a TypeScript error where the 'children' prop was not being correctly inferred.
export const SettingsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            const storedSettings = localStorage.getItem('maestro-ia-settings');
            return storedSettings ? { ...defaultSettings, ...JSON.parse(storedSettings) } : defaultSettings;
        } catch (error) {
            console.error("Failed to parse settings from localStorage", error);
            return defaultSettings;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('maestro-ia-settings', JSON.stringify(settings));
        } catch (error) {
            console.error("Failed to save settings to localStorage", error);
        }
        
        // Apply theme to the root element
        if (settings.theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [settings]);

    const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
        setSettings(prev => ({...prev, ...newSettings}));
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
            {children}
        {/* FIX: Corrected typo in closing tag from Settings-Context.Provider to SettingsContext.Provider. */}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};