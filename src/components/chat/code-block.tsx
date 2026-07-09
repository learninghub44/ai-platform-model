"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PrismAsyncLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { Check, Copy, Download, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ssr: false keeps mermaid + its parser/layout deps (cytoscape, etc.) out of
// the server render entirely. On Cloudflare Workers there's no filesystem to
// lazy-load chunks from at request time, so a plain dynamic import() still
// gets inlined into the worker bundle — ssr:false is what actually excludes it.
const MermaidDiagram = dynamic(
  () => import("./mermaid-diagram").then((mod) => mod.MermaidDiagram),
  {
    ssr: false,
    loading: () => (
      <div className="my-3 flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading diagram renderer...
      </div>
    ),
  }
);

const EXT_MAP: Record<string, string> = {
  javascript: "js",
  typescript: "ts",
  jsx: "jsx",
  tsx: "tsx",
  python: "py",
  bash: "sh",
  shell: "sh",
  json: "json",
  html: "html",
  css: "css",
  sql: "sql",
  yaml: "yml",
  markdown: "md",
  rust: "rs",
  go: "go",
  java: "java",
};

interface CodeBlockProps {
  language: string;
  code: string;
}

const COLLAPSE_THRESHOLD_LINES = 25;

export function CodeBlock({ language, code }: CodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const lang = (language || "text").toLowerCase();

  if (lang === "mermaid") {
    return <MermaidDiagram code={code} />;
  }

  const lineCount = code.split("\n").length;
  const canCollapse = lineCount > COLLAPSE_THRESHOLD_LINES;

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    const ext = EXT_MAP[lang] || "txt";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `snippet.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-border/50 bg-[#0d1117] text-sm shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
        <span className="font-mono text-xs font-medium text-white/60">{lang}</span>
        <div className="flex items-center gap-1">
          {canCollapse && (
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
              title={collapsed ? "Expand" : "Collapse"}
            >
              {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            onClick={download}
            className="rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title="Download"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={copy}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title="Copy"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div className={cn("overflow-x-auto", collapsed && "max-h-[200px] overflow-y-auto")}>
        <SyntaxHighlighter
          language={lang}
          style={resolvedTheme === "dark" ? oneDark : oneDark}
          showLineNumbers={lineCount > 1}
          customStyle={{
            margin: 0,
            padding: "1rem",
            background: "transparent",
            fontSize: "0.8125rem",
            lineHeight: 1.6,
          }}
          lineNumberStyle={{ opacity: 0.35, minWidth: "2.25em" }}
        >
          {code.replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
