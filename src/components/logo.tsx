import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Compact icon-only mark. Use in tight spaces (mobile nav collapsed state,
 * favicons, loading states) where the full wordmark won't fit.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-block h-8 w-8", className)}>
      <Image
        src="/brand/logo-icon.png"
        alt="XETU AI"
        fill
        sizes="32px"
        className="object-contain"
        priority
      />
    </span>
  );
}

/**
 * Full lockup — icon + "XETU AI" wordmark. This is the default logo used
 * across the marketing site, auth screens, and dashboard chrome.
 */
export function Logo({ className }: { className?: string; dark?: boolean }) {
  return (
    <span className={cn("relative inline-block h-8 w-[150px] shrink-0", className)}>
      <Image
        src="/brand/logo-mark-word.png"
        alt="XETU AI — Think. Create. Build."
        fill
        sizes="150px"
        className="object-contain object-left"
        priority
      />
    </span>
  );
}
