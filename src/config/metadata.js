// src/config/metadata.js

// This is the source of truth for all meta tags across pages
// Each page imports from here and passes its specific title/description to Helmet

export const siteMeta = {
  site: {
    name: 'ReachDesk CRM',
    url: 'https://reachdeskcrm.com',
    twitterHandle: '@reachdesk', // Update if you have a Twitter
    ogImage: 'https://reachdeskcrm.com/og-image.png', // Add OG image to public/
  },
  
  pages: {
    homepage: {
      title: 'ReachDesk — Your leads didn\'t ghost you. You ghosted them.',
      description: 'ReachDesk tells you who to follow up with today — so nothing slips while you\'re busy delivering client work. 7-day free trial (card required): 10 AI credits, 65 leads, 3 templates.',
      keywords: 'CRM, freelancer, lead follow-up, lead tracking, follow-up reminders',
    },
    
    pricing: {
      title: 'ReachDesk CRM Pricing — Plans from $12/month | Free Trial',
      description: 'ReachDesk CRM plans: Starter (1,000 leads), Pro (5,000 leads + smart folders), Teams (unlimited). Yearly plans double your limits. Start with a free trial.',
      keywords: 'pricing, CRM cost, freelancer CRM plans',
    },
    
    features: {
      title: 'ReachDesk CRM Features — Follow-Up Reminders, Pipeline, Automation',
      description: 'Checkpoint follow-up reminders, action suggestions, email sequences, auto-draft invoices, pipeline visualization, and project folders — see everything ReachDesk CRM does.',
      keywords: 'CRM features, follow-up reminders, pipeline CRM, email automation',
    },
    
    getStarted: {
      title: 'Get Started with ReachDesk CRM — First 10 Minutes',
      description: 'Add your first lead, set up a template, and get your first follow-up reminder. ReachDesk CRM onboarding guide for freelancers.',
      keywords: 'how to get started, CRM tutorial, ReachDesk CRM guide',
    },
    
    blog: {
      title: 'ReachDesk CRM Blog — Lead Management, CRM Tips & Strategies',
      description: 'Learn how to organize leads, automate follow-ups, and never lose a deal. Guides, templates, and strategies for freelancers and agencies.',
      keywords: 'blog, lead management, CRM strategies, freelancer tips',
    },
  },
};

// Helper function to generate OG meta tags
export const generateOGTags = (title, description, image = siteMeta.site.ogImage, url = siteMeta.site.url) => ({
  'og:title': title,
  'og:description': description,
  'og:image': image,
  'og:url': url,
  'og:type': 'website',
  'twitter:card': 'summary_large_image',
  'twitter:title': title,
  'twitter:description': description,
  'twitter:image': image,
});
