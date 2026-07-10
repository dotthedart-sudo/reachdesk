// src/utils/schemaMarkup.js

// JSON-LD Schema generators for SEO + AI visibility

export const organizationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ReachDesk',
  url: 'https://reachdeskcrm.com',
  logo: 'https://reachdeskcrm.com/reachdesk-logo.svg',
  description: 'CRM for freelancers and agencies that centralizes leads and automates follow-ups.',
  sameAs: [
    // Add your social media profiles here
    // 'https://twitter.com/reachdesk',
    // 'https://www.linkedin.com/company/reachdesk',
  ],
});

export const websiteSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ReachDesk',
  url: 'https://reachdeskcrm.com',
  searchAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://reachdeskcrm.com/search?q={search_term}',
    },
  },
});

export const softwareApplicationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ReachDesk',
  description: 'CRM for freelancers and agencies.',
  url: 'https://reachdeskcrm.com',
  applicationCategory: 'BusinessApplication',
  offers: {
    '@type': 'Offer',
    priceCurrency: 'USD',
    price: '12.00',
    url: 'https://reachdeskcrm.com/homepage#pricing',
  },
  // Add aggregateRating once you have user reviews
});

export const blogPostSchema = (post) => ({
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.description,
  image: post.coverImage || 'https://reachdeskcrm.com/og-image.png',
  datePublished: post.publishedDate,
  dateModified: post.modifiedDate || post.publishedDate,
  author: {
    '@type': 'Organization',
    name: 'ReachDesk',
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': `https://reachdeskcrm.com/blog/${post.slug}`,
  },
});

export const faqSchema = (faqItems) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
});


