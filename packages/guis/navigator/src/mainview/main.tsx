import { CssBaseline, CssVarsProvider } from '@mui/joy';
import Electrobun, { Electroview } from 'electrobun/view';
import * as mobx from 'mobx';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { BunRPC, TelemetryGuiRPC } from '../bun/types';
import App from './App';
import './index.css';

// https://mobx.js.org/configuration.html#linting-options
mobx.configure({
  enforceActions: 'always',
  computedRequiresReaction: true,
  reactionRequiresObservable: true,
  observableRequiresReaction: true,
  disableErrorBoundaries: true,
});

const telemetryGuiRPC = Electroview.defineRPC<TelemetryGuiRPC>({
  // importing map data can take a while
  maxRequestTime: 0,
  handlers: {},
});
const electrobun = new Electrobun.Electroview({ rpc: telemetryGuiRPC });
const rpc: BunRPC = electrobun.rpc!;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CssVarsProvider defaultMode={'dark'} modeStorageKey={'ets2nav-mode'}>
      <CssBaseline />
      <App rpc={rpc} />
    </CssVarsProvider>
  </StrictMode>,
);

// ETS2 Navigasyon: the telemetry client is started by the AppStore once the
// local navigation server is ready.
