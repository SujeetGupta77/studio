'use client';

import React from 'react';

type MarkdownProps = {
  content: string;
};

// Helper component to render a line with highlighted priorities and code
const FormattedLine = ({ line }: { line: string }) => {
  const parts = line.split(/(`[^`]+`|\[High\]|\[Medium\]|\[Low\])/g);

  if (parts.length <= 1) {
    return <span>{line}</span>;
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              className="bg-muted text-accent-foreground rounded-md px-1.5 py-1 font-mono text-sm"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part === '[High]') {
          return (
            <span
              key={i}
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 mr-2"
            >
              High
            </span>
          );
        }
        if (part === '[Medium]') {
          return (
            <span
              key={i}
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 mr-2"
            >
              Medium
            </span>
          );
        }
        if (part === '[Low]') {
          return (
            <span
              key={i}
              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 mr-2"
            >
              Low
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

// This is a simple parser for a subset of Markdown.
// It supports headings (##, ###), lists (* or -), blockquotes (>), and inline code/priorities.
export default function Markdown({ content }: MarkdownProps) {
  return (
    <div className="space-y-4 text-base max-w-none leading-relaxed">
      {content.split('\n').map((line, index) => {
        if (line.startsWith('## ')) {
          return (
            <h2
              key={index}
              className="text-2xl font-bold mt-8 mb-4 pb-2 border-b border-primary/30 text-primary"
            >
              {line.substring(3)}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={index} className="text-xl font-semibold mt-6 mb-2">
              {line.substring(4)}
            </h3>
          );
        }
        if (line.startsWith('> ')) {
          return (
            <blockquote
              key={index}
              className="pl-4 border-l-4 border-muted-foreground/20 italic text-muted-foreground bg-muted/20 p-3 rounded-r-lg"
            >
              <FormattedLine line={line.substring(2)} />
            </blockquote>
          );
        }
        if (line.startsWith('* ') || line.startsWith('- ')) {
          return (
            <div key={index} className="flex items-start pl-4 group">
              <span className="mr-3 mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary group-hover:scale-125 transition-transform"></span>
              <p className="flex-1">
                <FormattedLine line={line.substring(2)} />
              </p>
            </div>
          );
        }

        // Handle empty lines as vertical space
        if (line.trim() === '') {
          return <div key={index} className="h-2"></div>;
        }

        return (
          <p key={index}>
            <FormattedLine line={line} />
          </p>
        );
      })}
    </div>
  );
}
