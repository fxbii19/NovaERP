const { execFileSync } = require("node:child_process");
const path = require("node:path");

const frontend = path.resolve(__dirname, "..");
const desktopNode = path.join(frontend, "desktop", "runtime", "node.exe");
const zielVersion = execFileSync(desktopNode, ["-p", "process.version"], {
  encoding: "utf8",
}).trim().replace(/^v/, "");

const befehl = process.platform === "win32" ? process.env.ComSpec : "npm";
const argumente =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "npm.cmd rebuild better-sqlite3"]
    : ["rebuild", "better-sqlite3"];

execFileSync(befehl, argumente, {
  cwd: frontend,
  env: {
    ...process.env,
    npm_config_runtime: "node",
    npm_config_target: zielVersion,
  },
  stdio: "inherit",
});

execFileSync(
  desktopNode,
  ["-e", "require('./node_modules/better-sqlite3'); console.log('SQLite Desktop-Laufzeit ist kompatibel.')"],
  { cwd: frontend, stdio: "inherit" },
);
