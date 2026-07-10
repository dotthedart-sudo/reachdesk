// scripts/generate-sitemap.cjs
// Run this before deploying to Vercel to generate sitemap.xml and blog-posts.json

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const SITE_URL = 'https://reachdesk.esemdot.com';
const PUBLIC_DIR = path.join(__dirname, '../public');
const BLOG_DIR = path.join(__dirname, '../src/content/blog');

// Static pages (always include these)
const staticPages = [
  { path: '/', changefreq: 'weekly', priority: 1.0 },
  { path: '/homepage', changefreq: 'weekly', priority: 1.0 },
  { path: '/get-started', changefreq: 'monthly', priority: 0.9 },
  { path: '/terms', changefreq: 'yearly', priority: 0.5 },
  { path: '/privacy', changefreq: 'yearly', priority: 0.5 },
  { path: '/refund', changefreq: 'yearly', priority: 0.5 },
  { path: '/blog', changefreq: 'weekly', priority: 0.9 },
];

function generateSitemap() {
  console.log('🔄 Generating sitemap.xml and blog-posts.json...');

  // Read all markdown files from blog directory
  let blogPosts = [];
  if (fs.existsSync(BLOG_DIR)) {
    const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
    
    blogPosts = files.map((file) => {
      const filePath = path.join(BLOG_DIR, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { data: frontmatter } = matter(fileContent);
      const slug = file.replace('.md', '');
      
      return {
        slug,
        ...frontmatter,
      };
    });
  }

  // Generate sitemap.xml
  let sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemapXml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Add static pages
  staticPages.forEach(({ path: pagePath, changefreq, priority }) => {
    sitemapXml += '  <url>\n';
    sitemapXml += `    <loc>${SITE_URL}${pagePath}</loc>\n`;
    sitemapXml += `    <changefreq>${changefreq}</changefreq>\n`;
    sitemapXml += `    <priority>${priority}</priority>\n`;
    sitemapXml += '  </url>\n';
  });

  // Add blog posts
  blogPosts.forEach(({ slug, publishedDate }) => {
    const dateObj = new Date(publishedDate);
    const lastmod = isNaN(dateObj.getTime()) ? publishedDate : dateObj.toISOString().split('T')[0];
    sitemapXml += '  <url>\n';
    sitemapXml += `    <loc>${SITE_URL}/blog/${slug}</loc>\n`;
    sitemapXml += `    <lastmod>${lastmod}</lastmod>\n`;
    sitemapXml += '    <changefreq>monthly</changefreq>\n';
    sitemapXml += '    <priority>0.8</priority>\n';
    sitemapXml += '  </url>\n';
  });

  sitemapXml += '</urlset>';

  // Write sitemap.xml to public folder
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemapXml, 'utf-8');
  console.log('✅ sitemap.xml generated');

  // Write blog-posts.json for BlogIndex to load
  const blogPostsJson = JSON.stringify(blogPosts, null, 2);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'blog-posts.json'), blogPostsJson, 'utf-8');
  console.log('✅ blog-posts.json generated');

  // Create blog-posts folder in public if it doesn't exist
  const blogPostsPublicDir = path.join(PUBLIC_DIR, 'blog-posts');
  if (!fs.existsSync(blogPostsPublicDir)) {
    fs.mkdirSync(blogPostsPublicDir, { recursive: true });
    console.log('✅ /public/blog-posts folder created');
  }

  // Copy markdown files to public/blog-posts so they can be fetched at runtime
  if (fs.existsSync(BLOG_DIR)) {
    const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md'));
    files.forEach((file) => {
      const source = path.join(BLOG_DIR, file);
      const dest = path.join(blogPostsPublicDir, file);
      fs.copyFileSync(source, dest);
    });
    console.log(`✅ ${files.length} blog post(s) copied to public/blog-posts`);
  }

  console.log('🎉 Sitemap generation complete!');
}

generateSitemap();
