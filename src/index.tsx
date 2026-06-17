import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const meta = document.createElement('meta');
meta.setAttribute('name', 'google');
meta.setAttribute('content', 'notranslate');
document.head.appendChild(meta);

// защита для body
document.body.setAttribute('data-nottranslate', 'true');
document.body.classList.add('notranslate');

const style = document.createElement('style');
style.textContent = `
  body, div, span, p, h1, h2, h3, h4, h5, h6,
  table, thead, tbody, tr, td, th,
  button, input, select, textarea, label,
  .schedule-cell, .pair-info, .pair-subject, 
  .pair-teacher, .pair-room, .grid-header {
    -webkit-translate: none !important;
    translate: none !important;
    text-decoration: none !important;
  }
  
  .notranslate, [data-nottranslate] {
    -webkit-user-select: auto;
    user-select: auto;
  }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);