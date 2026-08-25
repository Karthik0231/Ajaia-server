"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.txtToTiptap = txtToTiptap;
exports.mdToTiptap = mdToTiptap;
exports.extractMdTitle = extractMdTitle;
exports.fileNameToTitle = fileNameToTitle;
const marked_1 = require("marked");
// ── TXT: split by blank lines into paragraphs ──────────────────────────────
function txtToTiptap(text) {
    const lines = text.split('\n');
    const nodes = [];
    let currentBlock = [];
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
        }
        else {
            currentBlock.push(line.trimEnd());
        }
    }
    flush();
    if (nodes.length === 0)
        nodes.push({ type: 'paragraph' });
    return { type: 'doc', content: nodes };
}
// ── Inline marks parser ────────────────────────────────────────────────────
function parseInlineTokens(tokens) {
    const result = [];
    for (const tok of tokens) {
        if (tok.type === 'text') {
            if ('tokens' in tok && tok.tokens) {
                result.push(...parseInlineTokens(tok.tokens));
            }
            else {
                const raw = tok.text;
                if (raw)
                    result.push({ type: 'text', text: raw });
            }
        }
        else if (tok.type === 'strong') {
            const children = parseInlineTokens(tok.tokens);
            result.push(...children.map(c => ({
                ...c,
                marks: [...((c.marks ?? [])), { type: 'bold' }],
            })));
        }
        else if (tok.type === 'em') {
            const children = parseInlineTokens(tok.tokens);
            result.push(...children.map(c => ({
                ...c,
                marks: [...((c.marks ?? [])), { type: 'italic' }],
            })));
        }
        else if (tok.type === 'codespan') {
            result.push({ type: 'text', text: tok.text });
        }
        else if (tok.type === 'space') {
            // skip
        }
        else {
            const raw = tok.raw;
            if (raw)
                result.push({ type: 'text', text: raw });
        }
    }
    return result;
}
// ── MD: parse tokens → Tiptap JSON ────────────────────────────────────────
function mdToTiptap(md) {
    const tokens = marked_1.marked.lexer(md);
    const nodes = [];
    for (const tok of tokens) {
        if (tok.type === 'heading') {
            const level = tok.depth;
            const inlines = parseInlineTokens(tok.tokens);
            nodes.push({
                type: 'heading',
                attrs: { level: level <= 2 ? level : 2 },
                content: inlines.length ? inlines : undefined,
            });
        }
        else if (tok.type === 'paragraph') {
            const inlines = parseInlineTokens(tok.tokens);
            nodes.push({
                type: 'paragraph',
                content: inlines.length ? inlines : undefined,
            });
        }
        else if (tok.type === 'list') {
            const listType = tok.ordered ? 'orderedList' : 'bulletList';
            const listItems = tok.items.map(item => ({
                type: 'listItem',
                content: [
                    {
                        type: 'paragraph',
                        content: parseInlineTokens(item.tokens),
                    },
                ],
            }));
            nodes.push({ type: listType, content: listItems });
        }
        else if (tok.type === 'space') {
            // skip blank lines
        }
        else if (tok.type === 'code') {
            nodes.push({
                type: 'paragraph',
                content: [{ type: 'text', text: tok.text }],
            });
        }
    }
    if (nodes.length === 0)
        nodes.push({ type: 'paragraph' });
    return { type: 'doc', content: nodes };
}
// ── Title from MD: first H1 or fall back ──────────────────────────────────
function extractMdTitle(md) {
    const tokens = marked_1.marked.lexer(md);
    for (const tok of tokens) {
        if (tok.type === 'heading' && tok.depth === 1) {
            return tok.text.trim() || null;
        }
    }
    return null;
}
// ── Filename → readable title ──────────────────────────────────────────────
function fileNameToTitle(filename) {
    const base = filename.replace(/\.(txt|md)$/i, '');
    return base
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 255)
        || 'Imported document';
}
