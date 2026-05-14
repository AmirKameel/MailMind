// Sanitize HTML email bodies before rendering.
// See specs/004 §6 and CLAUDE.md §5.
//
// Uses dompurify + happy-dom Window on the server. isomorphic-dompurify pulls jsdom,
// which hits ERR_REQUIRE_ESM (html-encoding-sniffer vs @exodus/bytes) under Next 15 RSC.

import createDOMPurify from "dompurify";
import { Window } from "happy-dom";
import type { Config } from "dompurify";

// Match http(s) and protocol-relative CDN URLs (common in marketing email HTML).
const REMOTE_IMG =
  /<img\b([^>]*?)\bsrc\s*=\s*["']((?:https?:)?\/\/[^"']+)["']([^>]*)>/gi;

let purify: ReturnType<typeof createDOMPurify> | null = null;

function getPurify(): ReturnType<typeof createDOMPurify> {
  if (!purify) {
    const window = new Window({ url: "https://local.mailmind/" });
    purify = createDOMPurify(window as unknown as Window & typeof globalThis);
  }
  return purify;
}

export interface SanitizeOptions {
  blockRemoteImages?: boolean;
}

export function sanitizeEmailHtml(html: string, opts: SanitizeOptions = {}): string {
  const blockRemote = opts.blockRemoteImages ?? false;

  let preprocessed = html;
  if (blockRemote) {
    preprocessed = html.replace(REMOTE_IMG, (_m, pre, src, post) => {
      return `<img${pre}data-blocked-src="${src}"${post} style="background:#f3f4f6;border:1px dashed #d1d5db;min-height:32px;display:inline-block;padding:4px 8px;">`;
    });
  }

  const config: Config = {
    ALLOWED_TAGS: [
      "a",
      "b",
      "i",
      "u",
      "em",
      "strong",
      "p",
      "br",
      "hr",
      "blockquote",
      "pre",
      "code",
      "ul",
      "ol",
      "li",
      "div",
      "span",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "table",
      "thead",
      "tbody",
      "tr",
      "td",
      "th",
      "img",
      "figure",
      "figcaption",
    ],
    ALLOWED_ATTR: [
      "href",
      "title",
      "alt",
      "src",
      "style",
      "width",
      "height",
      "colspan",
      "rowspan",
      "align",
      "data-blocked-src",
      "data-cid",
      "target",
      "rel",
    ],
    ALLOWED_URI_REGEXP:
      /^(?:https?:|\/\/|mailto:|tel:|cid:|data:image\/(png|jpeg|gif|webp))/i,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "button"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  };

  return getPurify().sanitize(preprocessed, config);
}
