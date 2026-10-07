import { useEffect } from 'react';

export const SITE_URL = 'https://dropdirect.com';

const DEFAULT_TITLE = 'DropDirect – Free P2P File Sharing | Send Large Files Directly, No Limits';
const DEFAULT_DESCRIPTION =
  'Send large files directly from device to device with DropDirect. Free, private, end-to-end encrypted peer-to-peer file sharing in your browser — no uploads, no sign-up, no file size limits.';

function setMeta(selector, attr, key, value) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

/**
 * Per-route SEO for the SPA: updates <title>, description, robots, canonical and OG/Twitter tags.
 * `noindex` is used for private pages (transfer rooms, 404) so they never show up in search results.
 */
export function useSeo({ title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION, path = '/', noindex = false } = {}) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;
    document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[name="robots"]', 'name', 'robots',
      noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMeta('meta[name="googlebot"]', 'name', 'googlebot', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setCanonical(noindex ? `${SITE_URL}/` : url);
  }, [title, description, path, noindex]);
}
