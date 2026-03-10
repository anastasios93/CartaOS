"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Link as LinkIcon,
  Key,
  Database,
  Bell,
  Palette,
  RefreshCw,
  Check,
  Copy,
  Sun,
  Moon,
  Save,
  Loader2,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Toggle Switch (inline — no separate component file needed)                */
/* -------------------------------------------------------------------------- */

function Switch({
  checked,
  onCheckedChange,
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <button
      id={id}
      role="switch"
      type="button"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full
        border border-transparent transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        ${checked ? "bg-[#F97316]" : "bg-[#1E293B]"}
      `}
    >
      <span
        className={`
          pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform
          ${checked ? "translate-x-4" : "translate-x-0.5"}
        `}
      />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Settings Page                                                             */
/* -------------------------------------------------------------------------- */

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  // Profile (read-only mock data matching sidebar user)
  const profile = {
    name: "Alex Kim",
    email: "alex.kim@cartaos.io",
    role: "Chief Business Officer",
    company: "CartaOS, Inc.",
  };

  // Microsoft 365 integration
  const [msConnected, setMsConnected] = useState(false);
  const [msConnecting, setMsConnecting] = useState(false);

  // API Keys
  const apiKey = "ctos_sk_••••••••••••••••••••a3f7";
  const [keyCopied, setKeyCopied] = useState(false);

  // Data sources
  const [secEdgar, setSecEdgar] = useState(true);
  const [clinicalTrials, setClinicalTrials] = useState(false);

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [dealAlerts, setDealAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Save
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleConnectMs() {
    setMsConnecting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setMsConnected(true);
    setMsConnecting(false);
  }

  function handleCopyKey() {
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account, integrations, and preferences
        </p>
      </div>

      <div className="grid gap-6">
        {/* ---------------------------------------------------------------- */}
        {/*  Profile                                                         */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#F97316]">
              <User className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <ReadOnlyField label="Name" value={profile.name} />
              <ReadOnlyField label="Email" value={profile.email} />
              <ReadOnlyField label="Role" value={profile.role} />
              <ReadOnlyField label="Company" value={profile.company} />
            </div>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/*  Microsoft 365 Integration                                       */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#F97316]">
              <LinkIcon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Microsoft 365 Integration</CardTitle>
              <CardDescription>
                Connect your Microsoft account for email and calendar sync
              </CardDescription>
            </div>
            <Badge
              variant={msConnected ? "default" : "secondary"}
              className={
                msConnected
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                  : ""
              }
            >
              {msConnected ? "Connected" : "Not connected"}
            </Badge>
          </CardHeader>
          <CardContent>
            <Button
              variant={msConnected ? "outline" : "default"}
              onClick={handleConnectMs}
              disabled={msConnecting || msConnected}
              className={
                !msConnected
                  ? "bg-[#F97316] text-white hover:bg-[#F97316]/90"
                  : ""
              }
            >
              {msConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : msConnected ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Connected
                </>
              ) : (
                "Connect Microsoft 365"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/*  API Keys                                                        */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#F97316]">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">API Keys</CardTitle>
              <CardDescription>Manage API keys for programmatic access</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Input
                  readOnly
                  value={apiKey}
                  className="h-9 font-mono text-xs bg-secondary/50 pr-9"
                />
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {keyCopied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Keep your API key secure. It grants full access to your account.
            </p>
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/*  Data Sources                                                     */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#F97316]">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Data Sources</CardTitle>
              <CardDescription>Configure automatic data synchronization</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              id="sec-edgar"
              label="SEC EDGAR"
              description="Auto-sync filings and disclosures from SEC"
              checked={secEdgar}
              onCheckedChange={setSecEdgar}
            />
            <Separator className="bg-border/50" />
            <ToggleRow
              id="clinical-trials"
              label="ClinicalTrials.gov"
              description="Auto-sync clinical trial registrations and results"
              checked={clinicalTrials}
              onCheckedChange={setClinicalTrials}
            />
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/*  Notifications                                                    */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#F97316]">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription>Control how you receive updates</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleRow
              id="email-notifs"
              label="Email Notifications"
              description="Receive important updates via email"
              checked={emailNotifs}
              onCheckedChange={setEmailNotifs}
            />
            <Separator className="bg-border/50" />
            <ToggleRow
              id="deal-alerts"
              label="Deal Alerts"
              description="Get notified when new relevant deals are detected"
              checked={dealAlerts}
              onCheckedChange={setDealAlerts}
            />
            <Separator className="bg-border/50" />
            <ToggleRow
              id="weekly-digest"
              label="Weekly Digest"
              description="Receive a weekly summary of deal activity"
              checked={weeklyDigest}
              onCheckedChange={setWeeklyDigest}
            />
          </CardContent>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/*  Theme                                                           */}
        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F97316]/10 text-[#F97316]">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Theme</CardTitle>
              <CardDescription>Choose your preferred appearance</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <ThemeButton
                active={theme === "dark"}
                icon={<Moon className="h-4 w-4" />}
                label="Dark"
                onClick={() => setTheme("dark")}
              />
              <ThemeButton
                active={theme === "light"}
                icon={<Sun className="h-4 w-4" />}
                label="Light"
                onClick={() => setTheme("light")}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Save button                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex items-center justify-end gap-3 pb-6">
        {saved && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            Settings saved
          </span>
        )}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-w-[120px] bg-[#F97316] text-white hover:bg-[#F97316]/90"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared sub-components                                                     */
/* -------------------------------------------------------------------------- */

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex h-9 items-center rounded-lg border border-border/50 bg-secondary/30 px-3 text-sm">
        {value}
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ThemeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex flex-col items-center gap-2 rounded-xl border p-4 transition-all min-w-[100px]
        ${
          active
            ? "border-[#F97316] bg-[#F97316]/10 text-[#F97316]"
            : "border-border/50 bg-secondary/30 text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
        }
      `}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
