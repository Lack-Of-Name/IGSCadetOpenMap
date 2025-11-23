import React from 'react';
import ReactDOM from 'react-dom/client';
import { polyfill } from 'mobile-drag-drop';
import { scrollBehaviourDragImageTranslateOverride } from 'mobile-drag-drop/scroll-behaviour';
import 'mobile-drag-drop/default.css';
import App from './App.jsx';
import './index.css';

// Initialize drag-and-drop polyfill for mobile
polyfill({
  dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride
});

// Fix for iOS to prevent scrolling while dragging
window.addEventListener('touchmove', () => {}, { passive: false });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
