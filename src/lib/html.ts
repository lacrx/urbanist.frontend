import { marked } from "marked";
import { sanitize } from "isomorphic-dompurify";
import type { SiteConfig } from "../site-config";

const SUBSTACK_CDN_RE =
  /(<img\s[^>]*src=")(https:\/\/substackcdn\.com\/image\/fetch\/[^/]+\/)(https%3A[^"]+)("[^>]*>)/g;

export function addResponsiveSrcset(html: string): string {
  const CDN = "https://substackcdn.com/image/fetch/";
  const OPTS = ",c_limit,f_auto,q_auto:good,fl_progressive:steep/";
  return html.replace(
    SUBSTACK_CDN_RE,
    (_match, pre, _cdnUrl, encodedSrc, post) => {
      const s300 = `${CDN}w_300${OPTS}${encodedSrc}`;
      const s600 = `${CDN}w_600${OPTS}${encodedSrc}`;
      const s1200 = `${CDN}w_1200${OPTS}${encodedSrc}`;
      const srcset = `${s300} 300w, ${s600} 600w, ${s1200} 1200w`;
      const sizes = "(max-width: 600px) 100vw, 600px";
      return `${pre}${s600}${post.replace(
        ">",
        ` srcset="${srcset}" sizes="${sizes}" loading="lazy">`,
      )}`;
    },
  );
}

let markedConfigured = false;

export function processHtml(body: string, config: SiteConfig): string {
  if (config.build.substackSrcset && !markedConfigured) {
    marked.use({
      renderer: {
        list(token) {
          if (token.ordered) return false;
          return token.items
            .map((item) => {
              const inner = this.parser
                .parse(item.tokens)
                .replace(/^<p>|<\/p>\s*$/g, "")
                .trim();
              return `<p>${inner}</p>\n`;
            })
            .join("");
        },
      },
    });
    markedConfigured = true;
  }

  const html = sanitize(marked.parse(body) as string);
  return config.build.substackSrcset ? addResponsiveSrcset(html) : html;
}
