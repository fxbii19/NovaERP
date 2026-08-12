"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  AKZENT_PALETTEN,
  STANDARD_THEME,
  THEME_STORAGE_KEY,
  type ThemeEinstellungen,
} from "@/lib/theme";

type ThemeContextTyp = {
  einstellungen: ThemeEinstellungen;
  gespeichert: ThemeEinstellungen;
  geladen: boolean;

  aktualisieren: (
    werte: Partial<ThemeEinstellungen>
  ) => void;

  speichern: () => void;
  verwerfen: () => void;
  zuruecksetzen: () => void;
};

const ThemeContext =
  createContext<ThemeContextTyp | null>(null);

function ermittleSystemTheme(): "dark" | "light" {
  if (typeof window === "undefined") {
    return "dark";
  }

  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
}

function themeAnwenden(
  einstellungen: ThemeEinstellungen
) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  const aktiverModus =
    einstellungen.modus === "system"
      ? ermittleSystemTheme()
      : einstellungen.modus;

  const palette =
    AKZENT_PALETTEN[einstellungen.akzentfarbe] ??
    AKZENT_PALETTEN.purple;

  root.style.setProperty("--nova-akzent", palette.start);
  root.style.setProperty("--nova-akzent-zweitfarbe", palette.ende);
  root.style.setProperty("--nova-akzent-hover", palette.hover);
  root.style.setProperty(
    "--nova-akzent-verlauf",
    `linear-gradient(135deg, ${palette.start} 0%, ${palette.ende} 100%)`
  );
  root.style.setProperty(
    "--nova-akzent-verlauf-hover",
    `linear-gradient(135deg, ${palette.hover} 0%, ${palette.hoverEnde} 100%)`
  );
  root.style.setProperty(
    "--nova-akzent-transparent",
    palette.transparent
  );
  root.style.setProperty("--nova-hover-light", palette.hell);
  root.style.setProperty("--nova-hover-dark", palette.dunkel);
  root.style.setProperty(
    "--nova-hover",
    aktiverModus === "light" ? palette.hell : palette.dunkel
  );

  root.dataset.theme = aktiverModus;
  root.dataset.themeModus = einstellungen.modus;
  root.dataset.akzent =
    einstellungen.akzentfarbe;
  root.dataset.oberflaeche =
    einstellungen.oberflaeche;
  root.dataset.schrift =
    einstellungen.schriftgroesse;
  root.dataset.region = einstellungen.spracheRegion;
  root.lang = einstellungen.spracheRegion.split("-")[0];
  root.dataset.animationen =
    einstellungen.animationen;
  root.dataset.sidebar =
    einstellungen.sidebar;

  root.dataset.zebra =
    einstellungen.zebraStreifen
      ? "aktiv"
      : "inaktiv";

  root.dataset.tabellenLinien =
    einstellungen.tabellenLinien
      ? "aktiv"
      : "inaktiv";

  root.dataset.stickyHeader =
    einstellungen.stickyHeader
      ? "aktiv"
      : "inaktiv";
}

function themeZusammenfuehren(
  gespeichert: Partial<ThemeEinstellungen>
): ThemeEinstellungen {
  return {
    ...STANDARD_THEME,
    ...gespeichert,
  };
}

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [einstellungen, setEinstellungen] =
    useState<ThemeEinstellungen>(
      STANDARD_THEME
    );

  const [gespeichert, setGespeichert] =
    useState<ThemeEinstellungen>(
      STANDARD_THEME
    );

  const [geladen, setGeladen] = useState(false);

  useEffect(() => {
    try {
      const gespeicherterWert =
        window.localStorage.getItem(
          THEME_STORAGE_KEY
        );

      if (!gespeicherterWert) {
        setEinstellungen(STANDARD_THEME);
        setGespeichert(STANDARD_THEME);
        themeAnwenden(STANDARD_THEME);
        return;
      }

      const geladeneEinstellungen =
        JSON.parse(
          gespeicherterWert
        ) as Partial<ThemeEinstellungen>;

      const vollstaendigeEinstellungen =
        themeZusammenfuehren(
          geladeneEinstellungen
        );

      setEinstellungen(
        vollstaendigeEinstellungen
      );

      setGespeichert(
        vollstaendigeEinstellungen
      );

      themeAnwenden(
        vollstaendigeEinstellungen
      );
    } catch (fehler) {
      console.error(
        "Theme-Einstellungen konnten nicht geladen werden:",
        fehler
      );

      setEinstellungen(STANDARD_THEME);
      setGespeichert(STANDARD_THEME);
      themeAnwenden(STANDARD_THEME);
    } finally {
      setGeladen(true);
    }
  }, []);

  useEffect(() => {
    if (
      !geladen ||
      einstellungen.modus !== "system"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    function systemThemeGeaendert() {
      themeAnwenden(einstellungen);
    }

    mediaQuery.addEventListener(
      "change",
      systemThemeGeaendert
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        systemThemeGeaendert
      );
    };
  }, [einstellungen, geladen]);

  const aktualisieren = useCallback(
    (
      werte: Partial<ThemeEinstellungen>
    ) => {
      setEinstellungen((aktuell) => {
        const neu: ThemeEinstellungen = {
          ...aktuell,
          ...werte,
        };

        themeAnwenden(neu);

        return neu;
      });
    },
    []
  );

  const speichern = useCallback(() => {
    try {
      window.localStorage.setItem(
        THEME_STORAGE_KEY,
        JSON.stringify(einstellungen)
      );

      setGespeichert(einstellungen);
      themeAnwenden(einstellungen);
    } catch (fehler) {
      console.error(
        "Theme-Einstellungen konnten nicht gespeichert werden:",
        fehler
      );
    }
  }, [einstellungen]);

  const verwerfen = useCallback(() => {
    setEinstellungen(gespeichert);
    themeAnwenden(gespeichert);
  }, [gespeichert]);

  const zuruecksetzen = useCallback(() => {
    setEinstellungen(STANDARD_THEME);
    themeAnwenden(STANDARD_THEME);
  }, []);

  const contextWert = useMemo(
    () => ({
      einstellungen,
      gespeichert,
      geladen,
      aktualisieren,
      speichern,
      verwerfen,
      zuruecksetzen,
    }),
    [
      einstellungen,
      gespeichert,
      geladen,
      aktualisieren,
      speichern,
      verwerfen,
      zuruecksetzen,
    ]
  );

  return (
    <ThemeContext.Provider value={contextWert}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme muss innerhalb des ThemeProviders verwendet werden."
    );
  }

  return context;
}
