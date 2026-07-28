import { redirect } from "next/navigation";

// Superseded by the Strategy pillar: partner shortlists and the deal-economics
// calculators now live in the route comparison and assumptions panel.
export default function RedirectPage() {
  redirect("/strategy");
}
