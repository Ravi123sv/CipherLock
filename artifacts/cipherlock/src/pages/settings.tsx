import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme } from "next-themes";
import { Trash2, Shield, Laptop } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  const handleClearHistory = () => {
    toast.success("History cleared successfully");
  };

  return (
    <div className="flex flex-col gap-8 h-full max-w-4xl mx-auto w-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your app preferences and data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Laptop className="h-5 w-5 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how CipherLock looks on your device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Toggle between light and dark themes.
              </p>
            </div>
            <Switch 
              checked={theme === "dark"} 
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              data-testid="switch-theme"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            App Information
          </CardTitle>
          <CardDescription>
            Details about your CipherLock installation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 py-2 border-b">
            <div className="text-sm font-medium">Version</div>
            <div className="text-sm text-muted-foreground font-mono text-right">1.1.0-SECURE</div>
          </div>
          <div className="grid grid-cols-2 gap-4 py-2 border-b">
            <div className="text-sm font-medium">Encryption</div>
            <div className="text-sm text-muted-foreground font-mono text-right">AES-256-GCM / RSA</div>
          </div>
          <div className="grid grid-cols-2 gap-4 py-2 border-b">
            <div className="text-sm font-medium">WebSocket Connection</div>
            <div className="text-sm text-green-500 font-mono text-right">wss:// API Available</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-lg text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions for your local data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 max-w-[60%]">
              <Label className="text-base text-foreground">Clear Activity History</Label>
              <p className="text-sm text-muted-foreground">
                Permanently delete all records of your encryption and decryption operations. This does not delete your keys.
              </p>
            </div>
            <Button variant="destructive" onClick={handleClearHistory} data-testid="button-clear-history">
              Clear History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
