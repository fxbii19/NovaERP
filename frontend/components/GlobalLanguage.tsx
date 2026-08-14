"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { systemText } from "@/lib/system-i18n";

const originalTexte = new WeakMap<Text, string>();
const originalAttribute = new WeakMap<Element, Record<string, string>>();
const ATTRIBUTE = ["placeholder", "title", "aria-label"];

export default function GlobalLanguage() {
  const { einstellungen, geladen } = useTheme();

  useEffect(() => {
    if (!geladen) return;
    const region = einstellungen.spracheRegion;

    function uebersetzen(root: ParentNode) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode() as Text | null;
      while (node) {
        const parent = node.parentElement;
        if (parent && !parent.closest("script,style,textarea,code,pre,[data-no-translate]")) {
          const aktuell = node.nodeValue ?? "";
          if (!originalTexte.has(node)) originalTexte.set(node, aktuell);
          const original = originalTexte.get(node) ?? aktuell;
          const kern = original.trim();
          if (kern) node.nodeValue = original.replace(kern, systemText(region, kern));
        }
        node = walker.nextNode() as Text | null;
      }

      const elemente = root instanceof Element ? [root, ...root.querySelectorAll("*")] : [...root.querySelectorAll("*")];
      for (const element of elemente) {
        if (element.matches("[data-no-translate]")) continue;
        const originals = originalAttribute.get(element) ?? {};
        for (const attribut of ATTRIBUTE) {
          const wert = element.getAttribute(attribut);
          if (wert && !originals[attribut]) originals[attribut] = wert;
          if (originals[attribut]) element.setAttribute(attribut, systemText(region, originals[attribut]));
        }
        originalAttribute.set(element, originals);
      }
    }

    uebersetzen(document.body);
    const observer = new MutationObserver((aenderungen) => {
      for (const aenderung of aenderungen) {
        for (const node of aenderung.addedNodes) {
          if (node instanceof Element || node instanceof DocumentFragment) uebersetzen(node);
          else if (node instanceof Text && node.parentNode) uebersetzen(node.parentNode);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [einstellungen.spracheRegion, geladen]);

  return null;
}
