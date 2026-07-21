import { useEffect } from 'react';

export const SITE_DOMAIN = 'https://recorramosmexico.com';
export const SITE_DOMAIN_MX = 'https://recorramosmexico.com.mx';
export const SITE_NAME = 'Recorramos México';

interface SEOOptions {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  jsonLd?: object | object[];
  publishedTime?: string;
  modifiedTime?: string;
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string, hreflang?: string) {
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function upsertScript(id: string, content: string) {
  let el = document.head.querySelector<HTMLScriptElement>(`script[data-seo="${id}"]`);
  if (!el) {
    el = document.createElement('script');
    el.setAttribute('type', 'application/ld+json');
    el.setAttribute('data-seo', id);
    document.head.appendChild(el);
  }
  el.innerHTML = content;
}

function removeScript(id: string) {
  const el = document.head.querySelector(`script[data-seo="${id}"]`);
  if (el) el.remove();
}

export function useSEO({
  title,
  description,
  path = '',
  image = '/Logo_Naranja.jpeg',
  type = 'website',
  noindex = false,
  jsonLd,
  publishedTime,
  modifiedTime,
}: SEOOptions) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const url = `${SITE_DOMAIN}${path}`;
    const imageUrl = image.startsWith('http') ? image : `${SITE_DOMAIN}${image}`;

    document.title = fullTitle;

    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');

    // Open Graph
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', url);
    upsertMeta('property', 'og:image', imageUrl);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:site_name', SITE_NAME);
    upsertMeta('property', 'og:locale', 'es_MX');

    // Twitter Cards
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', imageUrl);

    // Canonical
    upsertLink('canonical', url);

    // hreflang cross-domain
    upsertLink('alternate', `${SITE_DOMAIN}${path}`, 'es');
    upsertLink('alternate', `${SITE_DOMAIN_MX}${path}`, 'es-MX');
    upsertLink('alternate', `${SITE_DOMAIN}${path}`, 'x-default');

    // Article meta
    if (type === 'article' && publishedTime) {
      upsertMeta('property', 'article:published_time', publishedTime);
      if (modifiedTime) upsertMeta('property', 'article:modified_time', modifiedTime);
    }

    // JSON-LD
    const prevScripts = document.head.querySelectorAll('script[data-seo]');
    prevScripts.forEach((s) => s.remove());

    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      items.forEach((item, i) => {
        upsertScript(`jsonld-${i}`, JSON.stringify(item));
      });
    }

    return () => {
      // Clean up JSON-LD on unmount
      const scripts = document.head.querySelectorAll('script[data-seo]');
      scripts.forEach((s) => s.remove());
    };
  }, [title, description, path, image, type, noindex, jsonLd, publishedTime, modifiedTime]);
}
