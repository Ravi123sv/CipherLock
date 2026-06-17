import { FileText, Image as ImageIcon, Archive, Code, File as FileDefault } from "lucide-react";

export function FileIcon({ filename, className = "h-4 w-4" }: { filename: string; className?: string }) {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'pdf':
      return <FileText className={className} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'svg':
      return <ImageIcon className={className} />;
    case 'zip':
    case 'tar':
    case 'gz':
    case 'rar':
    case '7z':
      return <Archive className={className} />;
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
    case 'html':
    case 'css':
    case 'json':
    case 'md':
      return <Code className={className} />;
    default:
      return <FileDefault className={className} />;
  }
}
