import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PrimeReactProvider } from 'primereact/api';
import { ConfirmDialog } from 'primereact/confirmdialog';

import 'primereact/resources/themes/mira/theme.css';
import 'primereact/resources/primereact.css';
import 'primeicons/primeicons.css';
import './index.css';

import App from './App';
import { store } from './store';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PrimeReactProvider value={{ ripple: true, unstyled: false }}>
      <Provider store={store}>
        <BrowserRouter>
          <ConfirmDialog />
          <App />
        </BrowserRouter>
      </Provider>
    </PrimeReactProvider>
  </React.StrictMode>
);
