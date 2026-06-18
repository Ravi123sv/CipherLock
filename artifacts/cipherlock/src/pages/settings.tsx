import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { Trash2, Shield, Laptop, Download, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useListFileOperations, getListFileOperationsQueryKey, getGetFileStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [clearing, setClearing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/files", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      queryClient.invalidateQueries({ queryKey: getListFileOperationsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetFileStatsQueryKey() });
      toast.success("Activity history cleared");
    } catch {
      toast.error("Failed to clear history");
    } finally {
      setClearing(false);
    }
  };

  const handleDownloadSource = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/download/source");
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cipherlock-source.tar.gz";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Download started — cipherlock-source.tar.gz");
    } catch {
      toast.error("Failed to download source code");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto w-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your app preferences and data.</p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Laptop className="h-5 w-5 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>Customize how CipherLock looks on your device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Dark Mode</Label>
              <p className="text-xs text-muted-foreground">Toggle between light and dark themes.</p>
            </div>
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              data-testid="switch-theme"
            />
          </div>
        </CardContent>
      </Card>

      {/* Download Source */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Download Source Code
          </CardTitle>
          <CardDescription>
            Get the full source code for CipherLock as a ZIP archive. Free to use, modify, and self-host.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">cipherlock-source.tar.gz</p>
              <p className="text-xs text-muted-foreground">Includes frontend, API server, database schema, and all shared libraries.</p>
            </div>
            <Button
              onClick={handleDownloadSource}
              disabled={downloading}
              data-testid="button-download-source"
            >
              {downloading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing…</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download Free</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            App Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y">
          {[
            { label: "Version", value: "1.1.0-SECURE" },
            { label: "Encryption", value: "AES-256-GCM + RSA-OAEP" },
            { label: "Key sizes", value: "2048-bit / 4096-bit" },
            { label: "WebSocket", value: "Real-time room signaling" },
          ].map(({ label, value }) => (
            <div key={label} className="grid grid-cols-2 gap-4 py-3">
              <div className="text-sm font-medium">{label}</div>
              <div className="text-sm text-muted-foreground font-mono text-right">{value}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions — proceed with care.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium text-foreground">Clear Activity History</Label>
              <p className="text-xs text-muted-foreground">
                Permanently deletes all encryption and decryption operation records. Keys are not affected.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={clearing} data-testid="button-clear-history">
                  {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Clear History"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Clear all history?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all activity records. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearHistory} className="bg-destructive hover:bg-destructive/90">
                    Yes, clear history
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
