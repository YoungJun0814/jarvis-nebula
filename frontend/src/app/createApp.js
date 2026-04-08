const PHASE_ITEMS = [
  {
    label: 'Frontend',
    detail: 'Vite, Three.js, force-graph, lint, test, and e2e configs are ready.',
  },
  {
    label: 'Backend',
    detail: 'FastAPI stubs, health endpoint, API contract stubs, and pytest config are ready.',
  },
  {
    label: 'Infra',
    detail: 'Docker Compose is prepared for a local Neo4j Community instance.',
  },
];

export function createApp(rootElement) {
  if (!rootElement) {
    throw new Error('Expected #app root element to exist.');
  }

  rootElement.innerHTML = `
    <main class="app-shell">
      <section class="status-card">
        <h1>Jarvis Nebula</h1>
        <p>
          Phase 0 scaffold is complete. Phase 1 can now focus on the static nebula,
          camera controls, and the first UI shell without re-deciding core architecture.
        </p>
        <ul class="status-grid">
          ${PHASE_ITEMS.map(
            (item) => `
              <li>
                <strong>${item.label}</strong>
                <span>${item.detail}</span>
              </li>
            `,
          ).join('')}
        </ul>
      </section>
    </main>
  `;

  return rootElement;
}
