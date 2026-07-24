/**
 * Generate ReachDesk blog cover pairs (dark + light) as WebP.
 * Flat editorial vector style, app palette, short labels.
 */
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const OUT_DIR = path.join(__dirname, '../public/blog/covers');
const BLOG_DIR = path.join(__dirname, '../src/content/blog');
const SITE = 'https://reachdeskcrm.com';

const PALETTES = {
  dark: {
    bg: '#0D1117',
    card: '#161B22',
    border: '#30363D',
    text: '#FFFFFF',
    muted: '#8B949E',
    secondary: '#C9D1D9',
    blue: '#5B8FB9',
    green: '#7FB5A0',
    hot: '#E05252',
    warm: '#E8A838',
    cold: '#5B8FB9',
  },
  light: {
    bg: '#F2F4F7',
    card: '#FFFFFF',
    border: '#C8D0DC',
    text: '#0D1117',
    muted: '#5A6478',
    secondary: '#3D444D',
    blue: '#3E7BB8',
    green: '#4E9A83',
    hot: '#C0392B',
    warm: '#D4890A',
    cold: '#3E7BB8',
  },
};

const POSTS = [
  { slug: 'why-clients-ghost-freelancers', family: 'ghost', label: 'Gone quiet' },
  { slug: 'how-to-follow-up-without-being-annoying', family: 'ghost', label: 'Follow up kindly' },
  { slug: 'how-many-follow-ups-before-giving-up', family: 'ghost', label: 'Know when to stop' },
  { slug: 'follow-up-email-templates', family: 'ghost', label: 'Ready to send' },
  { slug: 'stop-checking-5-apps-before-work', family: 'memory', label: 'One place' },
  { slug: 'freelancer-context-switching-leads', family: 'memory', label: 'Stay focused' },
  { slug: 'manage-30-leads-without-losing-mind', family: 'memory', label: 'Under control' },
  { slug: 'pick-up-where-you-left-off-leads', family: 'memory', label: 'Pick up here' },
  { slug: 'the-7-checkpoint-follow-up-system', family: 'checkpoint', label: '7 checkpoints' },
  { slug: 'crm-that-tells-you-what-to-do-next', family: 'checkpoint', label: 'Do this next' },
  { slug: 'freelancer-morning-outreach-habit', family: 'checkpoint', label: 'Morning focus' },
  { slug: 'freelancer-daily-outreach-routine', family: 'checkpoint', label: 'Daily routine' },
  { slug: 'hot-warm-cold-lead-prioritization', family: 'heat', label: 'Hot · Warm · Cold' },
  { slug: 'how-to-organize-leads', family: 'heat', label: 'Sorted' },
  { slug: 'best-way-to-track-client-conversations', family: 'heat', label: 'Full context' },
  { slug: 'auto-invoice-on-booking', family: 'close', label: 'Booked → Invoice' },
  { slug: 'stop-feast-or-famine-freelancing', family: 'close', label: 'Steady pipeline' },
];

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sceneGhost(p, variant) {
  const fade = variant === 0 ? 0.35 : variant === 1 ? 0.5 : 0.65;
  return `
  <g transform="translate(720,140)">
    <rect x="0" y="0" width="360" height="340" rx="16" fill="${p.card}" stroke="${p.border}" stroke-width="2"/>
    <circle cx="64" cy="56" r="22" fill="${p.blue}" opacity="0.35"/>
    <rect x="100" y="40" width="160" height="14" rx="4" fill="${p.muted}" opacity="0.5"/>
    <rect x="100" y="64" width="100" height="10" rx="3" fill="${p.muted}" opacity="0.3"/>
    <g opacity="${fade}">
      <rect x="40" y="120" width="220" height="48" rx="12" fill="${p.bg}" stroke="${p.border}"/>
      <circle cx="230" cy="132" r="4" fill="${p.blue}"/>
      <circle cx="246" cy="132" r="4" fill="${p.blue}"/>
      <circle cx="262" cy="132" r="4" fill="${p.blue}"/>
    </g>
    <rect x="40" y="190" width="180" height="40" rx="12" fill="${p.bg}" stroke="${p.border}" opacity="0.45"/>
    <rect x="40" y="250" width="140" height="36" rx="12" fill="${p.bg}" stroke="${p.border}" opacity="0.25"/>
    <path d="M300 300 c20-40 60-40 80 0" fill="none" stroke="${p.muted}" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
    <circle cx="380" cy="300" r="10" fill="none" stroke="${p.muted}" stroke-width="2" opacity="0.5"/>
  </g>`;
}

