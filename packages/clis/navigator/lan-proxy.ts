import net from 'node:net';

/**
 * ETS2 Navigasyon: makes the navigation server (running in WSL) reachable
 * from phones/tablets on the local network.
 *
 * WSL (NAT mode) only forwards the server's port to Windows' localhost
 * (often only IPv6 `[::1]`), so other devices can't connect to it. This
 * listens on all IPv4 addresses of this PC on the same port and pipes each
 * connection to localhost. IPv4 0.0.0.0 doesn't clash with WSL's `[::1]`
 * listener.
 *
 * Returns `true` if the proxy is listening.
 */
export function startLanProxy(
  port = 62840,
  targetPort = port,
): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer(client => {
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
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        // something (e.g. WSL in mirrored networking mode) already serves
        // this port on the network; nothing to do.
        console.log(
          `yerel ag yonlendirmesi: ${port} zaten kullanimda, gerek yok.`,
        );
      } else {
        console.log('yerel ag yonlendirmesi baslatilamadi:', err.message);
      }
      resolve(false);
    });
    server.listen({ host: '0.0.0.0', port }, () => resolve(true));
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
