import type { GatsbyBrowser } from "gatsby";
import config from "@/site/config";

const SITE = config.id;

export const wrapRootElement: GatsbyBrowser["wrapRootElement"] = config.auth
  ? ({ element }) => {
      const { AuthProvider } = require("./src/components/Auth/auth-context");
      return <AuthProvider>{element}</AuthProvider>;
    }
  : undefined;

export const onClientEntry: GatsbyBrowser["onClientEntry"] = () => {
  if (typeof window === "undefined") return;

  const RECOVERY_KEY = `__${SITE}_sw_recovery_attempted`;

  const recover = async (reason: string) => {
    if (sessionStorage.getItem(RECOVERY_KEY)) return;
    sessionStorage.setItem(RECOVERY_KEY, reason);

    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      window.location.reload();
    }
  };

  const isChunkLoadError = (msg: string) =>
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk") ||
    msg.includes("ChunkLoadError");

  window.addEventListener("unhandledrejection", (event) => {
    const msg = String(event.reason?.message ?? event.reason ?? "");
    if (isChunkLoadError(msg)) recover(msg);
  });

  window.addEventListener("error", (event) => {
    if (event.message && isChunkLoadError(event.message)) {
      recover(event.message);
    }
  });
};
