const TYPE_LABELS = {
  folder: 'Folder',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  markdown: 'Markdown',
  json: 'JSON',
  css: 'CSS',
  html: 'HTML',
  python: 'Python',
  image: 'Image',
  config: 'Config',
  // legacy demo categories, kept for back-compat with any snapshot data
  person: 'Person',
  project: 'Project',
  concept: 'Concept',
  document: 'Document',
};

export function formatTypeLabel(type) {
  return TYPE_LABELS[type] ?? 'Entity';
}

export function formatConnectionLabel(count) {
  return `${count} connection${count === 1 ? '' : 's'}`;
}

export function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}
