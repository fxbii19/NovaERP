const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("novaDesktop", {
  aktiv: true,
  schliessen: () => ipcRenderer.send("nova-desktop-schliessen"),
  updatePruefen: () => ipcRenderer.invoke("nova-update-pruefen"),
  updateHerunterladen: () => ipcRenderer.invoke("nova-update-herunterladen"),
  updateInstallieren: () => ipcRenderer.invoke("nova-update-installieren"),
  version: () => ipcRenderer.invoke("nova-version"),
  updateStatusEmpfangen: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("nova-update-status", listener);
    return () => ipcRenderer.removeListener("nova-update-status", listener);
  },
});
