const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

const projekt = path.resolve(__dirname, "..");
const adresse = "http://localhost:3000/login";
const demoDatenbank = path.join(projekt, "desktop", "demo-seed.db");
let server = null;

function erreichbar() {
  return new Promise((resolve) => {
    const anfrage = http.get(adresse, (antwort) => {
      antwort.resume();
      resolve(true);
    });
    anfrage.setTimeout(1000, () => anfrage.destroy());
    anfrage.on("error", () => resolve(false));
  });
}

async function warten() {
  for (let versuch = 0; versuch < 60; versuch += 1) {
    if (await erreichbar()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Der NOVA-Server konnte nicht gestartet werden.");
}

async function starten() {
  if (!(await erreichbar())) {
    console.log("NOVA-Server wird gestartet ...");
    server = spawn("npm.cmd", ["run", "start"], {
      cwd: projekt,
      stdio: "inherit",
      windowsHide: true,
      shell: true,
      env: {
        ...process.env,
        DATABASE_URL: `file:${demoDatenbank.replaceAll("\\", "/")}`,
        NOVA_DESKTOP_DEMO: "true",
      },
    });
    await warten();
  }

  console.log("NOVA Desktop wird geöffnet ...");
  const electron = require("electron");
  const desktop = spawn(electron, [projekt], {
    cwd: projekt,
    stdio: "inherit",
    env: { ...process.env, NOVA_DESKTOP_URL: adresse },
  });

  desktop.on("exit", (code) => {
    if (server && !server.killed) server.kill();
    process.exit(code ?? 0);
  });
}

process.on("SIGINT", () => {
  if (server && !server.killed) server.kill();
  process.exit(0);
});

starten().catch((error) => {
  console.error(error.message);
  if (server && !server.killed) server.kill();
  process.exit(1);
});
