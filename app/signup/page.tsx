"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-white px-4">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-50 via-white to-white" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo + tagline */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F97316] to-[#C2410C] shadow-lg shadow-[#F97316]/20">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="2" fill="white" />
              <circle cx="8" cy="3" r="1.5" fill="white" opacity="0.7" />
              <circle cx="8" cy="13" r="1.5" fill="white" opacity="0.7" />
              <circle cx="3" cy="8" r="1.5" fill="white" opacity="0.7" />
              <circle cx="13" cy="8" r="1.5" fill="white" opacity="0.7" />
              <line x1="8" y1="4.5" x2="8" y2="6" stroke="white" strokeWidth="0.8" opacity="0.5" />
              <line x1="8" y1="10" x2="8" y2="11.5" stroke="white" strokeWidth="0.8" opacity="0.5" />
              <line x1="4.5" y1="8" x2="6" y2="8" stroke="white" strokeWidth="0.8" opacity="0.5" />
              <line x1="10" y1="8" x2="11.5" y2="8" stroke="white" strokeWidth="0.8" opacity="0.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A1A2E]">CartaOS</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            The AI Operating System for Biotech Deals
          </p>
        </div>

        {/* Signup Card */}
        <Card className="border border-[#E5E7EB] bg-white shadow-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-lg text-[#1A1A2E]">Create your account</CardTitle>
            <CardDescription>Get started with CartaOS</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[#1A1A2E]">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Alex Kim"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#1A1A2E]">Work Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#1A1A2E]">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-10 w-full bg-[#F97316] text-white hover:bg-[#F97316]/90 focus-visible:ring-[#F97316]/50"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-[#6B7280]">
              Already have an account?{" "}
              <Link href="/login" className="text-[#F97316] hover:text-[#F97316]/80 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-[11px] text-[#9CA3AF]">
          &copy; {new Date().getFullYear()} CartaOS, Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
