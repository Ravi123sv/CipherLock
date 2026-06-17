import { cn } from "@/lib/utils";

interface ConnectionBadgeProps {
  status: "connected" | "waiting" | "offline";
  className?: string;
}

export function ConnectionBadge({ status, className }: ConnectionBadgeProps) {
  const statusConfig = {
    connected: { label: "Connected", dot: "bg-green-500", text: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-500/10" },
    waiting: { label: "Waiting", dot: "bg-amber-500 animate-pulse", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/10" },
    offline: { label: "Offline", dot: "bg-muted-foreground", text: "text-muted-foreground", bg: "bg-muted" },
  };

  const config = statusConfig[status];

  return (
    <div className={cn("inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium", config.bg, config.text, className)}>
      <div className={cn("w-2 h-2 rounded-full", config.dot)} />
      {config.label}
    </div>
  );
}
