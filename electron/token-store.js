import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function createTokenStore({ safeStorage, file }) {
  return {
    save(token) {
      const clean = String(token).trim();
      if (!clean) throw new Error('The token is empty.');
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available on this computer, so the token cannot be stored safely.');
      }
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, safeStorage.encryptString(clean), { mode: 0o600 });
    },
    load() {
      try {
        const token = safeStorage.decryptString(readFileSync(file)).trim();
        return token || null;
      } catch {
        return null;
      }
    },
    clear() {
      rmSync(file, { force: true });
    },
  };
}
