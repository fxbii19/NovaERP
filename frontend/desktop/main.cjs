const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const novaAdresse =
  process.env.NOVA_DESKTOP_URL || "http://localhost:3000/login";
let novaServer = null;
let updateStatus = { status: "aktuell" };
let updateKonfiguriert = false;
const splashDauer = 3200;

function neuerungenLesen(releaseNotes) {
  const text = Array.isArray(releaseNotes)
    ? releaseNotes.map((eintrag) => eintrag?.note || "").join("\n")
    : releaseNotes || "";

  return String(text)
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n/)
    .map((zeile) => zeile.replace(/^\s*[-*#]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function updateStatusSenden(status) {
  updateStatus = status;
  for (const fenster of BrowserWindow.getAllWindows()) {
    fenster.webContents.send("nova-update-status", status);
  }
}

function updaterEinrichten() {
  if (!app.isPackaged) return;

  try {
    const konfiguration = JSON.parse(
      fs.readFileSync(path.join(__dirname, "update-config.json"), "utf8"),
    );

    if (!konfiguration.owner || !konfiguration.repo) return;

    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = Boolean(konfiguration.prerelease);
    autoUpdater.setFeedURL({
      provider: "github",
      owner: konfiguration.owner,
      repo: konfiguration.repo,
    });
    updateKonfiguriert = true;
  } catch (fehler) {
    console.error("NOVA Updater konnte nicht eingerichtet werden:", fehler);
  }
}

function updaterEreignisseEinrichten() {
 autoUpdater.on("update-available", (info) => {
  console.log("NOVA Update gefunden:", info);

  updateStatusSenden({
    status: "verfuegbar",
    aktuelleVersion: app.getVersion(),
    neueVersion: info.version,
    neuerungen: neuerungenLesen(info.releaseNotes),
  });
});
  autoUpdater.on("update-not-available", () => {
    updateStatusSenden({ status: "aktuell" });
  });
  autoUpdater.on("download-progress", (fortschritt) => {
    updateStatusSenden({
      ...updateStatus,
      status: "download",
      fortschritt: Math.round(fortschritt.percent),
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    updateStatusSenden({
      status: "bereit",
      aktuelleVersion: app.getVersion(),
      neueVersion: info.version,
      neuerungen: neuerungenLesen(info.releaseNotes),
      fortschritt: 100,
    });
  });
  autoUpdater.on("error", (fehler) => {
  console.error("NOVA Update-Fehler:", fehler);

  updateStatusSenden({
    status: "fehler",
    meldung: fehler?.message ?? String(fehler),
  });
});
}

async function updatePruefen() {
  if (!app.isPackaged || !updateKonfiguriert) {
    return { status: "nicht-konfiguriert" };
  }

  try {
  const info = await autoUpdater.checkForUpdates();

  console.log("NOVA Update-Prüfung:", info);

  return updateStatus;
} catch (fehler) {
    console.error("NOVA Update-Pruefung fehlgeschlagen:", fehler);
    return {
      status: "fehler",
      meldung: "Die Update-Prüfung ist momentan nicht erreichbar.",
    };
  }
}

function erreichbar() {
  return new Promise((resolve) => {
    const anfrage = http.get(novaAdresse, (antwort) => {
      antwort.resume();
      resolve(true);
    });
    anfrage.setTimeout(350, () => anfrage.destroy());
    anfrage.on("error", () => resolve(false));
  });
}

async function paketServerStarten() {
  if (!app.isPackaged || (await erreichbar())) return;
  const datenbank = path.join(app.getPath("userData"), "nova-demo.db");
  if (!fs.existsSync(datenbank)) {
    fs.copyFileSync(
      path.join(process.resourcesPath, "demo-seed.db"),
      datenbank,
    );
  }
  const protokoll = fs.openSync(
    path.join(app.getPath("userData"), "nova-server.log"),
    "a",
  );
  novaServer = spawn(
    path.join(process.resourcesPath, "node.exe"),
    [
      path.join(
        app.getAppPath(),
        "node_modules",
        "next",
        "dist",
        "bin",
        "next",
      ),
      "start",
    ],
    {
      cwd: process.resourcesPath,
      windowsHide: true,
      stdio: ["ignore", protokoll, protokoll],
      env: {
        ...process.env,
        DATABASE_URL: `file:${datenbank.replaceAll("\\", "/")}`,
        NOVA_DESKTOP_DEMO: "true",
        NODE_ENV: "production",
        NODE_PATH: path.join(app.getAppPath(), "node_modules"),
        PORT: "3000",
      },
    },
  );
  for (let versuch = 0; versuch < 120; versuch += 1) {
    if (await erreichbar()) return;
    await new Promise((resolve) => setTimeout(resolve, 180));
  }
  throw new Error("NOVA konnte nicht gestartet werden.");
}

function splashErstellen() {
  const splash = new BrowserWindow({
    width: 560,
    height: 380,
    show: false,
    frame: false,
    resizable: false,
    movable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    center: true,
    backgroundColor: "#020617",
    icon: app.isPackaged
      ? path.join(process.resourcesPath, "nova-app-icon.ico")
      : path.join(__dirname, "assets", "nova-app-icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  splash.once("ready-to-show", () => splash.show());
  void splash.loadFile(path.join(__dirname, "splash.html"));
  return splash;
}

function fensterErstellen(
  serverBereit = Promise.resolve(),
  splash = null,
  splashGestartetAm = Date.now(),
) {
  const fenster = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    title: "NOVA Next",
    backgroundColor: "#020617",
    autoHideMenuBar: true,
    icon: app.isPackaged
      ? path.join(process.resourcesPath, "nova-app-icon.ico")
      : path.join(__dirname, "assets", "nova-app-icon.ico"),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });
  fenster.once("ready-to-show", () => {
    const restzeit = Math.max(
      0,
      splashDauer - (Date.now() - splashGestartetAm),
    );

    setTimeout(() => {
      if (splash && !splash.isDestroyed()) splash.close();
      fenster.maximize();
      fenster.show();
      fenster.focus();
    }, restzeit);
  });
  fenster.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  void serverBereit
    .then(() => {
      if (!fenster.isDestroyed()) {
        return fenster.loadURL(novaAdresse);
      }

      return undefined;
    })
    .catch((fehler) => {
      console.error("NOVA Start fehlgeschlagen:", fehler);

      if (splash && !splash.isDestroyed()) splash.close();
      if (!fenster.isDestroyed()) fenster.destroy();

      dialog.showErrorBox(
        "NOVA konnte nicht gestartet werden",
        "Der NOVA-Server konnte nicht vorbereitet werden. Bitte starte NOVA erneut.",
      );

      app.quit();
    });

  fenster.webContents.once("did-finish-load", () => {
    if (app.isPackaged && updateKonfiguriert) {
      setTimeout(() => void updatePruefen(), 5000);
    }
  });
}

app.whenReady().then(() => {
  app.setAppUserModelId("de.nova.erp");
  const splashGestartetAm = Date.now();
  const splash = splashErstellen();
  updaterEreignisseEinrichten();
  updaterEinrichten();
  ipcMain.on("nova-desktop-schliessen", () => app.quit());
  ipcMain.handle("nova-update-pruefen", updatePruefen);
  ipcMain.handle("nova-version", () => app.getVersion());
  ipcMain.handle("nova-update-herunterladen", async () => {
    if (!updateKonfiguriert) return { status: "nicht-konfiguriert" };
    try {
      await autoUpdater.downloadUpdate();
      return updateStatus;
    } catch (fehler) {
  console.error("NOVA Update-Download fehlgeschlagen:", fehler);

  dialog.showErrorBox(
    "NOVA Update-Fehler",
    fehler?.stack || fehler?.message || String(fehler),
  );

  return {
    status: "fehler",
    meldung: fehler?.message ?? String(fehler),
  };
}
  });
  ipcMain.handle("nova-update-installieren", () => {
    if (updateStatus.status !== "bereit") return false;
    setImmediate(() => autoUpdater.quitAndInstall(true, true));
    return true;
  });
  const serverBereit = paketServerStarten();
  fensterErstellen(serverBereit, splash, splashGestartetAm);
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) fensterErstellen();
  });
});
app.on("before-quit", () => {
  if (novaServer && !novaServer.killed) novaServer.kill();
});
app.on("window-all-closed", () => app.quit());
