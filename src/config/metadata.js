// src/config/metadata.js

// This is the source of truth for all meta tags across pages
// Each page imports from here and passes its specific title/description to Helmet

export const siteMeta = {
  site: {
    name: 'ReachDesk',
    url: 'https://reachdeskcrm.com',
    twitterHandle: '@reachdesk', // Update if you have a Twitter
    ogImage: 'https://reachdeskcrm.com/og-image.png', // Add OG image to public/
  },
  
  pages: {
    homepage: {
      title: 'ReachDesk — CRM for Freelancers Who Hate Losing Leads',
      description: 'ReachDesk centralizes every lead, note, and follow-up in one place. Built-in reminders, email sequences, and multi-channel tracking for freelancers and agencies.',
      keywords: 'CRM, freelancer, lead management, follow-up reminders',
    },
    
    pricing: {
      title: 'ReachDesk Pricing — Plans from $12/month | Free Trial',
      description: 'ReachDesk plans: Starter (1,000 leads), Pro (5,000 leads + smart folders), Teams (unlimited). Yearly plans double your limits. Start with a free trial.',
      keywords: 'pricing, CRM cost, freelancer CRM plans',
    },
    
    features: {
      title: 'ReachDesk Features — Follow-Up Reminders, Pipeline, Automation',
      description: 'Checkpoint follow-up reminders, action suggestions, email sequences, auto-draft invoices, pipeline visualization, and project folders — see everything ReachDesk does.',
      keywords: 'CRM features, follow-up reminders, pipeline CRM, email automation',
    },
    
    getStarted: {
      title: 'Get Started with ReachDesk — First 10 Minutes',
      description: 'Add your first lead, set up a template, and get your first follow-up reminder. ReachDesk onboarding guide for freelancers.',
      keywords: 'how to get started, CRM tutorial, ReachDesk guide',
    },
    
    blog: {
      title: 'ReachDesk Blog — Lead Management, CRM Tips & Strategies',
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
