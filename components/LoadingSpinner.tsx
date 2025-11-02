import React from 'react';

interface LoadingSpinnerProps {
    text?: string;
}

export const LoadingSpinner = ({ text = "O Maestro de IA está compondo sua análise..." }: LoadingSpinnerProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">{text}</p>
    </div>
  );
};