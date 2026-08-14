"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { systemText } from "@/lib/system-i18n";

type TextZustand = { original: string; zuletztGesetzt: string };
type AttributZustand = Record<string, { original: string; zuletztGesetzt: string }>;

const textZustaende = new WeakMap<Text, TextZustand>();
const attributZustaende = new WeakMap<Element, AttributZustand>();
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
          let zustand = textZustaende.get(node);
          if (!zustand || aktuell !== zustand.zuletztGesetzt) {
            zustand = { original: aktuell, zuletztGesetzt: aktuell };
          }
          const original = zustand.original;
          const kern = original.trim();
          if (kern) {
            const uebersetzt = original.replace(kern, systemText(region, kern));
            node.nodeValue = uebersetzt;
            zustand.zuletztGesetzt = uebersetzt;
          }
          textZustaende.set(node, zustand);
        }
        node = walker.nextNode() as Text | null;
      }

      const elemente = root instanceof Element ? [root, ...root.querySelectorAll("*")] : [...root.querySelectorAll("*")];
      for (const element of elemente) {
        if (element.matches("[data-no-translate]")) continue;
        const zustaende = attributZustaende.get(element) ?? {};
        for (const attribut of ATTRIBUTE) {
          const wert = element.getAttribute(attribut);
          if (wert && (!zustaende[attribut] || wert !== zustaende[attribut].zuletztGesetzt)) {
            zustaende[attribut] = { original: wert, zuletztGesetzt: wert };
          }
          if (zustaende[attribut]) {
            const uebersetzt = systemText(region, zustaende[attribut].original);
            element.setAttribute(attribut, uebersetzt);
            zustaende[attribut].zuletztGesetzt = uebersetzt;
          }
        }
        attributZustaende.set(element, zustaende);
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
