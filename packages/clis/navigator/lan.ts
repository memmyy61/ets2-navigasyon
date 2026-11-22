import os from 'node:os';

/**
 * Returns navigator app URLs using this PC's local network (IPv4) addresses,
 * most likely candidates first. Phones/tablets on the same Wi-Fi or hotspot
 * can open these.
 */
export function getLanNavigatorUrls(port = 62840): string[] {
  const addresses: string[] = [];
  for (const infos of Object.values(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      if (info.family === 'IPv4' && !info.internal) {
        addresses.push(info.address);
      }
    }
  }
  const score = (ip: string) =>
    // Windows mobile hotspot
    ip.startsWith('192.168.137.')
      ? 0
      : ip.startsWith('192.168.')
        ? 1
        : ip.startsWith('10.')
          ? 2
          : ip.startsWith('172.')
            ? 3
            : 4;
  return [...new Set(addresses)]
    .sort((a, b) => score(a) - score(b))
    .map(ip => `http://${ip}:${port}`);
}
