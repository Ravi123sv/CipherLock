import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface RoomCodeDisplayProps {
  code: string;
}

export function RoomCodeDisplay({ code }: RoomCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Room code copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col items-center justify-center pt-6 pb-6 gap-4">
        <p className="text-sm text-muted-foreground text-center">Share this code with the other device</p>
        <div className="flex items-center gap-4">
          <div className="text-4xl md:text-5xl font-mono font-bold tracking-[0.25em] text-foreground">
            {code}
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-10 w-10 shrink-0" 
            onClick={copyToClipboard}
            data-testid="button-copy-code"
          >
            {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
