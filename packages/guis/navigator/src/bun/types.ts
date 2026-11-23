import type { RPCSchema } from 'electrobun/bun';

export interface Delta {
  timestamp: number;
  deltaMs: number;
}

export type TelemetryType = 'undefined' | 'allZeroes' | 'normal';

export type BrowserPage =
  | 'navigator'
  | 'github-maps-repo'
  | 'github-maps-releases'
  | 'github-truckermudgeon-scs-sdk-plugin-repo'
  | 'github-rencloud-scs-sdk-plugin-repo';

export interface SocketEvent {
  type: 'CLOSE' | 'OPEN' | 'ERROR';
}

export interface HealthCheckEvent {
  ok: boolean;
  message: string;
}

// ETS2 Navigasyon: local server, map data and updates.
export interface ServerState {
  state: 'noData' | 'importing' | 'starting' | 'ready' | 'error';
  message?: string;
  /** phone URLs (local network), most likely first; set when ready. */
  phoneUrls: string[];
  /** WSL folders map data can be imported from; set when noData. */
  dataSources: string[];
  dataDir: string;
}

export interface ImportProgress {
  copiedBytes: number;
  totalBytes: number;
  file: string;
}

export interface UpdateState {
  state: 'checking' | 'none' | 'downloading' | 'ready' | 'error';
  message?: string;
}

export interface TelemetryGuiRPC {
  bun: RPCSchema<{
    requests: {
      startTelemetryClient: {
        params: void;
        response: void;
      };
      openBrowser: {
        params: { page: BrowserPage };
        response: void;
      };
      getServerState: {
        params: void;
        response: ServerState;
      };
      importData: {
        params: { source: string };
        response: void;
      };
      applyUpdate: {
        params: void;
        response: void;
      };
      openDataFolder: {
        params: void;
        response: void;
      };
    };
    messages: Record<string, never>;
  }>;
  webview: RPCSchema<{
    requests: Record<string, never>;
    messages: {
      healthCheck: HealthCheckEvent;
      socket: SocketEvent;
      pairingCode: string;
      reconnected: void;
      connectError: string;
      telemetryError: string;
      telemetry: TelemetryType;
      telemetryDeltaMs: number;
      serverState: ServerState;
      importProgress: ImportProgress;
      updateState: UpdateState;
    };
  }>;
}

// couldn't figure out how to get the correct types from electrobun, so
// declaring manually for now.
export interface BunRPC {
  request: {
    startTelemetryClient: (params: void) => Promise<void>;
    openBrowser: (params: { page: BrowserPage }) => void;
    getServerState: (params: void) => Promise<ServerState>;
    importData: (params: { source: string }) => Promise<void>;
    applyUpdate: (params: void) => Promise<void>;
    openDataFolder: (params: void) => Promise<void>;
  };
  addMessageListener(
    event: '*',
    handler: (
      eventName: keyof TelemetryGuiRPC['webview']['messages'],
      ...args: unknown[]
    ) => void,
  ): void;
  removeMessageListener(
    event: '*',
    handler: (
      eventName: keyof TelemetryGuiRPC['webview']['messages'],
      ...args: unknown[]
    ) => void,
  ): void;
}

export interface WebviewRPC {
  send(name: 'healthCheck', event: HealthCheckEvent): void;
  send(name: 'socket', event: SocketEvent): void;
  send(name: 'pairingCode', code: string): void;
  send(name: 'reconnected'): void;
  send(name: 'connectError', errMsg: string): void;
  send(name: 'telemetryError', errMsg: string): void;
  send(name: 'telemetry', type: TelemetryType): void;
  send(name: 'telemetryDeltaMs', deltaMs: number): void;
  send(name: 'serverState', state: ServerState): void;
  send(name: 'importProgress', progress: ImportProgress): void;
  send(name: 'updateState', state: UpdateState): void;
}
