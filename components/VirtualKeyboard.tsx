import React from 'react';

const notesInOctave = [
  { name: 'C', type: 'white' },
  { name: 'C#', type: 'black' },
  { name: 'D', type: 'white' },
  { name: 'D#', type: 'black' },
  { name: 'E', type: 'white' },
  { name: 'F', type: 'white' },
  { name: 'F#', type: 'black' },
  { name: 'G', type: 'white' },
  { name: 'G#', type: 'black' },
  { name: 'A', type: 'white' },
  { name: 'A#', type: 'black' },
  { name: 'B', type: 'white' },
];

interface VirtualKeyboardProps {
    highlightedNotes: string[];
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ highlightedNotes }) => {
  const whiteKeys = notesInOctave.filter(n => n.type === 'white');
  const blackKeys = notesInOctave.filter(n => n.type === 'black');
  const rootNote = highlightedNotes?.[0];
  
  // Position of black keys relative to the start of the white key before it.
  const blackKeyPositions: Record<string, number> = { 'C#': 0, 'D#': 1, 'F#': 3, 'G#': 4, 'A#': 5 };

  return (
    <div className="relative h-32 w-full max-w-lg mx-auto p-1">
      {/* White Keys */}
      <div className="flex h-full rounded-md overflow-hidden shadow-md">
        {whiteKeys.map(({ name }) => {
          const isHighlighted = highlightedNotes.includes(name);
          const isRoot = name === rootNote;
          let bgColor = 'bg-white dark:bg-gray-300';
          if (isHighlighted) {
            bgColor = isRoot ? 'bg-cyan-500' : 'bg-cyan-400/70';
          }

          return (
            <div key={name} className={`relative flex-1 border-r border-gray-400/50 dark:border-gray-600/50 last:border-r-0 transition-colors duration-150 ${bgColor}`}>
               <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-sm font-bold ${isRoot ? 'text-white' : 'text-gray-700'}`}>{name}</span>
            </div>
          );
        })}
      </div>
      {/* Black Keys */}
      <div className="absolute top-0 left-0 w-full h-2/3 pointer-events-none p-1">
        {blackKeys.map(({ name }) => {
          const isHighlighted = highlightedNotes.includes(name);
          const isRoot = name === rootNote;
          const whiteKeyIndex = blackKeyPositions[name];
          const whiteKeyWidthPercentage = 100 / whiteKeys.length;
          // Position black key to hang between two white keys, slightly offset.
          const leftPosition = (whiteKeyIndex + 0.73) * whiteKeyWidthPercentage;

          let bgColor = 'bg-black';
           if (isHighlighted) {
            bgColor = isRoot ? 'bg-cyan-600' : 'bg-cyan-500/80';
          }
          
          return (
            <div 
              key={name}
              className={`absolute top-0 h-full w-[9%] rounded-b-md border-2 border-gray-300 dark:border-gray-800 shadow-lg transition-colors duration-150 ${bgColor}`}
              style={{ left: `${leftPosition}%` }}
            >
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-bold text-white">{name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};