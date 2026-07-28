import { redirect } from "next/navigation";

// This screen was folded into the Diagnosis pillar (see PHASE0_AUDIT.md).
export default function RedirectPage() {
  redirect("/diagnosis");
}
