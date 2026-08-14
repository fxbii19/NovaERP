export type ThemeModus = "dark" | "light" | "system";

export type Akzentfarbe =
  | "cyan"
  | "purple"
  | "emerald"
  | "orange"
  | "red"
  | "blue"
  | "pearl-stone"
  | "laser-teal"
  | "lime-green"
  | "sunset-blue"
  | "kiwi-night"
  | "ghost-persian"
  | "cyprus-sand"
  | "plum-milk"
  | "soft-olive"
  | "pumpkin"
  | "sky"
  | "peace-mist"
  | "chill-pink";

export type AkzentPalette = {
  start: string;
  ende: string;
  hover: string;
  hoverEnde: string;
  transparent: string;
  hell: string;
  dunkel: string;
};

export const AKZENT_PALETTEN: Record<Akzentfarbe, AkzentPalette> = {
  cyan: { start: "#017374", ende: "#c2ece2", hover: "#005b5c", hoverEnde: "#9fd8ca", transparent: "rgb(1 115 116 / 0.16)", hell: "#dff5ef", dunkel: "#12494a" },
  purple: { start: "#6366f1", ende: "#9333ea", hover: "#4f46e5", hoverEnde: "#7e22ce", transparent: "rgb(99 102 241 / 0.14)", hell: "#d8b4fe", dunkel: "#581c87" },
  emerald: { start: "#10b981", ende: "#06b6d4", hover: "#059669", hoverEnde: "#0891b2", transparent: "rgb(16 185 129 / 0.16)", hell: "#bbf7d0", dunkel: "#14532d" },
  orange: { start: "#f97316", ende: "#f59e0b", hover: "#ea580c", hoverEnde: "#d97706", transparent: "rgb(249 115 22 / 0.16)", hell: "#fed7aa", dunkel: "#7c2d12" },
  red: { start: "#ef4444", ende: "#f97316", hover: "#dc2626", hoverEnde: "#ea580c", transparent: "rgb(239 68 68 / 0.16)", hell: "#fecaca", dunkel: "#451a1a" },
  blue: { start: "#3b82f6", ende: "#6366f1", hover: "#2563eb", hoverEnde: "#4f46e5", transparent: "rgb(59 130 246 / 0.16)", hell: "#bfdbfe", dunkel: "#1e3a8a" },
  "pearl-stone": { start: "#f5f6f7", ende: "#2f2f33", hover: "#d9dbde", hoverEnde: "#1f1f22", transparent: "rgb(47 47 51 / 0.16)", hell: "#eceef0", dunkel: "#35363a" },
  "laser-teal": { start: "#2ef2e2", ende: "#0f2f2f", hover: "#18cfc1", hoverEnde: "#081f1f", transparent: "rgb(46 242 226 / 0.16)", hell: "#d5fbf8", dunkel: "#164b48" },
  "lime-green": { start: "#a4f000", ende: "#003f3a", hover: "#84c400", hoverEnde: "#002b28", transparent: "rgb(164 240 0 / 0.16)", hell: "#efffc9", dunkel: "#294b20" },
  "sunset-blue": { start: "#ff9e6d", ende: "#1a2238", hover: "#f47f45", hoverEnde: "#101728", transparent: "rgb(255 158 109 / 0.16)", hell: "#ffe8dc", dunkel: "#55342f" },
  "kiwi-night": { start: "#222222", ende: "#89e900", hover: "#111111", hoverEnde: "#70c000", transparent: "rgb(137 233 0 / 0.16)", hell: "#edffd4", dunkel: "#30451b" },
  "ghost-persian": { start: "#f7f7ff", ende: "#27187e", hover: "#dedff5", hoverEnde: "#1c105f", transparent: "rgb(39 24 126 / 0.16)", hell: "#eeeefe", dunkel: "#31265e" },
  "cyprus-sand": { start: "#004643", ende: "#f0ede5", hover: "#003532", hoverEnde: "#d9d4c8", transparent: "rgb(0 70 67 / 0.16)", hell: "#e0efec", dunkel: "#164542" },
  "plum-milk": { start: "#381932", ende: "#fff3e6", hover: "#291124", hoverEnde: "#ead8c6", transparent: "rgb(56 25 50 / 0.16)", hell: "#f9e9f4", dunkel: "#4b2942" },
  "soft-olive": { start: "#acc8a2", ende: "#1a2517", hover: "#8eae83", hoverEnde: "#10180e", transparent: "rgb(172 200 162 / 0.18)", hell: "#e8f1e4", dunkel: "#34452f" },
  pumpkin: { start: "#fd802e", ende: "#233d4c", hover: "#df6415", hoverEnde: "#172b36", transparent: "rgb(253 128 46 / 0.16)", hell: "#ffe3d0", dunkel: "#53352a" },
  sky: { start: "#2872a1", ende: "#cbdee9", hover: "#1f5b81", hoverEnde: "#acc9da", transparent: "rgb(40 114 161 / 0.16)", hell: "#e1eff7", dunkel: "#24465e" },
  "peace-mist": { start: "#ffd2c2", ende: "#789a99", hover: "#efb6a2", hoverEnde: "#607f7e", transparent: "rgb(120 154 153 / 0.18)", hell: "#fff0eb", dunkel: "#4b4c49" },
  "chill-pink": { start: "#fd1843", ende: "#fff9fa", hover: "#db0b33", hoverEnde: "#f1e4e7", transparent: "rgb(253 24 67 / 0.16)", hell: "#ffe1e7", dunkel: "#5b2330" },
};

export type OberflaechenGroesse =
  | "kompakt"
  | "standard"
  | "gross";

export type SchriftGroesse =
  | "klein"
  | "normal"
  | "gross";

export type SpracheRegion =
  | "de-DE"
  | "en-GB"
  | "es-ES"
  | "tr-TR"
  | "it-IT"
  | "ru-RU";

export type AnimationsModus =
  | "voll"
  | "reduziert"
  | "aus";

export type SidebarModus =
  | "hover"
  | "offen"
  | "geschlossen";

export type ThemeEinstellungen = {
  modus: ThemeModus;
  akzentfarbe: Akzentfarbe;
  oberflaeche: OberflaechenGroesse;
  schriftgroesse: SchriftGroesse;
  spracheRegion: SpracheRegion;
  animationen: AnimationsModus;
  sidebar: SidebarModus;
  zebraStreifen: boolean;
  tabellenLinien: boolean;
  stickyHeader: boolean;
};

export const STANDARD_THEME: ThemeEinstellungen = {
  modus: "dark",
  akzentfarbe: "purple",
  oberflaeche: "standard",
  schriftgroesse: "normal",
  spracheRegion: "de-DE",
  animationen: "voll",
  sidebar: "hover",
  zebraStreifen: false,
  tabellenLinien: true,
  stickyHeader: true,
};

export const THEME_STORAGE_KEY =
  "nova-theme-einstellungen";
