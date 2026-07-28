import { redirect } from "next/navigation";

// Superseded by the Execution pillar: the negotiation detail — status, Deal
// Conductor, activity and action items — is now the Deal tab of the Run's
// workspace, reached by Run id rather than by negotiation id.
export default function RedirectPage() {
  redirect("/workspace");
}
