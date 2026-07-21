import { SITE_DOMAIN, SITE_NAME } from '../hooks/useSEO';
import type { Tour, BlogPost, Review } from '../types';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_DOMAIN,
    logo: `${SITE_DOMAIN}/Logo_Naranja.jpeg`,
    image: `${SITE_DOMAIN}/Logo_Bandera.jpg`,
    description:
      'Agencia de viajes de grupo desde el Estado de México. Tours nacionales e internacionales: playas, festivales, ferias, aventura y más.',
    email: 'contacto@recorramosmexico.com.mx',
    telephone: '+525623872050',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Tlalnepantla',
      addressRegion: 'Estado de México',
      addressCountry: 'MX',
    },
    sameAs: [
      'https://www.instagram.com/recorramosmexico_oficial/',
      'https://www.facebook.com/recorramosmx',
      'https://www.tiktok.com/@recorramosmexico_oficial',
    ],
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_DOMAIN,
    inLanguage: 'es-MX',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_DOMAIN}/tours?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function aggregateRatingSchema(reviews: Review[]) {
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avg = total / reviews.length;
  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateRating',
    ratingValue: avg.toFixed(1),
    reviewCount: reviews.length,
    bestRating: 5,
    worstRating: 1,
  };
}

export function tourSchema(tour: Tour, lang: 'es' | 'en' = 'es') {
  const title = lang === 'en' ? tour.title_en : tour.title_es;
  const description = lang === 'en' ? tour.description_en : tour.description_es;
  const itinerary = lang === 'en' ? tour.itinerary_en : tour.itinerary_es;

  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: title,
    description,
    url: `${SITE_DOMAIN}/tours/${tour.slug}`,
    image: tour.image_urls?.[0],
    touristType: 'GroupTour',
    provider: {
      '@type': 'TouristAttraction',
      name: SITE_NAME,
      url: SITE_DOMAIN,
    },
    itinerary: itinerary?.map((day) => ({
      '@type': 'ItemList',
      name: day.title,
      description: day.description,
    })),
    offers: {
      '@type': 'Offer',
      price: tour.price_mxn,
      priceCurrency: 'MXN',
      availability: 'https://schema.org/InStock',
      url: `${SITE_DOMAIN}/tours/${tour.slug}`,
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_DOMAIN}${item.path}`,
    })),
  };
}

export function blogPostSchema(post: BlogPost, lang: 'es' | 'en' = 'es') {
  const title = lang === 'en' ? post.title_en : post.title_es;
  const summary = lang === 'en' ? post.summary_en : post.summary_es;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: summary,
    url: `${SITE_DOMAIN}/blog/${post.slug}`,
    image: post.cover_image || `${SITE_DOMAIN}/Logo_Naranja.jpeg`,
    datePublished: post.created_at,
    dateModified: post.created_at,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_DOMAIN,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_DOMAIN}/Logo_Naranja.jpeg`,
      },
    },
    inLanguage: lang === 'en' ? 'en' : 'es-MX',
  };
}

export function serviceSchema(
  name: string,
  description: string,
  path: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    url: `${SITE_DOMAIN}${path}`,
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_DOMAIN,
    },
    areaServed: {
      '@type': 'Country',
      name: 'México',
    },
  };
}
