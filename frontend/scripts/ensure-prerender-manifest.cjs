const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const manifestPfad = path.join(
  process.cwd(),
  ".next-runtime",
  "prerender-manifest.json"
);

if (!fs.existsSync(manifestPfad)) {
  const zufall = () => crypto.randomBytes(32).toString("hex");

  fs.writeFileSync(
    manifestPfad,
    JSON.stringify(
      {
        version: 4,
        routes: {},
        dynamicRoutes: {},
        notFoundRoutes: [],
        preview: {
          previewModeId: zufall(),
          previewModeSigningKey: zufall(),
          previewModeEncryptionKey: zufall(),
        },
      },
      null,
      2
    )
  );

  console.log("Fehlendes Prerender-Manifest wurde ergänzt.");
}