function sceneMemory(p, variant) {
  const notes = [
    { x: 740, y: 160, r: -12, c: p.warm },
    { x: 860, y: 200, r: 8, c: p.blue },
    { x: 780, y: 280, r: -6, c: p.green },
    { x: 920, y: 300, r: 14, c: p.hot },
  ];
  const tabN = 3 + (variant % 2);
  let tabs = '';
  for (let i = 0; i < tabN; i++) {
    tabs += `<rect x="${720 + i * 28}" y="${120 + i * 8}" width="200" height="260" rx="10" fill="${p.card}" stroke="${p.border}" stroke-width="2" opacity="${0.9 - i * 0.15}"/>`;
  }
  return `
  <g>
    ${tabs}
    ${notes
      .map(
        (n) => `
      <g transform="translate(${n.x},${n.y}) rotate(${n.r})">
        <rect width="90" height="90" rx="6" fill="${n.c}" opacity="0.85"/>
        <rect x="12" y="20" width="66" height="6" rx="2" fill="${p.bg}" opacity="0.35"/>
        <rect x="12" y="36" width="50" height="6" rx="2" fill="${p.bg}" opacity="0.25"/>
      </g>`
      )
      .join('')}
  </g>`;
}

function sceneCheckpoint(p, variant) {
  const highlight = 2 + (variant % 4);
  let dots = '';
  for (let i = 0; i < 7; i++) {
    const x = 720 + i * 52;
    const y = 280;
    const on = i === highlight;
    dots += `
      <circle cx="${x}" cy="${y}" r="${on ? 16 : 11}" fill="${on ? p.blue : p.card}" stroke="${on ? p.blue : p.border}" stroke-width="3"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" font-weight="700" fill="${on ? p.bg : p.muted}">${i + 1}</text>`;
    if (i < 6) {
      dots += `<line x1="${x + 14}" y1="${y}" x2="${x + 38}" y2="${y}" stroke="${p.border}" stroke-width="3" stroke-linecap="round"/>`;
    }
  }
  return `
  <g>
    <rect x="700" y="150" width="400" height="200" rx="16" fill="${p.card}" stroke="${p.border}" stroke-width="2"/>
    <rect x="730" y="180" width="160" height="12" rx="4" fill="${p.muted}" opacity="0.4"/>
    <rect x="730" y="206" width="100" height="10" rx="3" fill="${p.muted}" opacity="0.25"/>
    <rect x="900" y="176" width="120" height="36" rx="8" fill="${p.blue}" opacity="0.2" stroke="${p.blue}"/>
    <text x="960" y="199" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${p.blue}">Next</text>
    ${dots}
  </g>`;
}

function sceneHeat(p) {
  const lanes = [
    { label: 'Hot', c: p.hot, y: 160 },
    { label: 'Warm', c: p.warm, y: 260 },
    { label: 'Cold', c: p.cold, y: 360 },
  ];
  return `
  <g>
    ${lanes
      .map(
        (l, i) => `
      <rect x="720" y="${l.y}" width="380" height="78" rx="12" fill="${p.card}" stroke="${p.border}" stroke-width="2"/>
      <rect x="720" y="${l.y}" width="10" height="78" rx="4" fill="${l.c}"/>
      <text x="750" y="${l.y + 46}" font-family="system-ui,sans-serif" font-size="20" font-weight="700" fill="${l.c}">${l.label}</text>
      <circle cx="1020" cy="${l.y + 39}" r="8" fill="${l.c}" opacity="${0.9 - i * 0.2}"/>
      <circle cx="1048" cy="${l.y + 39}" r="8" fill="${l.c}" opacity="${0.55 - i * 0.1}"/>
    `
      )
      .join('')}
  </g>`;
}

