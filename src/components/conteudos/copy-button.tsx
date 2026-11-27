"use client";

import { useState, type ComponentProps } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface CopyButtonProps
  extends Omit<ComponentProps<typeof Button>, "onClick"> {
  text: string;
  label: string;
  copiedLabel?: string;
  successMessage?: string;
  emptyMessage?: string;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text.trim()) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({
  text,
  label,
  copiedLabel = "Copiado!",
  successMessage = "Copiado para a área de transferência!",
  emptyMessage = "Ainda não há texto para copiar.",
  disabled,
  ...buttonProps
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text.trim()) {
      toast.error(emptyMessage);
      return;
    }

    const ok = await copyToClipboard(text);
    if (!ok) {
      toast.error("Não foi possível copiar automaticamente. Selecione o texto e copie.");
      return;
    }

    setCopied(true);
    toast.success(successMessage);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      onClick={handleCopy}
      disabled={disabled || !text.trim()}
      {...buttonProps}
    >
      {copied ? (
        <Check className="size-3.5 text-emerald-600" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {copied ? copiedLabel : label}
    </Button>
  );
}
