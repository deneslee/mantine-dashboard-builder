import './app/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initSentry } from '@/integrations/sentry';
import { App } from './app/App';

initSentry();

const root = document.getElementById('root');
if (!root) throw new Error('#root missing in index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
