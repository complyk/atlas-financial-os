import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { checkAndSeed } from './db/seed';
import { useAppStore } from './stores/useAppStore';

checkAndSeed()
  .then(() => useAppStore.getState().initFromDB())
  .then(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  });
