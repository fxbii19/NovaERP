const fs = require("node:fs");
const path = require("node:path");

const buildOrdner = path.join(process.cwd(), ".next-runtime");

fs.rmSync(buildOrdner, { recursive: true, force: true });
console.log("Alter NOVA-Build wurde entfernt.");
