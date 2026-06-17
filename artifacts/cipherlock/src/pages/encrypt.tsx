import { useState, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEncryptFile, useListKeyPairs, getGetFileStatsQueryKey, getListFileOperationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UploadCloud, File, Lock, Download, CheckCircle2, FileLock2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formSchema = z.object({
  keySource: z.enum(["stored", "manual"]),
  keyId: z.string().optional(),
  publicKey: z.string().optional(),
}).refine(data => {
  if (data.keySource === "stored" && !data.keyId) return false;
  if (data.keySource === "manual" && (!data.publicKey || data.publicKey.trim() === "")) return false;
  return true;
}, {
  message: "Please select a key or provide a valid public key",
  path: ["keyId"]
});

export default function Encrypt() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  
  const { data: keys, isLoading: keysLoading } = useListKeyPairs();
  const encryptMutation = useEncryptFile();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      keySource: "stored",
      keyId: "",
      publicKey: "",
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
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 10MB.",
      });
      return;
    }

    setFile(selectedFile);
    setResult(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result?.toString().split(',')[1];
      if (base64) {
        setFileData(base64);
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!file || !fileData) {
      toast({
        variant: "destructive",
        title: "Missing file",
        description: "Please select a file to encrypt.",
      });
      return;
    }

    let publicKey = values.publicKey;
    
    if (values.keySource === "stored") {
      const selectedKey = keys?.find(k => k.id.toString() === values.keyId);
      // If we're using a stored key, the API needs just the keyId
      // We don't have the public key in the list response
      // But the generated type requires publicKey, so we send a dummy or fetch it
      // Actually we'll just send keyId and a placeholder
      publicKey = "STORED_KEY";
    }

    encryptMutation.mutate({
      data: {
        fileName: file.name,
        fileData: fileData,
        publicKey: publicKey || "",
        keyId: values.keySource === "stored" ? parseInt(values.keyId || "0") : undefined
      }
    }, {
      onSuccess: (data) => {
        setResult(data);
        toast({
          title: "Encryption successful",
          description: "Your file has been secured with Hybrid AES-RSA.",
        });
        queryClient.invalidateQueries({ queryKey: getGetFileStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListFileOperationsQueryKey() });
      },
      onError: (error: any) => {
        toast({
          variant: "destructive",
          title: "Encryption failed",
          description: error?.message || "An unexpected error occurred.",
        });
      }
    });
  };

  const downloadResult = () => {
    if (!result) return;
    
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.fileName}.clf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const keySource = form.watch("keySource");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 font-mono flex items-center">
          <FileLock2 className="mr-3 h-8 w-8 text-primary" />
          Encrypt File
        </h1>
        <p className="text-muted-foreground">Secure your files using Hybrid AES-GCM + RSA encryption.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr]">
        <Card className="border-border shadow-lg">
          <CardHeader>
            <CardTitle className="font-mono text-lg border-b border-border pb-2">1. Input Target</CardTitle>
          </CardHeader>
          <CardContent>
            {!file ? (
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
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                />
                <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">Drag & drop your file here</h3>
                <p className="text-sm text-muted-foreground">or click to browse from your computer (Max 10MB)</p>
              </div>
            ) : (
              <div className="bg-secondary/30 p-4 rounded-lg flex items-center justify-between border border-border">
                <div className="flex items-center space-x-4 overflow-hidden">
                  <div className="p-3 bg-primary/20 rounded-lg text-primary">
                    <File className="h-6 w-6" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-mono font-medium truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setFile(null); setFileData(""); setResult(null); }}>
                  Change File
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`border-border shadow-lg transition-opacity ${!file ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardHeader>
            <CardTitle className="font-mono text-lg border-b border-border pb-2">2. Key Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="keySource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Encryption Key Source</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="font-mono">
                            <SelectValue placeholder="Select a key source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="stored">Stored Key Pair</SelectItem>
                          <SelectItem value="manual">Manual Public Key (PEM)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                {keySource === "stored" && (
                  <FormField
                    control={form.control}
                    name="keyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Stored Key</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="font-mono">
                              <SelectValue placeholder="Choose a recipient key" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {keysLoading ? (
                              <SelectItem value="loading" disabled>Loading keys...</SelectItem>
                            ) : keys?.length === 0 ? (
                              <SelectItem value="empty" disabled>No keys found</SelectItem>
                            ) : (
                              keys?.map((key) => (
                                <SelectItem key={key.id} value={key.id.toString()}>
                                  {key.label} ({key.keySize}-bit)
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          The public key will be used to wrap the AES session key.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {keySource === "manual" && (
                  <FormField
                    control={form.control}
                    name="publicKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Public Key (PEM format)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="-----BEGIN PUBLIC KEY-----..." 
                            className="font-mono text-xs h-32" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Button 
                  type="submit" 
                  className="w-full font-mono font-bold tracking-wider relative overflow-hidden" 
                  disabled={!file || encryptMutation.isPending || !!result}
                >
                  {encryptMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Lock className="h-4 w-4 animate-pulse" />
                      ENCRYPTING...
                    </span>
                  ) : result ? (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      ENCRYPTED
                    </span>
                  ) : (
                    "ENCRYPT FILE"
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
                3. Encryption Result
              </CardTitle>
              <CardDescription>
                File has been securely encrypted and is ready for transfer.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm font-mono">
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs uppercase">Algorithm</span>
                  <p className="font-semibold">{result.algorithm}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs uppercase">Original File</span>
                  <p className="font-semibold truncate" title={result.fileName}>{result.fileName}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-border">
                <Button onClick={downloadResult} className="w-full" variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download Encrypted Bundle (.clf)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
