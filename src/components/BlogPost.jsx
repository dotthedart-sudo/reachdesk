import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import { generateOGTags } from '../config/metadata';
import { blogPostSchema } from '../utils/schemaMarkup';
import PublicNav from './PublicNav';
import '../styles/Blog.css';

export default function BlogPost() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPost();
  }, [slug]);

  const loadPost = async () => {
    try {
      // Step 1: Fetch metadata from blog-posts.json (built at build time)
      const indexResponse = await fetch('/blog-posts.json');
      const allPosts = await indexResponse.json();
      const postMetadata = allPosts.find((p) => p.slug === slug);

      if (!postMetadata) {
        throw new Error('Post not found');
      }

      // Step 2: Fetch markdown content
      const contentResponse = await fetch(`/blog-posts/${slug}.md`);
      if (!contentResponse.ok) throw new Error('Content not found');
      
      let markdown = await contentResponse.text();

      // Step 3: Strip frontmatter (--- ... ---)
      // Frontmatter is already parsed into blog-posts.json, so we remove it from content
      if (markdown.startsWith('---')) {
        const endIndex = markdown.indexOf('---', 3);
        if (endIndex !== -1) {
          markdown = markdown.substring(endIndex + 3).trim();
        }
      }
      markdown = markdown.replace(/\s*—\s*/g, ' — ');

      setPost(postMetadata);
      setContent(markdown);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load post:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="blog-post-container"><p>Loading...</p></div>;
  if (error) return <div className="blog-post-container"><p>Error: {error}</p></div>;
  if (!post) return <div className="blog-post-container"><p>Post not found</p></div>;

  const schemaData = blogPostSchema({
    title: post.title,
    description: post.description,
    coverImage: post.coverImage,
    publishedDate: post.publishedDate,
    modifiedDate: post.modifiedDate,
    slug,
  });

  return (
    <>
      <Helmet>
        <title>{post.title} | ReachDesk Blog</title>
        <meta name="description" content={post.description} />
        <meta name="keywords" content={post.keywords} />
        {Object.entries(generateOGTags(post.title, post.description, post.coverImage)).map(([key, value]) => (
          <meta key={key} property={key} content={value} />
        ))}
        <script type="application/ld+json">{JSON.stringify(schemaData)}</script>
      </Helmet>

      <PublicNav />

      <article className="blog-post-container">
        <div className="blog-post-header">
          <button onClick={() => navigate('/blog')} className="back-button">
            ← Back to Blog
          </button>
          <h1>{post.title}</h1>
          <p className="blog-post-description">{post.description}</p>
          <div className="blog-post-meta">
            <span className="category">{post.category}</span>
            <span className="date">
              {new Date(post.publishedDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {post.coverImage && (
          <div className="blog-post-image">
            <img src={post.coverImage} alt={post.title} />
          </div>
        )}

        <div className="blog-post-content">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>

        <div className="blog-post-footer">
          <button onClick={() => navigate('/blog')} className="back-button">
            ← Back to Blog
          </button>
        </div>
      </article>
    </>
  );
}
