import { redirect } from "next/navigation";
import ChaosMode from "@/components/admin/ChaosMode";
import { administratorAnfordern } from "@/lib/auth-server";

export default async function ChaosModeSeite() {
  if (!await administratorAnfordern()) redirect("/");
  return <ChaosMode />;
}
