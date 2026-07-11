import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const IS_DEV = import.meta.env.DEV;

// ─── Forward Client Errors to Backend (Production: errors only, throttled) ───
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;

// Throttle: max 1 error log per 5 seconds to avoid spamming
let lastErrorSent = 0;
function sendClientError(message: string) {
  const now = Date.now();
  if (now - lastErrorSent < 5000) return;
  lastErrorSent = now;
  fetch(`${BACKEND_URL}/api/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'error', message }),
  }).catch(() => {});
}

// In development only: override console to forward all logs to backend
if (IS_DEV) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const fmt = (args: unknown[]) =>
    args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');

  console.log = (...args) => { originalLog(...args); sendClientError('[log] ' + fmt(args)); };
  console.error = (...args) => { originalError(...args); sendClientError('[error] ' + fmt(args)); };
  console.warn = (...args) => { originalWarn(...args); sendClientError('[warn] ' + fmt(args)); };
}

// Always capture uncaught errors (throttled)
window.addEventListener('error', (event) => {
  sendClientError(`Uncaught: ${event.message} at ${event.filename}:${event.lineno}`);
});

window.addEventListener('unhandledrejection', (event) => {
  sendClientError(`UnhandledRejection: ${String(event.reason)}`);
});

createRoot(document.getElementById('root')!).render(
  <App />
)
