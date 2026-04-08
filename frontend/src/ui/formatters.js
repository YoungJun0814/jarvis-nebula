const TYPE_LABELS = {
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
