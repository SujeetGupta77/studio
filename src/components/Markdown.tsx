
'use client';

type MarkdownProps = {
  content: string;
};

// This is a simple parser for a subset of Markdown.
// It supports headings (##, ###), lists (* or -), and inline code (`code`).
export default function Markdown({ content }: MarkdownProps) {
  return (
    <div className="space-y-2 text-sm max-w-none">
      {content.split('\n').map((line, index) => {
        if (line.startsWith('## ')) {
          return (
            <h2
              key={index}
              className="text-xl font-semibold mt-6 mb-3 pb-2 border-b"
            >
              {line.substring(3)}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={index} className="text-lg font-semibold mt-4 mb-2">
              {line.substring(4)}
            </h3>
          );
        }
        if (line.startsWith('* ') || line.startsWith('- ')) {
          return (
            <div key={index} className="flex items-start pl-4">
              <span className="mr-2 mt-1 text-primary">•</span>
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
                        className="bg-muted text-foreground rounded px-1.5 py-1 font-mono text-sm mx-1"
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

        return <p key={index}>{line || <br />}</p>;
      })}
    </div>
  );
}
