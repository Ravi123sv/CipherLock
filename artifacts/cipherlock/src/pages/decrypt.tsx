import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDecryptFile, getGetFileStatsQueryKey, getListFileOperationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, FileJson, KeyRound, Download, CheckCircle2, AlertCircle, FileKey2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const formSchema = z.object({
  privateKey: z.string().min(1, "Private key is required")
    .refine(val => val.includes("PRIVATE KEY"), {
      message: "Does not look like a valid PEM private key"
    }),
});

export default function Decrypt() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [bundle, setBundle] = useState<any | null>(null);
  const [bundleFileName, setBundleFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  
  const decryptMutation = useDecryptFile();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      privateKey: "",
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = (selectedFile: File) => {
    setBundleFileName(selectedFile.name);
    setResult(null);
    form.reset();
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result?.toString();
        if (content) {
          const parsed = JSON.parse(content);
          if (!parsed.encryptedAesKey || !parsed.ciphertext || !parsed.iv || !parsed.authTag) {
            throw new Error("Invalid bundle format");
          }
          setBundle(parsed);
          toast({
            title: "Bundle loaded",
            description: "Encrypted file bundle loaded successfully.",
          });
        }
      } catch (err) {
        setBundle(null);
        toast({
          variant: "destructive",
          title: "Invalid file",
          description: "The file is not a valid CipherLock encrypted bundle (.clf or .json).",
        });
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [toast, form]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!bundle) return;

    decryptMutation.mutate({
      data: {
        encryptedAesKey: bundle.encryptedAesKey,
        iv: bundle.iv,
        authTag: bundle.authTag,
        ciphertext: bundle.ciphertext,
        privateKey: values.privateKey,
        fileName: bundle.fileName,
      }
    }, {
      onSuccess: (data) => {
        setResult(data);
        toast({
          title: "Decryption successful",
          description: "The file has been successfully decrypted.",
        });
        queryClient.invalidateQueries({ queryKey: getGetFileStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListFileOperationsQueryKey() });
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Decryption failed",
          description: error?.message || "Invalid private key or corrupted data.",
        });
      }
    });
  };

  const downloadResult = () => {
    if (!result || !result.fileData) return;
    
    // Decode base64 to binary
    const binaryString = window.atob(result.fileData);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.fileName || "decrypted_file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 font-mono flex items-center">
          <FileKey2 className="mr-3 h-8 w-8 text-primary" />
          Decrypt File
        </h1>
        <p className="text-muted-foreground">Recover secured files using your RSA private key.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr]">
        <Card className="border-border shadow-lg">
          <CardHeader>
            <CardTitle className="font-mono text-lg border-b border-border pb-2">1. Input Bundle</CardTitle>
          </CardHeader>
          <CardContent>
            {!bundle ? (
              <div 
                className={`border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50 hover:bg-secondary/20'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  accept=".json,.clf"
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                />
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">Upload Encrypted Bundle</h3>
                <p className="text-sm text-muted-foreground">Drop a .clf or .json file here</p>
              </div>
            ) : (
              <div className="bg-secondary/30 p-4 rounded-lg flex items-center justify-between border border-border">
                <div className="flex items-center space-x-4 overflow-hidden">
                  <div className="p-3 bg-primary/20 rounded-lg text-primary">
                    <FileJson className="h-6 w-6" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-mono font-medium truncate max-w-xs">{bundleFileName}</p>
                    <p className="text-xs text-muted-foreground">Target file: {bundle.fileName}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setBundle(null); setResult(null); }}>
                  Clear
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`border-border shadow-lg transition-opacity ${!bundle ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardHeader>
            <CardTitle className="font-mono text-lg border-b border-border pb-2 flex justify-between">
              <span>2. Decryption Key</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6 bg-amber-500/10 text-amber-500 border-amber-500/20">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Private Key Required</AlertTitle>
              <AlertDescription className="text-xs opacity-80">
                You must provide the exact RSA private key that corresponds to the public key used during encryption.
              </AlertDescription>
            </Alert>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="privateKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Private Key (PEM format)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="-----BEGIN PRIVATE KEY-----..." 
                          className="font-mono text-xs h-40 bg-secondary/20" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full font-mono font-bold tracking-wider relative overflow-hidden" 
                  disabled={!bundle || decryptMutation.isPending || !!result}
                >
                  {decryptMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 animate-pulse" />
                      DECRYPTING...
                    </span>
                  ) : result ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      DECRYPTED
                    </span>
                  ) : (
                    "DECRYPT BUNDLE"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-primary/50 shadow-[0_0_15px_rgba(20,184,166,0.15)] animate-in fade-in zoom-in-95 duration-300">
            <CardHeader className="bg-primary/5 border-b border-border pb-4">
              <CardTitle className="font-mono text-lg flex items-center text-primary">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                3. Recovered File
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-md border border-border">
                <div>
                  <p className="font-mono font-medium">{result.fileName}</p>
                  <p className="text-xs text-muted-foreground mt-1">Algorithm: {result.algorithm}</p>
                </div>
                <Button onClick={downloadResult}>
                  <Download className="mr-2 h-4 w-4" />
                  Save File
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
