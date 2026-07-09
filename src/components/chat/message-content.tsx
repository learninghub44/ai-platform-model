"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { CodeBlock } from "./code-block";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

interface MessageContentProps {
  content: string;
  className?: string;
}

/** Turns bracketed reference markers like [1] into styled citation chips. */
function CitationText({ children }: { children: React.ReactNode }) {
  if (typeof children !== "string") return <>{children}</>;
  const parts = children.split(/(\[\d+\])/g);
  if (parts.length === 1) return <>{children}</>;
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (!match) return <span key={i}>{part}</span>;
        return (
          <sup
            key={i}
            className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[10px] font-semibold text-primary no-underline"
          >
            {match[1]}
          </sup>
        );
      })}
    </>
  );
}

function MessageContentImpl({ content, className }: MessageContentProps) {
  return (
    <div
      className={cn(
        "prose max-w-none break-words [overflow-wrap:anywhere]",
        "prose-p:leading-relaxed prose-p:my-2.5",
        "prose-headings:font-display prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-strong:font-semibold prose-strong:text-foreground",
        "prose-code:before:content-none prose-code:after:content-none prose-code:rounded-md prose-code:bg-accent prose-code:px-1.5 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:font-mono prose-code:font-normal",
        "prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0",
        "prose-ul:my-2.5 prose-ol:my-2.5 prose-li:my-1",
        "prose-blockquote:border-l-primary/40 prose-blockquote:text-muted-foreground prose-blockquote:font-normal",
        "prose-img:rounded-xl prose-img:border prose-img:border-border/50 prose-img:shadow-sm",
        "prose-hr:border-border/50",
        "prose-table:text-sm",
        "dark:prose-invert",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !String(children).includes("\n");
            if (isInline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <CodeBlock
                language={match?.[1] || "text"}
                code={String(children).replace(/\n$/, "")}
              />
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border-b border-border/50 bg-muted/50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {children}
              </th>
            );
          },
          td({ children }) {
            return <td className="border-b border-border/30 px-3 py-2 align-top">{children}</td>;
          },
          img({ src, alt }) {
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={src} alt={alt || ""} loading="lazy" className="max-w-full" />;
          },
          a({ href, children }) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          p({ children }) {
            return (
              <p>
                {Array.isArray(children)
                  ? children.map((child, i) => <CitationText key={i}>{child}</CitationText>)
                  : <CitationText>{children}</CitationText>}
              </p>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MessageContent = memo(MessageContentImpl);
