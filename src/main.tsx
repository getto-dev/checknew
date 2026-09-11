import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Older/embedded browser contexts may expose Web Crypto without randomUUID.
// Keep estimate/item IDs working while retaining cryptographic randomness when available.
const cryptoApi = globalThis.crypto as Crypto & {
  randomUUID?: () => string;
};

if (cryptoApi && typeof cryptoApi.randomUUID !== 'function') {
  Object.defineProperty(cryptoApi, 'randomUUID', {
    configurable: true,
    value: () => {
      const bytes = new Uint8Array(16);
      if (typeof cryptoApi.getRandomValues === 'function') {
        cryptoApi.getRandomValues(bytes);
      } else {
        for (let i = 0; i < bytes.length; i += 1) {
          bytes[i] = Math.floor(Math.random() * 256);
        }
      }

      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
      return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
