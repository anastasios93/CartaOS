"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The Intelligence Hub has been integrated into the Portfolio Overview (/).
 * This page redirects there.
 */
export default function HubPageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
