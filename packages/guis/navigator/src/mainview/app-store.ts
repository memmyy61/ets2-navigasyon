import { UnreachableError } from '@truckermudgeon/base/precon';
import { action, computed, makeAutoObservable, observable } from 'mobx';
import type {
  BunRPC,
  Delta,
  HealthCheckEvent,
  ImportProgress,
  ServerState,
  SocketEvent,
  TelemetryGuiRPC,
  TelemetryType,
  UpdateState,
} from '../bun/types';
import type { Mode } from './ModeSelector';

export type AppState =
  | 'healthChecking'
  | 'healthError' // terminal
  | 'socketConnecting'
  | 'socketClosed' // terminal
  | 'socketError' // terminal
  | 'handShaking'
  | 'handshakeError' // terminal
  | 'waitingForPairing'
  | 'telemetryError' // terminal
  | 'telemetryUndefined'
  | 'telemetryAllZeroes'
  | 'telemetryNormal';

export type TerminalAppState = Extract<
  AppState,
  | 'healthError'
  | 'socketClosed'
  | 'socketError'
  | 'handshakeError'
  | 'telemetryError'
>;

const terminalStates = new Set<AppState>([
  'healthError',
  'socketClosed',
  'socketError',
  'handshakeError',
  'telemetryError',
]);

export class AppStore {
  // UI state. does it need to be here?

  mode: Mode = 'code';
  showHelp = false;

  // state

  pairingCode: string | undefined;
  reconnected = false;
  appState: AppState = 'healthChecking';
  // optional error message set when transitioning to a terminal state.
  errorMessage: string | undefined;
  hasReceivedTelemetry = false;
  lifetimeDeltas = 0;
  deltas: Delta[] = [];
  connectedAt: number | undefined;

  // ETS2 Navigasyon: local server, map data import, updates
  serverState: ServerState | undefined = undefined;
  importProgress: ImportProgress | undefined = undefined;
  updateState: UpdateState = { state: 'checking' };
  private telemetryClientStarted = false;

  private readonly deltaIntervalId: NodeJS.Timeout;

  constructor(readonly rpc: BunRPC) {
    console.log('appstore ctor');
    makeAutoObservable(this, {
      setupListeners: false,
      status: computed.struct,
      latency: computed.struct,
      deltas: observable.shallow,
    });
    rpc.addMessageListener('*', this.setupListeners);
    this.deltaIntervalId = setInterval(() => this.cleanupDeltas(), 5000);
    void rpc.request
      .getServerState()
      .then(action(state => this.onServerState(state)));
  }

  /** the phone URL to show / encode in the QR code. */
  get phoneUrl(): string {
    return this.serverState?.phoneUrls[0] ?? 'http://localhost:62840';
  }

  private onServerState(state: ServerState) {
    this.serverState = state;
    if (state.state !== 'importing') {
      this.importProgress = undefined;
    }
    if (state.state === 'ready' && !this.telemetryClientStarted) {
      this.telemetryClientStarted = true;
      void this.rpc.request.startTelemetryClient();
    }
  }

  dispose() {
    console.log('AppStore::dispose');
    this.rpc.removeMessageListener('*', this.setupListeners);
    clearInterval(this.deltaIntervalId);
  }

  cleanupDeltas() {
    const now = Date.now();
    this.deltas = this.deltas.filter(({ timestamp }) => {
      return now - timestamp <= 60_000;
    });
  }

  get latency(): {
    fiveSecondMs: number | undefined;
    sixtySecondMs: number | undefined;
  } {
    let fiveSecondMs: number | undefined;
    let sixtySecondMs: number | undefined;

    const now = Date.now();
    const deltasWithin5s = this.deltas.filter(
      ({ timestamp }) => now - timestamp <= 5000,
    );
    const deltasWithin60s = this.deltas.filter(
      ({ timestamp }) => now - timestamp <= 60_000,
    );

    if (deltasWithin5s.length) {
      fiveSecondMs = Math.round(
        deltasWithin5s.reduce((acc, { deltaMs }) => acc + deltaMs, 0) /
          deltasWithin5s.length,
      );
    }
    if (deltasWithin60s.length) {
      sixtySecondMs = Math.round(
        deltasWithin60s.reduce((acc, { deltaMs }) => acc + deltaMs, 0) /
          deltasWithin60s.length,
      );
    }

    return {
      fiveSecondMs,
      sixtySecondMs,
    };
  }

