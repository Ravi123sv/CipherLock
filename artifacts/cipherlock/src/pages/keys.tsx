import { useListKeyPairs, useGenerateKeyPair, useDeleteKeyPair } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Plus, Trash2, Copy, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function Keys() {
  const { data: keys, refetch } = useListKeyPairs();
  const generateKey = useGenerateKeyPair();
  const deleteKey = useDeleteKeyPair();
  
  const [label, setLabel] = useState("");
  const [size, setSize] = useState("2048");
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{ publicKey: string, privateKey: string } | null>(null);

  const handleGenerate = () => {
    generateKey.mutate({ data: { label, keySize: parseInt(size) } }, {
      onSuccess: (result) => {
        setGeneratedResult(result);
        refetch();
        toast.success("Key pair generated");
      },
      onError: () => toast.error("Failed to generate key pair")
    });
  };

  const handleDelete = (id: number) => {
    deleteKey.mutate({ id }, {
      onSuccess: () => {
        refetch();
        toast.success("Key pair deleted");
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Key Manager</h2>
          <p className="text-muted-foreground">Manage your RSA key pairs for encryption.</p>
        </div>
        <Dialog open={isGenerateOpen} onOpenChange={(open) => {
          setIsGenerateOpen(open);
          if (!open) setGeneratedResult(null);
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-key">
              <Plus className="mr-2 h-4 w-4" /> Generate Key Pair
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            {!generatedResult ? (
              <>
                <DialogHeader>
                  <DialogTitle>Generate New Key Pair</DialogTitle>
                  <DialogDescription>
                    Create a new RSA key pair for secure file transfers.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="label">Label</Label>
                    <Input 
                      id="label" 
                      value={label} 
                      onChange={(e) => setLabel(e.target.value)} 
                      placeholder="e.g. My MacBook Pro"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="size">Key Size</Label>
                    <Select value={size} onValueChange={setSize}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2048">2048-bit (Faster)</SelectItem>
                        <SelectItem value="4096">4096-bit (More secure)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleGenerate} disabled={generateKey.isPending || !label}>
                    {generateKey.isPending ? "Generating..." : "Generate Keys"}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Important: Save your Private Key
                  </DialogTitle>
                  <DialogDescription>
                    Your key pair has been generated. The private key cannot be recovered if lost.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Private Key</Label>
                    <div className="relative">
                      <pre className="p-4 bg-muted rounded-md overflow-x-auto text-xs font-mono max-h-40">
                        {generatedResult.privateKey}
                      </pre>
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="absolute top-2 right-2"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedResult.privateKey);
                          toast.success("Private key copied");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => setIsGenerateOpen(false)}>Done</Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="flex-1">
        <CardContent className="p-0">
          {(!keys || keys.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <KeyRound className="h-12 w-12 opacity-20 mb-4" />
              <p>No key pairs found. Generate one to get started.</p>
            </div>
          ) : (
            <div className="border rounded-md m-4 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Label</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium">Fingerprint</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {keys.map((key) => (
                    <tr key={key.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{key.label}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-md text-xs font-mono">
                          {key.keySize}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs truncate max-w-[150px] text-muted-foreground">
                        {key.fingerprint}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(key.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(key.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
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
    </div>
  );
}
