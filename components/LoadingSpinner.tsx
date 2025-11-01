

import React from 'react';

export const LoadingSpinner = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-lg text-gray-300">O Maestro de IA está compondo sua análise...</p>
    </div>
  );
};