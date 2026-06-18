import { useState, useEffect, useRef, useCallback } from "react";
import { useConnection } from "@/contexts/connection-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  useCreateRoom,
  useJoinRoom,
  useGetRoomStatus,
  getGetRoomStatusQueryKey,
  useListRoomFiles,
  getListRoomFilesQueryKey,
  useEncryptFile,
  useDecryptFile,
  useSendRoomFile,
  useAcknowledgeRoomFile,
  useListKeyPairs,
  useGetKeyPair,
  getGetKeyPairQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Lock, Laptop, Monitor, Download, Upload, X, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { RoomCodeDisplay } from "@/components/room-code-display";
import { FileIcon } from "@/components/file-icon";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export default function Transfer() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const queryClient = useQueryClient();
  const { setRoomCode: setCtxCode, setStatus } = useConnection();

  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();

  const { data: roomStatus } = useGetRoomStatus(roomCode ?? "", {
    query: {
      enabled: !!roomCode,
      refetchInterval: (query) => (query.state.data?.status === "connected" ? false : 2000),
      queryKey: getGetRoomStatusQueryKey(roomCode ?? ""),
    },
  });

  const isConnected = roomStatus?.status === "connected" || (roomStatus?.peerCount ?? 0) >= 2;

  // Sync connection status to context for sidebar badge
  useEffect(() => {
    if (!roomCode) {
      setCtxCode(null);
      setStatus("offline");
    } else if (isConnected) {
      setCtxCode(roomCode);
      setStatus("connected");
    } else {
      setCtxCode(roomCode);
      setStatus("waiting");
    }
  }, [roomCode, isConnected, setCtxCode, setStatus]);

  const handleCreateSession = () => {
    createRoom.mutate(undefined, {
      onSuccess: (room) => {
        setRoomCode(room.code);
        toast.success("Room created — share the code with the other device");
      },
      onError: () => toast.error("Failed to create room"),
    });
  };

  const handleJoinSession = () => {
    if (joinCode.length !== 6) return;
    joinRoom.mutate({ code: joinCode.toUpperCase() }, {
      onSuccess: (room) => {
        setRoomCode(room.code);
        toast.success("Connected to room");
      },
      onError: () => toast.error("Room not found or already full"),
    });
  };

  const handleDisconnect = () => {
    queryClient.invalidateQueries({ queryKey: getGetRoomStatusQueryKey(roomCode ?? "") });
    setRoomCode(null);
    setJoinCode("");
    toast.info("Disconnected from room");
  };

  if (isConnected && roomCode) {
    return <ConnectedState roomCode={roomCode} onDisconnect={handleDisconnect} />;
  }

  return (
    <div className="h-full flex flex-col gap-8 items-center justify-center max-w-4xl mx-auto px-4">
      <div className="text-center mb-2">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-primary/10 rounded-full border border-primary/20">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Secure Transfer</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          End-to-end AES-256-GCM encrypted file sharing between two devices. Nothing leaves your device unencrypted.
        </p>
      </div>

      {roomCode ? (
        <div className="w-full max-w-md flex flex-col gap-6">
          <RoomCodeDisplay code={roomCode} />
          <div className="flex flex-col items-center justify-center p-8 bg-card border rounded-xl shadow-sm">
            <motion.div
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
              className="w-16 h-16 bg-primary/15 rounded-full flex items-center justify-center mb-4 border border-primary/20"
            >
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </motion.div>
            <h3 className="text-lg font-semibold mb-1">Waiting for peer…</h3>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              The other device needs to enter the 6-character code to connect.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleDisconnect} data-testid="button-cancel-session">
            Cancel
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <Card className="flex flex-col hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="h-5 w-5 text-primary" />
                Create Session
              </CardTitle>
              <CardDescription>
                Generate a unique room code and wait for the other device to join.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3 text-center mb-6">
                <div className="p-3 bg-muted rounded-lg">
                  <Laptop className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">You are the host device</p>
              </div>
              <Button
                size="lg"
                className="w-full"
                onClick={handleCreateSession}
                disabled={createRoom.isPending}
                data-testid="button-create-session"
              >
                {createRoom.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Create Session
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col hover:border-primary/40 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Monitor className="h-5 w-5 text-primary" />
                Join Session
              </CardTitle>
              <CardDescription>
                Enter the 6-character code displayed on the other device.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center py-8 gap-6">
              <InputOTP
                maxLength={6}
                value={joinCode}
                onChange={(v) => setJoinCode(v.toUpperCase())}
                data-testid="input-join-code"
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <Button
                size="lg"
                className="w-full"
                disabled={joinCode.length !== 6 || joinRoom.isPending}
                onClick={handleJoinSession}
                data-testid="button-join-session"
              >
                {joinRoom.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Connect
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ConnectedState({ roomCode, onDisconnect }: { roomCode: string; onDisconnect: () => void }) {
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  const { data: keyPairs } = useListKeyPairs();

  const selectedNumericId = selectedKeyId ? Number(selectedKeyId) : (keyPairs?.[0]?.id ?? 0);
  const { data: selectedKeyFull } = useGetKeyPair(selectedNumericId, {
    query: {
      enabled: selectedNumericId > 0,
      queryKey: getGetKeyPairQueryKey(selectedNumericId),
    },
  });

  const { data: remoteFiles } = useListRoomFiles(roomCode, {
    query: {
      refetchInterval: 3000,
      queryKey: getListRoomFilesQueryKey(roomCode),
    },
  });

  const encryptFile = useEncryptFile();
  const decryptFile = useDecryptFile();
  const sendRoomFile = useSendRoomFile();
  const acknowledgeFile = useAcknowledgeRoomFile();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "JOIN", code: roomCode }));
    };
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === "FILE_AVAILABLE") {
          queryClient.invalidateQueries({ queryKey: getListRoomFilesQueryKey(roomCode) });
        }
      } catch {
        // ignore
      }
    };
    ws.onerror = () => {};
    return () => {
      ws.close();
    };
  }, [roomCode, queryClient]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setLocalFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setLocalFiles(Array.from(e.dataTransfer.files));
  };

  const handleSend = useCallback(async () => {
    if (!localFiles.length) return;
    if (!selectedKeyFull) {
      toast.error("Please generate a key pair in the Keys section first");
      return;
    }
    setSending(true);
    try {
      for (const file of localFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(arrayBuffer);

        const encrypted = await encryptFile.mutateAsync({
          data: {
            fileName: file.name,
            fileData: base64,
            publicKey: selectedKeyFull.publicKey,
            keyId: selectedKeyFull.id,
          },
        });

        await sendRoomFile.mutateAsync({
          code: roomCode,
          data: {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || undefined,
            encryptedAesKey: encrypted.encryptedAesKey,
            iv: encrypted.iv,
            authTag: encrypted.authTag,
            ciphertext: encrypted.ciphertext,
            senderPublicKey: selectedKeyFull.publicKey,
          },
        });

        wsRef.current?.send(JSON.stringify({ type: "FILE_AVAILABLE", code: roomCode }));
      }
      toast.success(`${localFiles.length} file${localFiles.length > 1 ? "s" : ""} encrypted and sent`);
      setLocalFiles([]);
      queryClient.invalidateQueries({ queryKey: getListRoomFilesQueryKey(roomCode) });
    } catch {
      toast.error("Failed to send files");
    } finally {
      setSending(false);
    }
  }, [localFiles, selectedKeyFull, encryptFile, sendRoomFile, roomCode, queryClient]);

  const handleDownload = useCallback(
    async (fileId: number) => {
      const file = remoteFiles?.find((f) => f.id === fileId);
      if (!file) return;
      if (!selectedKeyFull) {
        toast.error("No key pair selected — pick one from the dropdown");
        return;
      }
      setDownloadingId(fileId);
      try {
        const decrypted = await decryptFile.mutateAsync({
          data: {
            encryptedAesKey: file.encryptedAesKey,
            iv: file.iv,
            authTag: file.authTag,
            ciphertext: file.ciphertext,
            privateKey: selectedKeyFull.privateKey,
            fileName: file.fileName,
          },
        });

        const bytes = Uint8Array.from(atob(decrypted.fileData), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = decrypted.fileName;
        a.click();
        URL.revokeObjectURL(url);

        await acknowledgeFile.mutateAsync({ code: roomCode, fileId });
        queryClient.invalidateQueries({ queryKey: getListRoomFilesQueryKey(roomCode) });
        toast.success(`Downloaded ${decrypted.fileName}`);
      } catch {
        toast.error("Decryption failed — check that you have the correct private key");
      } finally {
        setDownloadingId(null);
      }
    },
    [remoteFiles, selectedKeyFull, decryptFile, acknowledgeFile, roomCode, queryClient]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono text-green-500 border-green-500/30 bg-green-500/10 px-3 py-1 text-sm">
            ROOM: {roomCode}
          </Badge>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">Connected</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {keyPairs && keyPairs.length > 0 && (
            <Select value={selectedKeyId} onValueChange={setSelectedKeyId} data-testid="select-key-pair">
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="Select key pair…" />
              </SelectTrigger>
              <SelectContent>
                {keyPairs.map((k) => (
                  <SelectItem key={k.id} value={String(k.id)} className="text-xs">
                    {k.label} ({k.keySize}-bit)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={onDisconnect} data-testid="button-disconnect">
            <X className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Left pane — This Device */}
        <Card className="flex flex-col h-full">
          <CardHeader className="py-3 px-4 border-b bg-muted/20">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Laptop className="h-4 w-4 text-primary" />
              This Device
              {localFiles.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">{localFiles.length} file{localFiles.length > 1 ? "s" : ""}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-auto">
            {localFiles.length === 0 ? (
              <div
                className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border m-4 rounded-lg bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                data-testid="drop-zone"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                <h3 className="font-medium text-sm mb-1">Drop files here or browse</h3>
                <p className="text-xs text-muted-foreground mb-4">Files will be AES-256 encrypted before sending</p>
                <Button variant="outline" size="sm" asChild>
                  <label className="cursor-pointer">
                    Browse Files
                    <input type="file" multiple className="hidden" onChange={handleFileSelect} data-testid="input-file-select" />
                  </label>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {localFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
                    <FileIcon filename={file.name} className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatBytes(file.size)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {localFiles.length > 0 && (
            <CardFooter className="p-3 border-t bg-muted/20 flex justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => setLocalFiles([])} className="text-xs">
                Clear
              </Button>
              <Button size="sm" onClick={handleSend} disabled={sending} data-testid="button-send-files">
                {sending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-3.5 w-3.5" />
                )}
                {sending ? "Encrypting…" : "Encrypt & Send"}
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* Right pane — Remote Device */}
        <Card className="flex flex-col h-full">
          <CardHeader className="py-3 px-4 border-b bg-muted/20">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              Remote Device
              {remoteFiles && remoteFiles.length > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">{remoteFiles.length} incoming</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-auto">
            {(!remoteFiles || remoteFiles.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground" data-testid="remote-empty-state">
                <Monitor className="h-12 w-12 opacity-15 mb-4" />
                <p className="font-medium text-sm">Waiting for files…</p>
                <p className="text-xs mt-1 opacity-70">Files sent by the other device will appear here</p>
              </div>
            ) : (
              <div className="divide-y">
                {remoteFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors" data-testid={`file-remote-${file.id}`}>
                    <FileIcon filename={file.fileName} className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatBytes(file.fileSize)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file.id)}
                      disabled={downloadingId === file.id}
                      data-testid={`button-download-${file.id}`}
                      className="shrink-0"
                    >
                      {downloadingId === file.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {downloadingId === file.id ? "" : "Save"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