  get status(): {
    iconColor: 'neutral' | 'danger' | 'success' | 'warning';
    text: string;
    tooltip: string;
  } {
    let iconColor: 'neutral' | 'danger' | 'success' | 'warning';
    let text: string;
    let tooltip: string;

    switch (this.appState) {
      case 'healthChecking':
        iconColor = 'neutral';
        text = 'Bağlanıyor...';
        tooltip = 'Sunucu kontrol ediliyor';
        break;
      case 'healthError':
        iconColor = 'danger';
        text = 'Bağlantı yok';
        tooltip =
          this.errorMessage == null ||
          this.errorMessage.startsWith('Unable to connect.')
            ? 'Navigasyon sunucusuna ulaşılamadı.'
            : this.errorMessage;
        break;
      case 'socketConnecting':
        iconColor = 'neutral';
        text = 'Bağlanıyor...';
        tooltip = 'Sunucuya bağlanılıyor...';
        break;
      case 'socketClosed':
        iconColor = 'warning';
        text = 'Bağlantı kesildi';
        tooltip = 'Sunucu bağlantıyı kapattı. Uygulamayı yeniden başlatın.';
        break;
      case 'socketError':
        iconColor = 'danger';
        text = 'Bağlantı kesildi';
        tooltip = 'Sunucuda bir hata oluştu. Uygulamayı yeniden başlatın.';
        break;
      case 'handShaking':
        iconColor = 'neutral';
        text = 'Bağlanıyor...';
        tooltip = 'Sunucuyla eşleşiliyor...';
        break;
      case 'handshakeError':
        iconColor = 'danger';
        text = 'Bağlantı yok';
        tooltip = 'Sunucuyla eşleşirken hata oluştu.';
        break;
      case 'waitingForPairing':
        iconColor = 'neutral';
        text = 'Telefon bekleniyor...';
        tooltip = 'Telefonun eşleşmesi bekleniyor.';
        break;
      case 'telemetryError':
        iconColor = 'danger';
        text = 'Telemetri hatası';
        tooltip = 'Oyun verisi gönderilirken hata oluştu.';
        break;
      case 'telemetryUndefined':
        iconColor = 'warning';
        text = 'Oyun bekleniyor...';
        tooltip =
          'Oyundan veri gelmiyor. ETS2 açık mı ve scs-telemetry.dll eklentisi kurulu mu?';
        break;
      case 'telemetryAllZeroes':
        iconColor = 'warning';
        text = 'Kamyon bekleniyor...';
        tooltip = 'Bir profile girip kamyonla yola çıkın.';
        break;
      case 'telemetryNormal':
        this.connectedAt ??= Date.now();
        iconColor = 'success';
        text = 'Bağlı';
        tooltip = 'Oyun verisi telefona gönderiliyor.';
        break;
      default:
        throw new UnreachableError(this.appState);
    }

    return {
      iconColor,
      text,
      tooltip,
    };
  }

  get isTerminal(): boolean {
    return terminalStates.has(this.appState);
  }

  readonly setupListeners = action(
    (
      eventName: keyof TelemetryGuiRPC['webview']['messages'],
      ...args: unknown[]
    ) => {
      //console.log('received event', eventName, args);
      this.errorMessage = undefined;
      switch (eventName) {
        case 'healthCheck': {
          const [healthCheck] = args as [HealthCheckEvent];
          this.appState = healthCheck.ok ? 'socketConnecting' : 'healthError';
          this.errorMessage = !healthCheck.ok ? healthCheck.message : undefined;
          break;
        }
        case 'socket': {
          const [socketEvent] = args as [SocketEvent];
          switch (socketEvent.type) {
            case 'OPEN':
              this.appState = 'handShaking';
              break;
            case 'CLOSE':
              this.appState = 'socketClosed';
              break;
            case 'ERROR':
              this.appState = 'socketError';
              break;
          }
          break;
        }
        case 'connectError':
          this.appState = 'handshakeError';
          break;
        case 'pairingCode': {
          const [pairingCode] = args as [string];
          this.pairingCode = pairingCode;
          this.appState = 'waitingForPairing';
          break;
        }
        case 'reconnected':
          this.reconnected = true;
          break;
        case 'telemetryError':
          this.appState = 'telemetryError';
          break;
        case 'telemetry': {
          this.hasReceivedTelemetry = true;
          const [telemetryType] = args as [TelemetryType];
          switch (telemetryType) {
            case 'undefined':
              this.appState = 'telemetryUndefined';
              break;
            case 'allZeroes':
              this.appState = 'telemetryAllZeroes';
              break;
            case 'normal':
              this.appState = 'telemetryNormal';
              break;
          }
          break;
        }
        case 'serverState': {
          const [state] = args as [ServerState];
          this.onServerState(state);
          break;
        }
        case 'importProgress': {
          const [progress] = args as [ImportProgress];
          this.importProgress = progress;
          break;
        }
        case 'updateState': {
          const [state] = args as [UpdateState];
          this.updateState = state;
          break;
        }
        case 'telemetryDeltaMs': {
          const [deltaMs] = args as [number];
          this.lifetimeDeltas++;
          if (this.deltas.length > 120) {
            this.deltas.shift();
          }
          this.deltas.push({
            timestamp: Date.now(),
            deltaMs,
          });
          break;
        }
        default:
          throw new UnreachableError(eventName);
      }
    },
  );
}
