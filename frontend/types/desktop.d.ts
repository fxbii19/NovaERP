export {};

type NovaUpdateStatus = {
  status:
    | "pruefen"
    | "aktuell"
    | "verfuegbar"
    | "download"
    | "bereit"
    | "fehler"
    | "nicht-konfiguriert";
  aktuelleVersion?: string;
  neueVersion?: string;
  fortschritt?: number;
  meldung?: string;
  neuerungen?: string[];
};

declare global {
  interface Window {
    novaDesktop?: {
      aktiv: boolean;
      schliessen: () => void;
      updatePruefen: () => Promise<NovaUpdateStatus>;
      updateHerunterladen: () => Promise<NovaUpdateStatus>;
      updateInstallieren: () => Promise<boolean>;
      version: () => Promise<string>;
      updateStatusEmpfangen: (
        callback: (status: NovaUpdateStatus) => void,
      ) => () => void;
    };
  }
}
