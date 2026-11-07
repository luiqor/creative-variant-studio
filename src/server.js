import { createApp } from './app.js';

const LOOPBACK = '127.0.0.1';

export function startServer({ port = 0, host = LOOPBACK, ...appOptions } = {}) {
  const app = createApp(appOptions);
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      const actual = server.address().port;
      resolve({
        port: actual,
        url: `http://${host}:${actual}`,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
            server.closeAllConnections();
          }),
      });
    });
    server.on('error', reject);
  });
}
