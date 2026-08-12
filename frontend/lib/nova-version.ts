export const NOVA_STATUS = "Aktive Entwicklung";

export async function novaVersion() {
  if (typeof window === "undefined") {
    return "0.0.0";
  }

  if (window.novaDesktop?.version) {
    try {
      return await window.novaDesktop.version();
    } catch {
      return "0.0.0";
    }
  }

  return "0.0.0";
}