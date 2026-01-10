/**
 * Crypto shim to ensure global crypto object is available before app boot.
 * This fixes "crypto is not defined" errors in browsers.
 */

// Only run in browser environment
if (typeof window !== "undefined") {
  // Get the browser's crypto API (window.crypto or window.msCrypto for IE11)
  const browserCrypto =
    window.crypto || (window as any).msCrypto || (globalThis as any).crypto;

  if (browserCrypto) {
    // Ensure crypto is available globally in multiple ways that libraries might access it
    if (!(globalThis as any).crypto) {
      (globalThis as any).crypto = browserCrypto;
    }

    // For Node.js-style access (some libraries use this)
    if (typeof global !== "undefined" && !(global as any).crypto) {
      (global as any).crypto = browserCrypto;
    }

    // Ensure window.crypto exists (fallback for IE11)
    if (!window.crypto && (window as any).msCrypto) {
      (window as any).crypto = (window as any).msCrypto;
    }
  } else {
    console.warn(
      "[Crypto Shim] Browser crypto API not found. Some features may not work."
    );
  }
}
