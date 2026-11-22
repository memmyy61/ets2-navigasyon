import os from 'node:os';

// Network adapters that phones on the Wi-Fi/hotspot can't reach.
const virtualAdapterPattern =
  /vethernet|virtualbox|vmware|hyper-v|wsl|loopback|bluetooth|tailscale|zerotier|hamachi|vpn|docker|default switch/i;
// Adapters that are most likely the Wi-Fi the phone is on.
const wifiAdapterPattern = /wi-?fi|wlan|wireless|kablosuz/i;
// Windows mobile hotspot adapter (English / Turkish Windows).
const hotspotAdapterPattern =
  /local area connection\*|yerel a[gğ] ba[gğ]lant[ıi]s[ıi]\*/i;

export interface LanAddress {
  url: string;
  adapter: string;
}

/**
 * Returns navigator app URLs using this PC's local network (IPv4) addresses,
 * most likely candidates first. Phones/tablets on the same Wi-Fi or hotspot
 * can open these.
 */
export function getLanAddresses(port = 62840): LanAddress[] {
  const candidates: (LanAddress & { score: number })[] = [];
  for (const [adapter, infos] of Object.entries(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family !== 'IPv4' || info.internal) {
        continue;
      }
      const ip = info.address;
      if (ip.startsWith('169.254.')) {
        // link-local: no DHCP, not usable
        continue;
      }
      let score = virtualAdapterPattern.test(adapter) ? 100 : 0;
      if (wifiAdapterPattern.test(adapter)) {
        score -= 10;
      }
      if (
        ip.startsWith('192.168.137.') ||
        hotspotAdapterPattern.test(adapter)
      ) {
        // this PC's own Windows mobile hotspot: if it's on, the phone is
        // most likely connected to it.
        score -= 20;
      }
      if (ip.startsWith('172.')) {
        score += 5;
      }
      candidates.push({ url: `http://${ip}:${port}`, adapter, score });
    }
  }
  return candidates
    .sort((a, b) => a.score - b.score)
    .map(({ url, adapter }) => ({ url, adapter }));
}

export function getLanNavigatorUrls(port = 62840): string[] {
  return getLanAddresses(port).map(a => a.url);
}
