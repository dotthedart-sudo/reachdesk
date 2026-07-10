import React from 'react';
import { Helmet } from 'react-helmet-async';
import { organizationSchema, websiteSchema } from '../utils/schemaMarkup';

export default function GlobalHelmet() {
  return (
    <Helmet>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="theme-color" content="#0D1117" />
      <link rel="canonical" href="https://reachdesk.esemdot.com" />
      
      {/* Global schemas */}
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema())}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(websiteSchema())}
      </script>
    </Helmet>
  );
}
