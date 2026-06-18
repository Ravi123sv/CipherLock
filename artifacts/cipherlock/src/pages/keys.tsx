import { useListKeyPairs, useGenerateKeyPair, useDeleteKeyPair, getListKeyPairsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Plus, Trash2, Copy, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import type { KeyPairResult } from "@workspace/api-client-react";

export default function Keys() {
  const queryClient = useQueryClient();
  const { data: keys } = useListKeyPairs();
  const generateKey = useGenerateKeyPair();
  const deleteKey = useDeleteKeyPair();

  const [label, setLabel] = useState("");
  const [size, setSize] = useState("2048");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<KeyPairResult | null>(null);
  const [showPrivate, setShowPrivate] = useState(false);
  const [viewKey, setViewKey] = useState<KeyPairResult | null>(null);

  const handleGenerate = () => {
    if (!label.trim()) return;
    generateKey.mutate(
      { data: { label: label.trim(), keySize: parseInt(size) } },
      {
        onSuccess: (result) => {
          setGeneratedResult(result);
          queryClient.invalidateQueries({ queryKey: getListKeyPairsQueryKey() });
          toast.success("Key pair generated successfully");
        },
        onError: () => toast.error("Failed to generate key pair"),
      }
    );
  };

  const handleCloseGenerate = () => {
    setIsGenerateOpen(false);
    setGeneratedResult(null);
    setLabel("");
    setSize("2048");
    setShowPrivate(false);
  };

  const handleDelete = (id: number, keyLabel: string) => {
    deleteKey.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListKeyPairsQueryKey() });
          toast.success(`"${keyLabel}" deleted`);
        },
        onError: () => toast.error("Failed to delete key pair"),
      }
    );
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied to clipboard`));
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Key Manager</h2>
          <p className="text-muted-foreground">Manage your RSA key pairs for encryption.</p>
        </div>

        <Dialog open={isGenerateOpen} onOpenChange={(open) => { if (!open) handleCloseGenerate(); else setIsGenerateOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-key">
              <Plus className="mr-2 h-4 w-4" /> Generate Key Pair
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            {!generatedResult ? (
              <>
                <DialogHeader>
                  <DialogTitle>Generate New Key Pair</DialogTitle>
                  <DialogDescription>
                    Creates a new RSA key pair stored on this server. Save the private key — it cannot be recovered later.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="key-label">Label</Label>
                    <Input
                      id="key-label"
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      placeholder="e.g. My Laptop — Work"
                      data-testid="input-key-label"
                      onKeyDown={(e) => e.key === "Enter" && label.trim() && handleGenerate()}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="key-size">Key Size</Label>
                    <Select value={size} onValueChange={setSize}>
                      <SelectTrigger id="key-size" data-testid="select-key-size">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2048">2048-bit — Faster, still secure</SelectItem>
                        <SelectItem value="4096">4096-bit — Slower, maximum security</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={handleCloseGenerate}>Cancel</Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={generateKey.isPending || !label.trim()}
                    data-testid="button-generate-confirm"
                  >
                    {generateKey.isPending ? "Generating…" : "Generate Keys"}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-amber-500">
                    <AlertTriangle className="h-5 w-5" />
                    Save your Private Key now
                  </DialogTitle>
                  <DialogDescription>
                    This is the only time you will see the private key. It is not recoverable if lost.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Public Key</Label>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => copyToClipboard(generatedResult.publicKey, "Public key")}>
                        <Copy className="h-3 w-3" /> Copy
                      </Button>
                    </div>
                    <pre className="p-3 bg-muted rounded-md overflow-x-auto text-xs font-mono max-h-24 text-muted-foreground">
                      {generatedResult.publicKey.slice(0, 100)}…
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Private Key</Label>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowPrivate(!showPrivate)}>
                          {showPrivate ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          {showPrivate ? "Hide" : "Show"}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => copyToClipboard(generatedResult.privateKey, "Private key")}>
                          <Copy className="h-3 w-3" /> Copy
                        </Button>
                      </div>
                    </div>
                    <pre className="p-3 bg-muted rounded-md overflow-x-auto text-xs font-mono max-h-32 border border-amber-500/30">
                      {showPrivate ? generatedResult.privateKey : "••••••••••••••••••••••••••••••••••••••••••••••••"}
                    </pre>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => copyToClipboard(generatedResult.privateKey, "Private key")} className="gap-1.5">
                    <Copy className="h-4 w-4" /> Copy Private Key
                  </Button>
                  <Button onClick={handleCloseGenerate} data-testid="button-done">Done</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="flex-1">
        <CardContent className="p-0">
          {(!keys || keys.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <KeyRound className="h-12 w-12 opacity-15 mb-4" />
              <p className="font-medium">No key pairs yet</p>
              <p className="text-sm mt-1">Generate one to start encrypting files.</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/40 text-muted-foreground border-b">
                  <tr>
                    <th className="px-5 py-3 font-medium">Label</th>
                    <th className="px-5 py-3 font-medium">Size</th>
                    <th className="px-5 py-3 font-medium">Fingerprint</th>
                    <th className="px-5 py-3 font-medium">Created</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {keys.map((key) => (
                    <tr key={key.id} className="hover:bg-muted/20 transition-colors" data-testid={`row-key-${key.id}`}>
                      <td className="px-5 py-3 font-medium">{key.label}</td>
                      <td className="px-5 py-3">
                        <Badge variant="secondary" className="font-mono text-xs">{key.keySize}-bit</Badge>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground max-w-[160px] truncate">
                        {key.fingerprint}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">
                        {format(new Date(key.createdAt), "MMM d, yyyy 'at' HH:mm")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(key.id, key.label)}
                          data-testid={`button-delete-key-${key.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View full key dialog */}
      <Dialog open={!!viewKey} onOpenChange={(open) => { if (!open) setViewKey(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewKey?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Public Key</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => viewKey && copyToClipboard(viewKey.publicKey, "Public key")}>
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </Button>
              </div>
              <pre className="p-3 bg-muted rounded-md overflow-x-auto text-xs font-mono max-h-40">{viewKey?.publicKey}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setViewKey(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
