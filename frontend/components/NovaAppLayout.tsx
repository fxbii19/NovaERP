"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import NovaSidebar from "./NovaSidebar";
import NovaAiChatButton from "./NovaAiChatButton";
import GlobaleSuche from "./GlobaleSuche";
import MotivationsPopup from "./MotivationsPopup";
import BenachrichtigungsGlocke from "./dashboard/BenachrichtigungsGlocke";
import DesktopUpdateDialog from "./DesktopUpdateDialog";
import NovaTopbar from "./NovaTopbar";

type NovaAppLayoutProps = {
  children: ReactNode;
};

export default function NovaAppLayout({ children }: NovaAppLayoutProps) {
  const pathname = usePathname();

  if (pathname === "/next" || pathname.startsWith("/next/")) {
    return <>{children}</>;
  }

  const ohneSidebar =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/beendet";

  if (ohneSidebar) {
    return (
      <>
        {children}
        <DesktopUpdateDialog />
      </>
    );
  }

  if (pathname === "/lager/mde") {
    return (
      <div className="min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)]">
        {children}
        <div className="fixed right-6 top-6 z-[70]">
          <BenachrichtigungsGlocke />
        </div>
      </div>
    );
  }

  return (
    <div className="nova-enterprise-shell min-h-screen bg-[var(--nova-hintergrund)] text-[var(--nova-text)] transition-colors duration-300">
      <NovaSidebar />

      <NovaTopbar />
        <div className="nova-enterprise-content min-h-screen pl-[236px] pt-[76px]">{children}</div>

      <GlobaleSuche />
      <MotivationsPopup />
      <DesktopUpdateDialog />

      {pathname !== "/nova-ai" && <NovaAiChatButton />}
    </div>
  );
}
