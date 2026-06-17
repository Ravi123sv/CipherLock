import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useListKeyPairs, useGenerateKeyPair, useDeleteKeyPair, getListKeyPairsQueryKey, getGetFileStatsQueryKey, KeyPairResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { KeyRound, Plus, Trash2, Copy, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const generateFormSchema = z.object({
  label: z.string().min(1, "Label is required").max(50),
  keySize: z.string(),
});

export default function Keys() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: keys, isLoading } = useListKeyPairs();
  const generateMutation = useGenerateKeyPair();
  const deleteMutation = useDeleteKeyPair();
  
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<KeyPairResult | null>(null);

  const form = useForm<z.infer<typeof generateFormSchema>>({
    resolver: zodResolver(generateFormSchema),
    defaultValues: {
      label: "",
      keySize: "2048",
    },
  });

  const onGenerate = (values: z.infer<typeof generateFormSchema>) => {
    generateMutation.mutate({
      data: {
        label: values.label,
        keySize: parseInt(values.keySize),
      }
    }, {
      onSuccess: (data) => {
        setNewKeyResult(data);
        setIsGenerateOpen(false);
        queryClient.invalidateQueries({ queryKey: getListKeyPairsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFileStatsQueryKey() });
        form.reset();
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Generation failed",
          description: err?.message || "Failed to generate key pair",
        });
      }
    });
  };

  const onDelete = (id: number) => {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({
          title: "Key deleted",
          description: "The key pair has been removed.",
        });
        queryClient.invalidateQueries({ queryKey: getListKeyPairsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFileStatsQueryKey() });
      },
      onError: (err: any) => {
        toast({
          variant: "destructive",
          title: "Deletion failed",
          description: err?.message || "Failed to delete key pair",
        });
      }
    });
  };

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: `${description} copied to clipboard`,
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-mono flex items-center">
            <KeyRound className="mr-3 h-8 w-8 text-primary" />
            Key Manager
          </h1>
          <p className="text-muted-foreground">Manage your RSA key pairs for file encryption.</p>
        </div>
        
        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono">
              <Plus className="mr-2 h-4 w-4" />
              Generate Key Pair
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-mono">Generate New Key Pair</DialogTitle>
              <DialogDescription>
                Create a new RSA key pair. This operation is done securely on the server.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onGenerate)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Label</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Finance Dept, Project Alpha" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="keySize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Size</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select key size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="2048">2048-bit (Standard)</SelectItem>
                          <SelectItem value="4096">4096-bit (High Security)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        4096-bit keys are more secure but slower to generate and use.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={generateMutation.isPending}>
                    {generateMutation.isPending ? "Generating..." : "Generate Keys"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!newKeyResult} onOpenChange={(open) => !open && setNewKeyResult(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-primary font-mono">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Key Pair Generated Successfully
            </DialogTitle>
            <DialogDescription className="text-destructive font-semibold flex items-start gap-2 bg-destructive/10 p-3 rounded-md border border-destructive/20 mt-4">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <span>CRITICAL: Save this private key now. It is NOT stored on the server and cannot be recovered if lost.</span>
            </DialogDescription>
          </DialogHeader>
          
          {newKeyResult && (
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Private Key</span>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(newKeyResult.privateKey, "Private key")}>
                    <Copy className="h-3 w-3 mr-2" /> Copy
                  </Button>
                </div>
                <Textarea 
                  readOnly 
                  value={newKeyResult.privateKey} 
                  className="font-mono text-[10px] h-40 bg-secondary/30 border-destructive/30"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Public Key</span>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(newKeyResult.publicKey, "Public key")}>
                    <Copy className="h-3 w-3 mr-2" /> Copy
                  </Button>
                </div>
                <Textarea 
                  readOnly 
                  value={newKeyResult.publicKey} 
                  className="font-mono text-[10px] h-32 bg-secondary/10"
                />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button onClick={() => setNewKeyResult(null)}>I have saved the private key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))
        ) : keys?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-secondary/10 rounded-lg border border-dashed border-border">
            <KeyRound className="mx-auto h-12 w-12 opacity-20 mb-4" />
            <p className="font-medium text-lg">No keys stored</p>
            <p className="text-sm">Generate your first key pair to start encrypting files.</p>
          </div>
        ) : (
          keys?.map(key => (
            <Card key={key.id} className="flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <CardTitle className="font-mono text-lg truncate pr-2" title={key.label}>
                    {key.label}
                  </CardTitle>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0 -mt-2 -mr-2">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Key Pair?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove the metadata for "{key.label}". Files encrypted with this public key can still be decrypted if you have the private key saved externally.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(key.id)} className="bg-destructive text-destructive-foreground">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <CardDescription className="text-xs">
                  Created {format(new Date(key.createdAt), 'MMM d, yyyy')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Key Size</span>
                  <p className="font-mono text-sm">{key.keySize}-bit RSA</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Fingerprint</span>
                  <div className="bg-secondary/50 p-2 rounded text-xs font-mono break-all leading-tight border border-border">
                    {key.fingerprint}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