function sceneClose(p, variant) {
  if (variant % 2 === 0) {
    return `
    <g>
      <rect x="720" y="170" width="170" height="220" rx="14" fill="${p.card}" stroke="${p.border}" stroke-width="2"/>
      <text x="805" y="220" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="${p.blue}">Booked</text>
      <circle cx="805" cy="280" r="28" fill="${p.blue}" opacity="0.2"/>
      <path d="M790 280 l10 10 20-22" fill="none" stroke="${p.blue}" stroke-width="4" stroke-linecap="round"/>
      <path d="M910 280 h40" stroke="${p.muted}" stroke-width="4" stroke-linecap="round" marker-end="url(#arrow)"/>
      <rect x="970" y="170" width="170" height="220" rx="14" fill="${p.card}" stroke="${p.green}" stroke-width="2"/>
      <text x="1055" y="220" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="${p.green}">Invoice</text>
      <rect x="1000" y="250" width="110" height="10" rx="3" fill="${p.muted}" opacity="0.35"/>
      <rect x="1000" y="275" width="80" height="10" rx="3" fill="${p.muted}" opacity="0.25"/>
      <rect x="1000" y="310" width="90" height="28" rx="6" fill="${p.green}" opacity="0.85"/>
    </g>`;
  }
  return `
  <g>
    <path d="M740 360 C780 200, 860 400, 900 240 C940 120, 1000 300, 1080 220" fill="none" stroke="${p.border}" stroke-width="6" stroke-linecap="round"/>
    <path d="M740 360 C800 300, 880 280, 1080 260" fill="none" stroke="${p.green}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="740" cy="360" r="8" fill="${p.hot}"/>
    <circle cx="1080" cy="260" r="8" fill="${p.green}"/>
    <text x="910" y="180" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="${p.muted}">Steady</text>
  </g>`;
}

function buildSvg(post, mode) {
  const p = PALETTES[mode];
  const variant = Math.abs(
    post.slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  );
  let art = '';
  if (post.family === 'ghost') art = sceneGhost(p, variant % 3);
  else if (post.family === 'memory') art = sceneMemory(p, variant);
  else if (post.family === 'checkpoint') art = sceneCheckpoint(p, variant);
  else if (post.family === 'heat') art = sceneHeat(p);
  else art = sceneClose(p, variant);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${p.bg}"/>
  <circle cx="1100" cy="-40" r="280" fill="${p.blue}" opacity="0.08"/>
  <circle cx="80" cy="700" r="220" fill="${p.green}" opacity="0.06"/>
  <text x="96" y="120" font-family="system-ui,-apple-system,sans-serif" font-size="18" font-weight="700" letter-spacing="0.12em" fill="${p.muted}">REACHDESK</text>
  <text x="96" y="200" font-family="system-ui,-apple-system,sans-serif" font-size="42" font-weight="700" fill="${p.text}">${esc(post.label)}</text>
  <rect x="96" y="230" width="64" height="4" rx="2" fill="${p.blue}"/>
  <text x="96" y="280" font-family="system-ui,-apple-system,sans-serif" font-size="18" fill="${p.secondary}">Follow-ups that don&apos;t slip</text>
  ${art}
</svg>`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.log('Installing sharp…');
    require('child_process').execSync('npm install sharp --no-save', {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
    sharp = require('sharp');
  }

  // Style refs
  const stylePost = { slug: '_style-ref', family: 'checkpoint', label: 'Style reference' };
  for (const mode of ['dark', 'light']) {
    const svg = buildSvg(stylePost, mode);
    fs.writeFileSync(path.join(OUT_DIR, `_style-ref-${mode}.svg`), svg);
    await sharp(Buffer.from(svg))
      .webp({ quality: 88 })
      .toFile(path.join(OUT_DIR, `_style-ref-${mode}.webp`));
  }
  console.log('✅ Style refs written');

  for (const post of POSTS) {
    for (const mode of ['dark', 'light']) {
      const svg = buildSvg(post, mode);
      const svgPath = path.join(OUT_DIR, `${post.slug}-${mode}.svg`);
      const webpPath = path.join(OUT_DIR, `${post.slug}-${mode}.webp`);
      fs.writeFileSync(svgPath, svg);
      await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(webpPath);
    }
    console.log(`✅ ${post.slug}`);
  }

  // Update markdown frontmatter
  for (const post of POSTS) {
    const mdPath = path.join(BLOG_DIR, `${post.slug}.md`);
    if (!fs.existsSync(mdPath)) {
      console.warn(`Missing markdown: ${post.slug}`);
      continue;
    }
    const raw = fs.readFileSync(mdPath, 'utf8');
    const parsed = matter(raw);
    parsed.data.coverImage = `${SITE}/blog/covers/${post.slug}-dark.webp`;
    parsed.data.coverImageDark = `/blog/covers/${post.slug}-dark.webp`;
    parsed.data.coverImageLight = `/blog/covers/${post.slug}-light.webp`;
    const out = matter.stringify(parsed.content.replace(/^\uFEFF/, ''), parsed.data);
    fs.writeFileSync(mdPath, out);
  }
  console.log('✅ Frontmatter updated');
  console.log(`🎉 ${POSTS.length * 2} covers + style refs in ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
