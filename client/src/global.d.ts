/**
 * Global TypeScript declarations for crypto shim
 */

interface Window {
  crypto?: Crypto;
  msCrypto?: any; // IE11 compatibility
}

declare global {
  // Ensure crypto is available on globalThis
  var crypto: Crypto | undefined;

  // Node.js-style global (for libraries that check this)
  namespace NodeJS {
    interface Global {
      crypto?: Crypto;
    }
  }
}

export {};
