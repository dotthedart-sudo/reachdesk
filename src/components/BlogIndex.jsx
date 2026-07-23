import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { siteMeta } from '../config/metadata';
import { generateOGTags } from '../config/metadata';
import PublicNav from './PublicNav';
import '../styles/Blog.css';

export default function BlogIndex() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dynamically load all blog post metadata
    // This scans the public/blog-posts.json file (which we'll create via sitemap script)
    loadBlogPosts();
  }, []);

  const loadBlogPosts = async () => {
    try {
      const response = await fetch('/blog-posts.json');
      const posts = await response.json();
      setPosts(posts);
    } catch (error) {
      console.error('Failed to load blog posts:', error);
      setPosts([]);
    }
    setLoading(false);
  };

  const pageTitle = siteMeta.pages.blog.title;
  const pageDescription = siteMeta.pages.blog.description;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        {Object.entries(generateOGTags(pageTitle, pageDescription)).map(([key, value]) => (
          <meta key={key} property={key} content={value} />
        ))}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'ReachDesk Blog',
            description: pageDescription,
            url: 'https://reachdeskcrm.com/blog',
          })}
        </script>
      </Helmet>

      <PublicNav />

      <div className="blog-container">
        <div className="blog-header">
          <h1>ReachDesk Blog</h1>
          <p>Strategies for freelancers and agencies to never lose a lead</p>
        </div>

        {loading ? (
          <p>Loading posts...</p>
        ) : posts.length === 0 ? (
          <p>No blog posts yet. Check back soon!</p>
        ) : (
          <div className="blog-grid">
            {posts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="blog-card">
                {post.coverImage && (
                  <div className="blog-card-image">
                    <img src={post.coverImage} alt={post.title} />
                  </div>
                )}
                <div className="blog-card-content">
                  <h2>{post.title.replace(/\s*—\s*/g, ' — ')}</h2>
                  <p>{post.description}</p>
                  <div className="blog-card-meta">
                    <span className="category">{post.category}</span>
                    <span className="date">
                      {new Date(post.publishedDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
