/**
 * Renders a case-study Markdown body as React elements.
 *
 * Uses parseMarkdownToAst from the service to produce a typed AST, then
 * walks it with React nodes. No raw HTML string ever hits the DOM, so
 * there's no XSS surface even if the admin pastes untrusted content.
 */
import type { Key } from 'react';
import {
  parseMarkdownToAst,
  type MdInlineNode,
  type MdBlockNode,
} from '@/lib/hs-nil/case-studies';

function renderInline(nodes: MdInlineNode[]): React.ReactNode[] {
  return nodes.map((n, i) => {
    const key: Key = i;
    switch (n.type) {
      case 'text':
        return <span key={key}>{n.value}</span>;
      case 'strong':
        return <strong key={key}>{n.value}</strong>;
      case 'em':
        return <em key={key}>{n.value}</em>;
      case 'link':
        return (
          <a key={key} href={n.href} rel="noreferrer" target="_blank">
            {n.value}
          </a>
        );
    }
  });
}

export function CaseStudyBody({ markdown }: { markdown: string }) {
  if (!markdown.trim()) return null;
  const ast = parseMarkdownToAst(markdown);

  return (
    <div className="case-study-body space-y-5 text-[var(--marketing-gray-200)] leading-relaxed">
      {ast.map((block: MdBlockNode, idx: number) => {
        const key: Key = idx;
        switch (block.type) {
          case 'h2':
            return (
              <h2
                key={key}
                className="text-3xl font-bold text-white mt-10 mb-2 tracking-tight"
              >
                {renderInline(block.children)}
              </h2>
            );
          case 'h3':
            return (
              <h3
                key={key}
                className="text-2xl font-bold text-white mt-8 mb-2 tracking-tight"
              >
                {renderInline(block.children)}
              </h3>
            );
          case 'h4':
            return (
              <h4
                key={key}
                className="text-xl font-semibold text-white mt-6 mb-2"
              >
                {renderInline(block.children)}
              </h4>
            );
          case 'p':
            return (
              <p key={key} className="text-base md:text-lg">
                {renderInline(block.children)}
              </p>
            );
          case 'ul':
            return (
              <ul
                key={key}
                className="list-disc list-outside pl-6 space-y-2 text-base md:text-lg"
              >
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol
                key={key}
                className="list-decimal list-outside pl-6 space-y-2 text-base md:text-lg"
              >
                {block.items.map((item, j) => (
                  <li key={j}>{renderInline(item)}</li>
                ))}
              </ol>
            );
          case 'blockquote':
            return (
              <blockquote
                key={key}
                className="border-l-4 border-[var(--accent-primary)] pl-4 italic text-[var(--marketing-gray-300)]"
              >
                {block.children.map((line, j) => (
                  <p key={j} className="my-1">
                    {renderInline(line)}
                  </p>
                ))}
              </blockquote>
            );
          case 'code':
            return (
              <pre
                key={key}
                className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm overflow-x-auto"
              >
                <code>{block.value}</code>
              </pre>
            );
        }
      })}
    </div>
  );
}
