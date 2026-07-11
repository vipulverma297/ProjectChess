import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ─── Forward Client Console to Backend ──────────────────────────────────────
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? window.location.origin : 'http://localhost:3001');

function sendClientLog(type: string, message: string, args?: unknown) {
  fetch(`${BACKEND_URL}/api/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, message, args }),
  }).catch(() => {});
}

// Override console methods
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
  originalLog(...args);
  sendClientLog('log', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

console.error = (...args) => {
  originalError(...args);
  sendClientLog('error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

console.warn = (...args) => {
  originalWarn(...args);
  sendClientLog('warn', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
};

// Global uncaught errors
window.addEventListener('error', (event) => {
  sendClientLog('error', `Uncaught exception: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);
});

window.addEventListener('unhandledrejection', (event) => {
  sendClientLog('error', `Unhandled Promise Rejection: ${String(event.reason)}`);
});

console.log('🚀 Client logger initialized and connected to backend!');

createRoot(document.getElementById('root')!).render(
  <App />
)
