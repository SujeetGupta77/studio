'use client';

type MarkdownProps = {
  content: string;
};

// This is a simple parser for a subset of Markdown.
// It supports headings (##, ###), lists (* or -), blockquotes (>), and inline code (`code`).
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
                <blockquote key={index} className="pl-4 border-l-4 border-muted-foreground/20 italic text-muted-foreground bg-muted/20 p-2 rounded-r-lg">
                    {line.substring(2)}
                </blockquote>
            );
        }
        if (line.startsWith('* ') || line.startsWith('- ')) {
          return (
            <div key={index} className="flex items-start pl-4">
              <span className="mr-3 mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"></span>
              <p className="flex-1">{line.substring(2)}</p>
            </div>
          );
        }

        // Handle inline code snippets
        const parts = line.split(/(`[^`]+`)/g);

        if (parts.length > 1) {
            return (
              <p key={index}>
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
                  return <span key={i}>{part}</span>;
                })}
              </p>
            );
        }

        // Handle empty lines as vertical space
        if (line.trim() === '') {
            return <div key={index} className="h-2"></div>;
        }

        return <p key={index}>{line}</p>;
      })}
    </div>
  );
}
