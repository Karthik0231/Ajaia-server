export type JSONContent = Record<string, any>;
import { marked, type Token } from 'marked';

// ── TXT: split by blank lines into paragraphs ──────────────────────────────
export function txtToTiptap(text: string): JSONContent {
  const lines = text.split('\n');
  const nodes: JSONContent[] = [];
  let currentBlock: string[] = [];

  const flush = () => {
    const joined = currentBlock.join(' ').trim();
    if (joined) {
      nodes.push({
        type: 'paragraph',
        content: [{ type: 'text', text: joined }],
      });
    }
    currentBlock = [];
  };

  for (const line of lines) {
    if (line.trim() === '') {
      flush();
    } else {
      currentBlock.push(line.trimEnd());
    }
  }
  flush();

  if (nodes.length === 0) nodes.push({ type: 'paragraph' });
  return { type: 'doc', content: nodes };
}

// ── Inline marks parser ────────────────────────────────────────────────────
function parseInlineTokens(tokens: Token[]): JSONContent[] {
  const result: JSONContent[] = [];

  for (const tok of tokens) {
    if (tok.type === 'text') {
      if ('tokens' in tok && tok.tokens) {
        result.push(...parseInlineTokens(tok.tokens as Token[]));
      } else {
        const raw = (tok as { text: string }).text;
        if (raw) result.push({ type: 'text', text: raw });
      }
    } else if (tok.type === 'strong') {
      const children = parseInlineTokens((tok as { tokens: Token[] }).tokens);
      result.push(...children.map(c => ({
        ...c,
        marks: [...((c.marks ?? [])), { type: 'bold' }],
      })));
    } else if (tok.type === 'em') {
      const children = parseInlineTokens((tok as { tokens: Token[] }).tokens);
      result.push(...children.map(c => ({
        ...c,
        marks: [...((c.marks ?? [])), { type: 'italic' }],
      })));
    } else if (tok.type === 'codespan') {
      result.push({ type: 'text', text: (tok as { text: string }).text });
    } else if (tok.type === 'space') {
      // skip
    } else {
      const raw = (tok as { raw?: string }).raw;
      if (raw) result.push({ type: 'text', text: raw });
    }
  }

  return result;
}

// ── MD: parse tokens → Tiptap JSON ────────────────────────────────────────
export function mdToTiptap(md: string): JSONContent {
  const tokens = marked.lexer(md);
  const nodes: JSONContent[] = [];

  for (const tok of tokens) {
    if (tok.type === 'heading') {
      const level = (tok as { depth: number }).depth;
      const inlines = parseInlineTokens((tok as { tokens: Token[] }).tokens);
      nodes.push({
        type: 'heading',
        attrs: { level: level <= 2 ? level : 2 },
        content: inlines.length ? inlines : undefined,
      });
    } else if (tok.type === 'paragraph') {
      const inlines = parseInlineTokens((tok as { tokens: Token[] }).tokens);
      nodes.push({
        type: 'paragraph',
        content: inlines.length ? inlines : undefined,
      });
    } else if (tok.type === 'list') {
      const listType = (tok as { ordered: boolean }).ordered ? 'orderedList' : 'bulletList';
      const listItems = (tok as { items: { tokens: Token[]; task: boolean }[] }).items.map(item => ({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: parseInlineTokens(item.tokens),
          },
        ],
      }));
      nodes.push({ type: listType, content: listItems });
    } else if (tok.type === 'space') {
      // skip blank lines
    } else if (tok.type === 'code') {
      nodes.push({
        type: 'paragraph',
        content: [{ type: 'text', text: (tok as { text: string }).text }],
      });
    }
  }

  if (nodes.length === 0) nodes.push({ type: 'paragraph' });
  return { type: 'doc', content: nodes };
}

// ── Title from MD: first H1 or fall back ──────────────────────────────────
export function extractMdTitle(md: string): string | null {
  const tokens = marked.lexer(md);
  for (const tok of tokens) {
    if (tok.type === 'heading' && (tok as { depth: number }).depth === 1) {
      return (tok as { text: string }).text.trim() || null;
    }
  }
  return null;
}

// ── Filename → readable title ──────────────────────────────────────────────
export function fileNameToTitle(filename: string): string {
  const base = filename.replace(/\.(txt|md)$/i, '');
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 255)
    || 'Imported document';
}
