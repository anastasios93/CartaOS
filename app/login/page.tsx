"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2, CheckCircle2, Sparkles } from "lucide-react";

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState(authError === "CredentialsSignin" ? "Invalid email or password" : "");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleMicrosoftLogin() {
    await signIn("azure-ad", { callbackUrl: "/" });
  }

  async function handleDemoLogin() {
    setDemoLoading(true);
    setError("");
    try {
      // Ensure the shared demo account exists, then sign in with it
      const res = await fetch("/api/demo", { method: "POST" });
      if (!res.ok) throw new Error("Could not start demo");
      const { email: demoEmail, password: demoPassword } = await res.json();

      const result = await signIn("credentials", {
        email: demoEmail,
        password: demoPassword,
        redirect: false,
      });

      if (result?.error) {
        setError("Could not start demo session. Please try again.");
        setDemoLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not start demo session. Please try again.");
      setDemoLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#FAFAFA] px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-50/80 via-[#FAFAFA] to-[#FAFAFA]" />
      </div>

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97316] to-[#EA580C] shadow-xl shadow-[#F97316]/20">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2.5" fill="white" />
              <circle cx="8" cy="3" r="1.2" fill="white" opacity="0.8" />
              <circle cx="8" cy="13" r="1.2" fill="white" opacity="0.8" />
              <circle cx="3" cy="8" r="1.2" fill="white" opacity="0.8" />
              <circle cx="13" cy="8" r="1.2" fill="white" opacity="0.8" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">CartaOS</h1>
          <p className="mt-1 text-sm text-muted-foreground">The AI Operating System for Biotech Deals</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/40 bg-white p-8 shadow-sm">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-[#1A1A2E]">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Sign in to your account</p>
          </div>

          {registered && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2.5 text-sm text-green-700 mb-5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Account created! Sign in below.
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700 mb-5">
              {error}
            </div>
          )}

          {/* One-click demo access */}
          <Button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="h-11 w-full gap-2 bg-gradient-to-r from-[#0EA5E9] to-[#0284C7] text-white hover:opacity-90 shadow-sm mb-3"
          >
            {demoLoading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Starting demo...</>
            ) : (
              <><Sparkles className="h-4 w-4" />Explore Live Demo — No Signup</>
            )}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground mb-5">
            Instant access to the full platform with sample portfolio data
          </p>

          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-border/40" />
            <span className="text-[11px] text-muted-foreground/60 font-medium">or sign in</span>
            <div className="h-px flex-1 bg-border/40" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 border-border/60" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 pr-10 border-border/60" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="h-10 w-full bg-[#F97316] text-white hover:bg-[#EA580C] shadow-sm shadow-[#F97316]/20">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-border/40" />
            <span className="text-[11px] text-muted-foreground/60 font-medium">or</span>
            <div className="h-px flex-1 bg-border/40" />
          </div>

          <Button type="button" variant="outline" className="h-10 w-full gap-2.5 border-border/60" onClick={handleMicrosoftLogin}>
            <MicrosoftIcon />
            Sign in with Microsoft
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-5">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-[#F97316] hover:text-[#EA580C] font-medium transition-colors">Sign up</Link>
          </p>
        </div>

        <p className="mt-8 text-center text-[11px] text-muted-foreground/50">
          &copy; {new Date().getFullYear()} CartaOS, Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
