import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Removed .js extension to allow TypeScript's module resolver to handle file extensions correctly.
import App from './App';
import { SettingsProvider } from './contexts/SettingsContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>
);