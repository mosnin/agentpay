import { redirect } from "next/navigation";

/** Settings has one surface today — land straight on API keys. */
export default function SettingsPage() {
  redirect("/settings/api-keys");
}
