/**
 * Pick dark/light blog cover for the current theme.
 * OG/social should keep using the absolute `coverImage` (dark default).
 */
export function resolveBlogCover(post, theme = 'dark') {
  if (!post) return '';
  if (theme === 'light' && post.coverImageLight) return post.coverImageLight;
  if (post.coverImageDark) return post.coverImageDark;
  return post.coverImage || '';
}
