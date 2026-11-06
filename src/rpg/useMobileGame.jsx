import { useEffect, useRef, useState } from "react";
export default function useMobileGame(active, onSuspend) {
  const [touch, setTouch] = useState(
    () => matchMedia("(pointer: coarse)").matches,
  );
  const [portrait, setPortrait] = useState(() => innerHeight > innerWidth);
  const [fullscreen, setFullscreen] = useState(false),
    [canInstall, setCanInstall] = useState(false),
    [offlineReady, setOfflineReady] = useState(false),
    [offlineUnavailable, setOfflineUnavailable] = useState(
      !("serviceWorker" in navigator) || location.protocol === "file:",
    );
  const registration = useRef(null);
  const [updateReady, setUpdateReady] = useState(false);
  const installEvent = useRef(null),
    suspend = useRef(onSuspend);
  suspend.current = onSuspend;
  useEffect(() => {
    const query = matchMedia("(pointer: coarse)"),
      resize = () => {
        setTouch(query.matches);
        setPortrait(innerHeight > innerWidth);
      },
      full = () => setFullscreen(!!document.fullscreenElement);
    const install = (e) => {
        e.preventDefault();
        installEvent.current = e;
        setCanInstall(true);
      },
      installed = () => {
        installEvent.current = null;
        setCanInstall(false);
      };
    query.addEventListener("change", resize);
    addEventListener("resize", resize);
    document.addEventListener("fullscreenchange", full);
    addEventListener("beforeinstallprompt", install);
    addEventListener("appinstalled", installed);
    if (
      import.meta.env.PROD &&
      location.protocol !== "file:" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register(new URL("./sw.js", document.baseURI).href, { scope: "./" })
        .then((reg) => {
          registration.current = reg;
          if (reg.waiting) setUpdateReady(true);
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              )
                setUpdateReady(true);
            });
          });
          return navigator.serviceWorker.ready;
        })
        .then(() => setOfflineReady(true))
        .catch(() => setOfflineUnavailable(true));
    }
    return () => {
      query.removeEventListener("change", resize);
      removeEventListener("resize", resize);
      document.removeEventListener("fullscreenchange", full);
      removeEventListener("beforeinstallprompt", install);
      removeEventListener("appinstalled", installed);
    };
  }, []);
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const visibility = () => {
      if (document.hidden) suspend.current?.();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [active]);
  async function enterFullscreen() {
    try {
      if (
        !document.fullscreenElement &&
        document.documentElement.requestFullscreen
      )
        await document.documentElement.requestFullscreen({
          navigationUI: "hide",
        });
    } catch {}
    try {
      if (document.fullscreenElement && screen.orientation?.lock)
        await screen.orientation.lock("landscape");
    } catch {}
    return !!document.fullscreenElement;
  }
  async function toggleFullscreen() {
    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {}
      return false;
    }
    return enterFullscreen();
  }
  async function install() {
    if (!installEvent.current) return "manual";
    const event = installEvent.current;
    installEvent.current = null;
    setCanInstall(false);
    await event.prompt();
    const result = await event.userChoice;
    return result.outcome;
  }
  function applyUpdate() {
    if (!registration.current?.waiting) return;
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => location.reload(),
      { once: true },
    );
    registration.current.waiting.postMessage("SKIP_WAITING");
  }
  return {
    touch,
    updateReady,
    applyUpdate,
    portrait,
    fullscreen,
    canInstall,
    offlineReady,
    offlineUnavailable,
    enterFullscreen,
    toggleFullscreen,
    install,
  };
}
