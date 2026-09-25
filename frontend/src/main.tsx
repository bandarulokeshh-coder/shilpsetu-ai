import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './i18n';
import App from './App';
import './index.css';

// React Router v6 ships a single top-level route, and <App/> owns all
// client routing internally via its own <Routes/>. We only need the future
// flags to silence the v7 upgrade warnings — they are accepted at runtime
// by 6.30.x even though the bundled .d.ts omits them, so we type the
// config as `Record<string, boolean>` to keep `tsc` happy.
const future: Record<string, boolean> = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
};

const router = createBrowserRouter([{ path: '*', element: <App /> }], { future });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} future={future} />
    <Toaster position="top-right" />
  </React.StrictMode>
);
