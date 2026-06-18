import { Link, useLocation } from "wouter";
import { Lock, ArrowRightLeft, KeyRound, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { ConnectionBadge } from "./connection-badge";
import { useConnection } from "@/contexts/connection-context";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { status } = useConnection();

  const navItems = [
    { href: "/", label: "Transfer", icon: ArrowRightLeft },
    { href: "/keys", label: "Key Manager", icon: KeyRound },
    { href: "/history", label: "History", icon: History },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const pageTitle = navItems.find((item) => item.href === location)?.label ?? "CipherLock";

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Lock className="h-5 w-5 text-primary mr-3" />
          <span className="font-bold text-lg tracking-tight">CipherLock</span>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  data-testid={`link-nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <Icon className={cn("h-4 w-4 mr-3 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/50")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border flex flex-col gap-3">
          <ConnectionBadge status={status} className="w-full justify-center" />
          <div className="text-[10px] text-muted-foreground text-center font-mono uppercase tracking-wider">
            v1.1.0-SECURE
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 shrink-0 border-b border-border flex items-center justify-between px-8 bg-background">
          <h1 className="text-lg font-semibold">{pageTitle}</h1>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-background/50">
          <div className="max-w-7xl mx-auto p-8 h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
