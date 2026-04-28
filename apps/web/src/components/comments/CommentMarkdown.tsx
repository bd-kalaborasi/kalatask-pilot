/**
 * CommentMarkdown — render Markdown body dengan custom @[Name](uuid) token
 * jadi mention badge.
 *
 * Strategy:
 *   - Pre-process body: replace @[Name](uuid) → [@Name](mention://uuid)
 *     (custom URL scheme yang react-markdown akan render sebagai <a>)
 *   - Custom <a> renderer: kalau href starts mention:// → render mention badge
 *   - react-markdown sanitize secara default (no raw HTML) — XSS-safe.
 */
import ReactMarkdown from 'react-markdown';

interface CommentMarkdownProps {
  body: string;
}

const MENTION_TOKEN_REGEX =
  /@\[([^\]]+)\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/g;

function preprocessMentions(body: string): string {
  return body.replace(MENTION_TOKEN_REGEX, (_match, name, uuid) => {
    return `[@${name}](mention://${uuid})`;
  });
}

export function CommentMarkdown({ body }: CommentMarkdownProps) {
  const preprocessed = preprocessMentions(body);

  return (
    <div className="prose prose-sm max-w-none break-words">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => {
            if (href?.startsWith('mention://')) {
              return (
                <span
                  className="inline-flex items-baseline gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium align-baseline"
                  style={{
                    backgroundColor: 'var(--kt-deep-50)',
                    color: 'var(--kt-deep-700)',
                  }}
                >
                  {children}
                </span>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
                style={{ color: 'var(--kt-sky-700)' }}
              >
                {children}
              </a>
            );
          },
          // Disable images (XSS guard), code blocks compact
          img: () => null,
          pre: ({ children }) => (
            <pre className="rounded bg-zinc-100 px-2 py-1 text-xs overflow-x-auto">
              {children}
            </pre>
          ),
          code: ({ children }) => (
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
              {children}
            </code>
          ),
        }}
      >
        {preprocessed}
      </ReactMarkdown>
    </div>
  );
}
