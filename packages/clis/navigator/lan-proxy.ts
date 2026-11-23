import net from 'node:net';
import os from 'node:os';

/**
 * ETS2 Navigasyon: makes the navigation server (running in WSL) reachable
 * from phones/tablets on the local network.
 *
 * WSL (NAT mode) only forwards the server's port to Windows' localhost
 * (often only IPv6 `[::1]`), so other devices can't connect to it. This
 * listens on each of this PC's IPv4 addresses on the same port and pipes
 * each connection to localhost.
 *
 * Each address is bound separately (not 0.0.0.0): on Windows a wildcard
 * listener can end up dual-stack and clash with WSL's `[::1]` listener.
 * Addresses are re-scanned every 10s, so a hotspot or Wi-Fi that comes up
 * later is picked up too.
 */
export function startLanProxy(port = 62840, targetPort = port): void {
  const servers = new Map<string, net.Server>();

  const scan = () => {
    const current = new Set(getIPv4Addresses());
    for (const address of current) {
      if (!servers.has(address)) {
        const server = createProxyServer(targetPort);
        servers.set(address, server);
        server.once('error', (err: NodeJS.ErrnoException) => {
          console.log(
            `yonlendirme acilamadi ${address}:${port} (${err.code ?? err.message})`,
          );
          // leave it in the map so we don't retry every scan; it's retried
          // if the address goes away and comes back.
        });
        server.listen({ host: address, port }, () =>
          console.log(`yonlendirme acik: http://${address}:${port}`),
        );
      }
    }
    for (const [address, server] of servers) {
      if (!current.has(address)) {
        server.close();
        servers.delete(address);
      }
    }
  };

  scan();
  setInterval(scan, 10_000).unref();
}

function getIPv4Addresses(): string[] {
  const addresses: string[] = [];
  for (const infos of Object.values(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      if (
        info.family === 'IPv4' &&
        !info.internal &&
        !info.address.startsWith('169.254.')
      ) {
        addresses.push(info.address);
      }
    }
  }
  return addresses;
}

function createProxyServer(targetPort: number): net.Server {
  return net.createServer(client => {
    client.on('error', () => client.destroy());
    connectToLocalhost(targetPort)
      .then(upstream => {
        upstream.on('error', () => {
          upstream.destroy();
          client.destroy();
        });
        client.on('close', () => upstream.destroy());
        upstream.on('close', () => client.destroy());
        client.pipe(upstream);
        upstream.pipe(client);
      })
      .catch(() => client.destroy());
  });
}

function connectToLocalhost(port: number): Promise<net.Socket> {
  // try IPv6 localhost first (what WSL usually binds), then IPv4.
  return tryConnect('::1', port).catch(() => tryConnect('127.0.0.1', port));
}

function tryConnect(host: string, port: number): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    socket.once('connect', () => {
      socket.removeAllListeners('error');
      resolve(socket);
    });
    socket.once('error', err => {
      socket.destroy();
      reject(err);
    });
  });
}
