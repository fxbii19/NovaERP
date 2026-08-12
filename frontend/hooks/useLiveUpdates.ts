"use client";
import { useEffect, useRef } from "react";

export default function useLiveUpdates(aktualisieren: () => void) {
  const callback = useRef(aktualisieren); callback.current = aktualisieren;
  useEffect(() => {
    const quelle = new EventSource("/api/live");
    const laden = () => { if (document.visibilityState === "visible") callback.current(); };
    quelle.addEventListener("sync", laden);
    window.addEventListener("focus", laden);
    return () => { quelle.removeEventListener("sync", laden); quelle.close(); window.removeEventListener("focus", laden); };
  }, []);
}
