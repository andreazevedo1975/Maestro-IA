import React from 'react';
import type { AnalysisResult, InstrumentStem } from '../types.js';
import { getScaleNotes } from '../utils/musicTheoryUtils.js';
import { VirtualFretboard } from './VirtualFretboard.js';
import { VirtualKeyboard } from './VirtualKeyboard.js';

const generateStudySuggestions = (result: AnalysisResult) => {
    const suggestions: { category: string; title: string; description: string }[] = [];
    if (!result) return suggestions;
    
    // Use a Set to easily find unique chords
    const uniqueChords = result.chords ? [...new Set(result.chords)] : [];

    // 1. Key and Scale Practice
    if (result.key) {
        suggestions.push({
            category: 'Tonalidade e Escalas',
            title: `Pratique a Escala de ${result.key}`,
            description: `Familiarize-se com as notas da escala de ${result.key}. Tocar a escala para cima e para baixo ajuda a treinar o ouvido e a agilidade dos dedos, o que é fundamental para improvisar e entender a melodia da música.`
        });
    }

    // 2. Rhythm Practice
    if (result.bpm) {
         suggestions.push({
            category: 'Ritmo',
            title: `Prática com Metrônomo a ${result.bpm} BPM`,
            description: `Ajuste seu metrônomo para ${result.bpm} BPM. Pratique tocar os acordes ou a melodia principal no tempo correto para desenvolver sua precisão rítmica e senso de tempo.`
        });
    }

    // 3. Chord Progression Practice
    // Prioritize chorus, otherwise find first section with multiple chords, otherwise use main progression
    if (result.sections && result.sections.length > 0) {
        const chorus = result.sections.find(s => s.part.toLowerCase().includes('refrão')) 
                     || result.sections.find(s => s.chords.length > 1)
                     || result.sections[0];
                     
        if (chorus && chorus.chords.length > 1) {
             suggestions.push({
                category: 'Harmonia e Progressão',
                title: `Pratique a Progressão do ${chorus.part}`,
                description: `Concentre-se na transição suave entre os acordes da progressão: ${chorus.chords.join(' - ')}. Comece devagar, garantindo que cada acorde soe limpo antes de passar para o próximo. Aumente a velocidade gradualmente.`
            });
        }
    } else if (uniqueChords.length > 1) {
         suggestions.push({
            category: 'Harmonia e Progressão',
            title: `Prática de Troca de Acordes`,
            description: `Pratique a transição entre os acordes principais da música: ${uniqueChords.slice(0, 4).join(' - ')}. A repetição é a chave para trocas de acordes rápidas e precisas.`
        });
    }

    // 4. Individual Chord Study
    if (uniqueChords.length > 0) {
        suggestions.push({
            category: 'Técnica de Acordes',
            title: `Estudo dos Acordes Individuais`,
            description: `Para cada acorde da música (${uniqueChords.join(', ')}), pratique o seguinte:
- Monte o acorde e toque cada nota individualmente (arpejo) para verificar a clareza.
- Certifique-se de que seus dedos não estão abafando as cordas adjacentes.
- Memorize a forma do acorde para que você possa montá-lo rapidamente sem olhar.`
        });
    }

    return suggestions;
}

interface StudyMaterialsProps {
    result: AnalysisResult;
    selectedInstrument: InstrumentStem | null;
    tuningName: string;
    setTuningName: (name: string) => void;
}

export const StudyMaterials = ({ result, selectedInstrument, tuningName, setTuningName }: StudyMaterialsProps) => {
    const suggestions = React.useMemo(() => generateStudySuggestions(result), [result]);
    const scaleNotes = React.useMemo(() => result.key ? getScaleNotes(result.key) : [], [result.key]);

    if (!result) return null;

    return (
        <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                    <div key={index} className="bg-gray-200/40 dark:bg-gray-900/40 p-4 rounded-lg border border-gray-300 dark:border-gray-700">
                        <h4 className="font-bold text-cyan-700 dark:text-cyan-400 text-sm uppercase tracking-wider">{suggestion.category}</h4>
                        <h5 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{suggestion.title}</h5>
                        <p className="text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">{suggestion.description}</p>
                    </div>
                ))}
                {suggestions.length === 0 && <p>Nenhuma sugestão de estudo disponível.</p>}
            </div>
            
            <div className="space-y-6">
                {scaleNotes.length > 0 ? (
                    <>
                        <div>
                            <h4 className="font-teko font-bold text-xl text-center text-cyan-700 dark:text-cyan-400 uppercase tracking-wider mb-2">Escala de {result.key}</h4>
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Visualize as notas da escala nos instrumentos abaixo. A nota tônica (<span className="font-bold">{scaleNotes[0]}</span>) está em destaque.
                            </p>
                        </div>
                        <div>
                             <VirtualFretboard 
                                displayTitle={`Escala de ${result.key}`}
                                chordName={null}
                                highlightedNotes={scaleNotes} 
                                instrument={selectedInstrument} 
                                tuningName={tuningName}
                                setTuningName={setTuningName}
                            />
                        </div>
                        <div>
                            <VirtualKeyboard highlightedNotes={scaleNotes} />
                        </div>
                    </>
                ) : (
                    <div className="text-center text-gray-500 py-16">
                        <p>Nenhuma tonalidade detectada para exibir visualizações de escala.</p>
                    </div>
                )}
            </div>
        </div>
    )
};