const lucide = require('lucide-react');
const icons = ['User', 'Mail', 'Phone', 'Building2', 'Tag', 'Link2', 'Globe', 'Plus', 'Flag', 'Zap', 'CircleDot', 'Folder', 'FileText', 'StickyNote', 'Linkedin', 'Instagram', 'Twitter'];
icons.forEach(name => {
  console.log(`${name}: ${typeof lucide[name]}`);
});
