import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Split content into code block segments vs non-code segments
  const segments = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-gray-800 leading-relaxed text-sm">
      {segments.map((segment, index) => {
        if (segment.startsWith("```")) {
          // Parse code block
          const lines = segment.split("\n");
          const firstLine = lines[0].replace("```", "").trim();
          const language = firstLine || "code";
          const code = lines.slice(1, -1).join("\n");

          return <CodeBlock key={index} code={code} language={language} />;
        } else {
          // Standard text segment: split by line breaks to style headers, lists, and paragraphs
          return (
            <div key={index} className="space-y-2">
              {segment.split("\n").map((line, lineIdx) => {
                const trimmed = line.trim();

                // Bullet points
                if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                  const itemText = trimmed.substring(2);
                  return (
                    <ul key={lineIdx} className="list-disc pl-5 my-1 space-y-1">
                      <li className="text-gray-700">{renderInlineFormatting(itemText)}</li>
                    </ul>
                  );
                }

                // Numbered lists
                const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
                if (numMatch) {
                  const num = numMatch[1];
                  const itemText = numMatch[2];
                  return (
                    <ol key={lineIdx} className="list-decimal pl-5 my-1 space-y-1">
                      <li value={parseInt(num)} className="text-gray-700">
                        {renderInlineFormatting(itemText)}
                      </li>
                    </ol>
                  );
                }

                // Headers
                if (trimmed.startsWith("### ")) {
                  return (
                    <h4 key={lineIdx} className="text-base font-semibold text-gray-900 mt-4 mb-1">
                      {renderInlineFormatting(trimmed.substring(4))}
                    </h4>
                  );
                }
                if (trimmed.startsWith("## ")) {
                  return (
                    <h3 key={lineIdx} className="text-lg font-bold text-gray-900 mt-5 mb-2">
                      {renderInlineFormatting(trimmed.substring(3))}
                    </h3>
                  );
                }
                if (trimmed.startsWith("# ")) {
                  return (
                    <h2 key={lineIdx} className="text-xl font-extrabold text-gray-900 mt-6 mb-3 border-b pb-1 border-gray-100">
                      {renderInlineFormatting(trimmed.substring(2))}
                    </h2>
                  );
                }

                // Empty lines
                if (trimmed === "") {
                  return <div key={lineIdx} className="h-2" />;
                }

                // Standard paragraph
                return (
                  <p key={lineIdx} className="text-gray-700">
                    {renderInlineFormatting(line)}
                  </p>
                );
              })}
            </div>
          );
        }
      })}
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string; key?: React.Key }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg border border-gray-200 overflow-hidden font-mono text-xs shadow-xs bg-gray-50 max-w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-200 text-gray-500">
        <span className="font-semibold uppercase tracking-wider text-[10px]">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-gray-800 transition-colors py-1 px-2 rounded-md hover:bg-gray-200 text-[11px] font-medium"
          title="Copy Code"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-600" />
              <span className="text-emerald-600 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-gray-800 leading-relaxed font-mono whitespace-pre bg-gray-50 max-w-full">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInlineFormatting(text: string) {
  // Bold regex (**bold**)
  const boldRegex = /\*\*([\s\S]*?)\*\*/g;
  // Inline code regex (`code`)
  const codeRegex = /`([^`]+)`/g;

  let parts: (string | React.ReactNode)[] = [text];

  // Replace double stars with strong tag
  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    const subParts = part.split(boldRegex);
    return subParts.map((subPart, i) => {
      if (i % 2 === 1) {
        return (
          <strong key={i} className="font-semibold text-gray-900">
            {subPart}
          </strong>
        );
      }
      return subPart;
    });
  });

  // Replace backticks with code tag
  parts = parts.flatMap((part) => {
    if (typeof part !== "string") return part;
    const subParts = part.split(codeRegex);
    return subParts.map((subPart, i) => {
      if (i % 2 === 1) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded-sm bg-gray-100 text-pink-600 font-mono text-xs border border-gray-200">
            {subPart}
          </code>
        );
      }
      return subPart;
    });
  });

  return <>{parts}</>;
}
