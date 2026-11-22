#!/usr/bin/env -S npx tsx

import { renderANSI } from 'uqr';
import { apiUrl, healthUrl, navigatorUrl } from './constants';
import type { TelemetryReaderOptions } from './helpers';
import {
  checkIsServerUp,
  connectToServer,
  createTelemetryClient,
  createTelemetryReader,
  getTelemetryId,
  startTelemetryLoop,
} from './helpers';
import { getLanAddresses } from './lan';
import { startLanProxy } from './lan-proxy';

async function main() {
  //checkIsPluginInstalled();

  const healthCheck = await checkIsServerUp(healthUrl);
  if (!healthCheck.ok) {
    process.exit(1);
  }

  // ETS2 Navigasyon: let phones on the local network reach the server.
  if (process.platform === 'win32' && process.env.NAV_LAN_PROXY !== 'false') {
    if (await startLanProxy()) {
      console.log('yerel ag yonlendirmesi acik (port 62840).');
    }
  }

  // TODO add simple check if client is outdated
  const { telemetryClient, debugClose } = createTelemetryClient({
    apiUrl,
    onError: (maybeEvent: Event | undefined) => {
      console.error(maybeEvent);
      console.error(
        'sunucuya baglanirken hata olustu. sunucunun acik oldugundan emin olun.',
      );
      process.exit(8);
    },
    onClose: (maybeCause: { code?: number } | undefined) => {
      console.log('socket closed:', maybeCause);
      if (maybeCause?.code === 1001) {
        console.log('sunucu kapandi.');
      }
    },
  });

  const telemetryReaderOptions = parseArguments(process.argv);
  const getTelemetry = createTelemetryReader(
    telemetryReaderOptions,
    debugClose,
  );

  // server handshake
  const telemetryId = getTelemetryId();
  await connectToServer({
    telemetryClient,
    telemetryId,
    onPairingCodeReceived: pairingCode => {
      const lanAddresses = getLanAddresses();
      const phoneUrl =
        process.env.NAV_URL ?? lanAddresses[0]?.url ?? navigatorUrl;
      console.log('\n========================================');
      console.log(' ETS2 Navigasyon - telefonu baglama');
      console.log('========================================\n');
      console.log('Telefonda su QR kodu okutun:\n');
      console.log(renderANSI(`${phoneUrl}/?pair=${pairingCode}`));
      console.log('\nveya telefon tarayicisinda su adresi acin:');
      console.log('   ', phoneUrl);
      if (lanAddresses.length > 1) {
        console.log('\nacilmazsa digerlerini deneyin:');
        for (const { url, adapter } of lanAddresses.slice(1)) {
          console.log('   ', url, ` (${adapter})`);
        }
      }
      console.log('\nve su eslestirme kodunu girin:   ', pairingCode, '\n');
    },
  });
  // at this point, client is authenticated and can start sending telemetry.

  telemetryClient.subscribeToPairingCodes.subscribe(void 0, {
    onData: pairingCode =>
      console.log(
        'baska bir cihaz baglamak icin eslestirme kodu:',
        pairingCode,
      ),
    onError: err => {
      console.error('error:', err.message);
      process.exit(5);
    },
  });

  // TODO only send telemetry if there are viewers connected.
  let consecutiveErrors = 0;
  let missingSince: number | undefined;
  let warned = false;
  startTelemetryLoop({
    getTelemetry,
    telemetryClient,
    onTelemetry: type => {
      if (type === 'normal') {
        if (warned) {
          console.log('oyun verisi geliyor, sorun cozuldu.');
        }
        missingSince = undefined;
        warned = false;
        return;
      }
      missingSince ??= Date.now();
      if (!warned && Date.now() - missingSince > 15_000) {
        warned = true;
        if (type === 'undefined') {
          console.log(
            '\nUYARI: Oyundan veri okunamiyor. ETS2 acik mi? Aciksa telemetri ' +
              'eklentisi (scs-telemetry.dll) yuklu degil veya surumu uyumsuz.\n' +
              '  Dosya su klasorde olmali:\n' +
              '  ...\\Euro Truck Simulator 2\\bin\\win_x64\\plugins\\scs-telemetry.dll\n' +
              '  Indirme: https://github.com/RenCloud/scs-sdk-plugin/releases (v1.12.1)\n',
          );
        } else {
          console.log(
            '\nUYARI: Oyun acik ama kamyon konumu henuz yok (0,0,0). ' +
              'Bir profile girip kamyonla yola cikin.\n',
          );
        }
      }
    },
    onError: err => {
      consecutiveErrors++;
      if (err instanceof Error) {
        console.log('hata:', err.message);
      } else {
        console.log('hata:', err ?? 'bilinmeyen hata');
      }
      if (consecutiveErrors >= 30) {
        console.log('sunucuya uzun suredir veri gonderilemiyor, cikiliyor.');
        process.exit(6);
      }
    },
    onDelta: () => {
      consecutiveErrors = 0;
    },
  });
}

function parseArguments(argv: string[]): TelemetryReaderOptions {
  let telemetryReaderOptions: TelemetryReaderOptions;
  const args = argv.slice(2);
  const telemetryMode = args[0] ?? 'live';
  if (telemetryMode === 'recorded') {
    if (!args[1]) {
      throw new Error('no recording file specified.');
    }
    telemetryReaderOptions = {
      mode: 'recorded',
      filepath: args[1],
    };
  } else if (telemetryMode === 'live') {
    telemetryReaderOptions = {
      mode: 'live',
    };
  } else {
    throw new Error(
      `unknown telemetry mode ${telemetryMode}. must be either "live" or "recorded".`,
    );
  }
  return telemetryReaderOptions;
}

process.on('exit', code => {
  console.log('process exit', code);
});

void main();
