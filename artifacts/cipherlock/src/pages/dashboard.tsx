import { useGetFileStats } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { FileLock2, FileKey2, KeyRound, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetFileStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 font-mono">Overview</h1>
          <p className="text-muted-foreground">Monitoring encryption activity and key metrics.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="col-span-4">
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Activity className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">Failed to load statistics</h2>
        <p className="text-muted-foreground">There was a problem fetching the latest data from the server.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2 font-mono">Overview</h1>
        <p className="text-muted-foreground">Monitoring encryption activity and key metrics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate transition-all border-l-4 border-l-primary/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Operations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.totalOperations}</div>
            <p className="text-xs text-muted-foreground">Processed files</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate transition-all border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encryptions</CardTitle>
            <FileLock2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.totalEncryptions}</div>
            <p className="text-xs text-muted-foreground">Secured files</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate transition-all border-l-4 border-l-secondary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Decryptions</CardTitle>
            <FileKey2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.totalDecryptions}</div>
            <p className="text-xs text-muted-foreground">Recovered files</p>
          </CardContent>
        </Card>
        <Card className="hover-elevate transition-all border-l-4 border-l-muted-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Key Pairs</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{stats.totalKeyPairs || 0}</div>
            <p className="text-xs text-muted-foreground">Stored keys</p>
          </CardContent>
        </Card>
      </div>

      <Card className="col-span-4 border-border">
        <CardHeader>
          <CardTitle className="font-mono">Recent Activity</CardTitle>
          <CardDescription>Latest encryption and decryption events</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((operation) => (
                <div key={operation.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${operation.type === 'encrypt' ? 'bg-primary/20 text-primary' : 'bg-secondary text-foreground'}`}>
                      {operation.type === 'encrypt' ? <FileLock2 className="h-4 w-4" /> : <FileKey2 className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none font-mono">{operation.fileName}</p>
                      <div className="flex items-center mt-1 space-x-2 text-xs text-muted-foreground">
                        <span className="uppercase tracking-wider font-semibold text-[10px]">{operation.type}</span>
                        <span>&bull;</span>
                        <span>{operation.algorithm}</span>
                        {operation.keyLabel && (
                          <>
                            <span>&bull;</span>
                            <span className="truncate max-w-[150px]">Key: {operation.keyLabel}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {format(new Date(operation.createdAt), 'MMM d, HH:mm:ss')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent activity found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
