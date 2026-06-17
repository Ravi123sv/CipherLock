import { useListFileOperations, useGetFileStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileIcon } from "@/components/file-icon";
import { format } from "date-fns";
import { Activity, Lock, Unlock, KeyRound, HardDrive } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function History() {
  const { data: stats, isLoading: statsLoading } = useGetFileStats();
  const { data: operations, isLoading: opsLoading } = useListFileOperations();

  return (
    <div className="flex flex-col gap-8 h-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Activity History</h2>
        <p className="text-muted-foreground">View your recent file encryption and decryption operations.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono">{stats?.totalOperations || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Files Encrypted</CardTitle>
            <Lock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono">{stats?.totalEncryptions || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Files Decrypted</CardTitle>
            <Unlock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono">{stats?.totalDecryptions || 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Keys</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono">{stats?.totalKeyPairs || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base">Recent Operations</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-auto">
          {opsLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !operations || operations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground h-full">
              <HardDrive className="h-12 w-12 opacity-20 mb-4" />
              <p className="font-medium">No history yet</p>
              <p className="text-sm">Operations will appear here once you transfer files.</p>
            </div>
          ) : (
            <div className="divide-y">
              {operations.map((op) => (
                <div key={op.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="bg-background border rounded p-2">
                      <FileIcon filename={op.fileName} className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{op.fileName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={op.type === "encrypt" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                          {op.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">{op.algorithm}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{format(new Date(op.createdAt), "MMM d, yyyy")}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(op.createdAt), "HH:mm:ss")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
