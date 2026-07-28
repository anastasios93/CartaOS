import { redirect } from "next/navigation";

// Superseded by the Execution pillar: a negotiation is no longer its own object
// to browse — it attaches to a Run, and the Deal Workspace is that Run opened.
export default function RedirectPage() {
  redirect("/workspace");
}
