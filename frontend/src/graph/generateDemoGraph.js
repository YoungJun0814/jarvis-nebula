// Virtual filesystem demo tree. Every node represents a folder or file;
// drilling into a folder shows its children on the next layer. The tree is
// hand-authored per project template, then blown up into realistic-looking
// project structures so the MVP has enough nodes to demonstrate navigation.

const FILE_TYPE_BY_EXTENSION = {
  js: 'javascript',
  mjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  md: 'markdown',
  mdx: 'markdown',
  json: 'json',
  css: 'css',
  scss: 'css',
  html: 'html',
  py: 'python',
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  svg: 'image',
  webp: 'image',
  yml: 'config',
  yaml: 'config',
  toml: 'config',
  env: 'config',
  gitignore: 'config',
  lock: 'config',
  sql: 'config',
};

const WEB_TEMPLATE = {
  suffix: 'web',
  type: 'frontend web app',
  children: [
    {
      name: 'src',
      children: [
        {
          name: 'components',
          children: [
            'Header.jsx',
            'Footer.jsx',
            'Sidebar.jsx',
            'Navbar.jsx',
            'Button.jsx',
            'Card.jsx',
            'Modal.jsx',
            'Input.jsx',
            'Toast.jsx',
            'Avatar.jsx',
          ],
        },
        {
          name: 'pages',
          children: ['Home.jsx', 'About.jsx', 'Contact.jsx', 'Dashboard.jsx', 'Settings.jsx'],
        },
        {
          name: 'hooks',
          children: ['useAuth.ts', 'useFetch.ts', 'useDebounce.ts', 'useTheme.ts'],
        },
        {
          name: 'utils',
          children: ['format.js', 'validate.js', 'logger.js', 'storage.js'],
        },
        {
          name: 'styles',
          children: ['main.css', 'theme.css', 'reset.css', 'tokens.css'],
        },
        {
          name: 'api',
          children: ['client.ts', 'graphql.ts', 'rest.ts', 'mock.ts'],
        },
        {
          name: 'types',
          children: ['index.ts', 'models.ts', 'api.ts'],
        },
        'App.jsx',
        'main.jsx',
        'index.css',
      ],
    },
    {
      name: 'tests',
      children: [
        { name: 'unit', children: ['auth.test.js', 'format.test.js', 'validate.test.js'] },
        { name: 'integration', children: ['api.test.js', 'login.test.js'] },
      ],
    },
    {
      name: 'public',
      children: ['index.html', 'favicon.png', 'logo.svg', 'robots.txt'],
    },
    {
      name: 'docs',
      children: ['README.md', 'CHANGELOG.md', 'ARCHITECTURE.md'],
    },
    'package.json',
    'tsconfig.json',
    'vite.config.js',
    'README.md',
    '.gitignore',
    '.env.example',
  ],
};

const API_TEMPLATE = {
  suffix: 'api',
  type: 'backend service',
  children: [
    {
      name: 'src',
      children: [
        {
          name: 'routes',
          children: ['auth.ts', 'users.ts', 'graph.ts', 'files.ts', 'admin.ts'],
        },
        {
          name: 'controllers',
          children: ['authController.ts', 'userController.ts', 'graphController.ts'],
        },
        {
          name: 'models',
          children: ['User.ts', 'Session.ts', 'Graph.ts', 'AuditLog.ts'],
        },
        {
          name: 'middleware',
          children: ['auth.ts', 'logger.ts', 'rateLimit.ts', 'errorHandler.ts'],
        },
        {
          name: 'services',
          children: ['database.ts', 'email.ts', 'cache.ts', 'queue.ts'],
        },
        {
          name: 'utils',
          children: ['jwt.ts', 'hash.ts', 'validate.ts'],
        },
        'app.ts',
        'server.ts',
        'index.ts',
      ],
    },
    {
      name: 'migrations',
      children: ['001_init.sql', '002_users.sql', '003_sessions.sql'],
    },
    {
      name: 'tests',
      children: ['auth.test.ts', 'users.test.ts', 'graph.test.ts'],
    },
    {
      name: 'docs',
      children: ['README.md', 'API.md', 'DEPLOY.md'],
    },
    'package.json',
    'tsconfig.json',
    'Dockerfile',
    '.env.example',
    '.gitignore',
  ],
};

const ML_TEMPLATE = {
  suffix: 'ml',
  type: 'machine learning pipeline',
  children: [
    {
      name: 'src',
      children: [
        {
          name: 'models',
          children: ['classifier.py', 'embedding.py', 'transformer.py', 'baseline.py'],
        },
        {
          name: 'data',
          children: ['loader.py', 'preprocessor.py', 'augment.py', 'splitter.py'],
        },
        {
          name: 'training',
          children: ['train.py', 'evaluate.py', 'callbacks.py', 'optimizer.py'],
        },
        {
          name: 'inference',
          children: ['predict.py', 'serve.py', 'batch.py'],
        },
        {
          name: 'utils',
          children: ['metrics.py', 'visualization.py', 'logging.py'],
        },
      ],
    },
    {
      name: 'tests',
      children: ['test_classifier.py', 'test_loader.py', 'test_metrics.py'],
    },
    {
      name: 'notebooks',
      children: ['exploration.md', 'analysis.md'],
    },
    {
      name: 'configs',
      children: ['base.json', 'production.json', 'dev.json'],
    },
    'requirements.txt',
    'setup.py',
    'README.md',
    '.gitignore',
  ],
};

const DOCS_TEMPLATE = {
  suffix: 'docs',
  type: 'documentation site',
  children: [
    {
      name: 'content',
      children: [
        { name: 'guides', children: ['getting-started.md', 'installation.md', 'tutorial.md'] },
        { name: 'reference', children: ['api.md', 'cli.md', 'config.md'] },
        { name: 'concepts', children: ['architecture.md', 'data-flow.md', 'security.md'] },
      ],
    },
    {
      name: 'assets',
      children: ['logo.svg', 'hero.png', 'diagram.svg'],
    },
    'package.json',
    'README.md',
    'docusaurus.config.js',
  ],
};

const MOBILE_TEMPLATE = {
  suffix: 'mobile',
  type: 'mobile client',
  children: [
    {
      name: 'src',
      children: [
        {
          name: 'screens',
          children: ['HomeScreen.tsx', 'LoginScreen.tsx', 'ProfileScreen.tsx', 'SettingsScreen.tsx'],
        },
        {
          name: 'components',
          children: ['AppBar.tsx', 'TabBar.tsx', 'List.tsx', 'ListItem.tsx'],
        },
        {
          name: 'navigation',
          children: ['RootNavigator.tsx', 'TabNavigator.tsx'],
        },
        {
          name: 'services',
          children: ['auth.ts', 'storage.ts', 'push.ts'],
        },
        'App.tsx',
      ],
    },
    {
      name: 'assets',
      children: ['icon.png', 'splash.png'],
    },
    'package.json',
    'tsconfig.json',
    'metro.config.js',
    'app.json',
  ],
};

const DESIGN_TEMPLATE = {
  suffix: 'design',
  type: 'design system',
  children: [
    {
      name: 'tokens',
      children: ['colors.json', 'spacing.json', 'typography.json', 'shadows.json'],
    },
    {
      name: 'components',
      children: [
        { name: 'Button', children: ['Button.tsx', 'Button.css', 'Button.stories.tsx'] },
        { name: 'Card', children: ['Card.tsx', 'Card.css', 'Card.stories.tsx'] },
        { name: 'Input', children: ['Input.tsx', 'Input.css', 'Input.stories.tsx'] },
      ],
    },
    {
      name: 'icons',
      children: ['chevron.svg', 'search.svg', 'settings.svg', 'close.svg'],
    },
    'package.json',
    'README.md',
  ],
};

const INFRA_TEMPLATE = {
  suffix: 'infra',
  type: 'infrastructure config',
  children: [
    {
      name: 'terraform',
      children: ['main.tf', 'variables.tf', 'outputs.tf'],
    },
    {
      name: 'kubernetes',
      children: ['deployment.yaml', 'service.yaml', 'ingress.yaml', 'configmap.yaml'],
    },
    {
      name: 'scripts',
      children: ['deploy.py', 'rollback.py', 'seed.py'],
    },
    {
      name: 'docs',
      children: ['runbook.md', 'architecture.md'],
    },
    'Dockerfile',
    'docker-compose.yml',
    'Makefile',
    'README.md',
  ],
};

const PROJECT_TEMPLATES = [
  { name: 'jarvis-nebula', template: WEB_TEMPLATE },
  { name: 'atlas-api', template: API_TEMPLATE },
  { name: 'helios-mobile', template: MOBILE_TEMPLATE },
  { name: 'orion-ml', template: ML_TEMPLATE },
  { name: 'beacon-docs', template: DOCS_TEMPLATE },
  { name: 'pulse-design', template: DESIGN_TEMPLATE },
  { name: 'vertex-infra', template: INFRA_TEMPLATE },
  { name: 'summit-web', template: WEB_TEMPLATE },
];

export function generateDemoGraph(seed = 20260415) {
  const random = createMulberry32(seed);
  const nodesById = new Map();
  const links = [];

  const rootIds = [];

  PROJECT_TEMPLATES.forEach((project, index) => {
    const rootId = `root-${project.name}`;
    const rootNode = createFolderNode({
      id: rootId,
      name: project.name,
      parentId: null,
      depth: 0,
      index,
      random,
      summary: `Root folder of the ${project.template.type} repository.`,
      cluster: project.template.type,
    });
    nodesById.set(rootId, rootNode);
    rootIds.push(rootId);

    const childIds = spawnChildren({
      parentId: rootId,
      parentPath: project.name,
      entries: project.template.children,
      depth: 1,
      nodesById,
      random,
      cluster: project.template.type,
    });
    rootNode.childIds = childIds;
  });

  // Generate sibling links inside each folder so layers aren't empty of connections.
  const folderToChildren = new Map();
  nodesById.forEach((node) => {
    if (node.type === 'folder' && node.childIds.length > 1) {
      folderToChildren.set(node.id, node.childIds);
    }
  });
  // Also add sibling links at the root level so the first layer has some structure.
  folderToChildren.set('__ROOT__', rootIds);

  folderToChildren.forEach((childIds) => {
    if (childIds.length < 2) return;
    const density = childIds.length <= 4 ? 0.34 : childIds.length <= 8 ? 0.18 : 0.09;
    for (let i = 0; i < childIds.length; i += 1) {
      for (let j = i + 1; j < childIds.length; j += 1) {
        if (random() >= density) continue;
        const sourceId = childIds[i];
        const targetId = childIds[j];
        const source = nodesById.get(sourceId);
        const target = nodesById.get(targetId);
        if (!source || !target) continue;
        links.push({
          id: `link-${links.length}`,
          source: sourceId,
          target: targetId,
          weight: Number((0.3 + random() * 0.6).toFixed(2)),
          kind: source.type === target.type ? 'sibling' : 'reference',
        });
      }
    }
    // Make sure every child has at least one sibling link so it doesn't float alone.
    const localAdjacency = new Map(childIds.map((id) => [id, 0]));
    links.forEach((link) => {
      if (localAdjacency.has(link.source) && localAdjacency.has(link.target)) {
        localAdjacency.set(link.source, localAdjacency.get(link.source) + 1);
        localAdjacency.set(link.target, localAdjacency.get(link.target) + 1);
      }
    });
    childIds.forEach((id) => {
      if ((localAdjacency.get(id) ?? 0) > 0) return;
      const others = childIds.filter((other) => other !== id);
      if (!others.length) return;
      const targetId = others[Math.floor(random() * others.length)];
      links.push({
        id: `link-${links.length}`,
        source: id,
        target: targetId,
        weight: Number((0.25 + random() * 0.4).toFixed(2)),
        kind: 'stabilizer',
      });
    });
  });

  const nodes = Array.from(nodesById.values());
  const typeCounts = initializeTypeCounts();
  const adjacency = buildAdjacency(nodes, links);
  nodes.forEach((node) => {
    node.connections = adjacency.get(node.id)?.size ?? 0;
    node.importance = Number((1 + Math.log(node.connections + 1) * 0.85).toFixed(2));
    if (typeCounts[node.type] === undefined) {
      typeCounts[node.type] = 0;
    }
    typeCounts[node.type] += 1;
  });

  return {
    nodes,
    links,
    stats: {
      nodeCount: nodes.length,
      linkCount: links.length,
      typeCounts,
      seed,
      rootCount: rootIds.length,
    },
  };
}

function spawnChildren({ parentId, parentPath, entries, depth, nodesById, random, cluster }) {
  const childIds = [];
  entries.forEach((entry, index) => {
    if (typeof entry === 'string') {
      const id = `${parentId}/${entry}`;
      const node = createFileNode({
        id,
        name: entry,
        parentId,
        depth,
        index,
        random,
        cluster,
        path: `${parentPath}/${entry}`,
      });
      nodesById.set(id, node);
      childIds.push(id);
    } else {
      const folderId = `${parentId}/${entry.name}`;
      const folderNode = createFolderNode({
        id: folderId,
        name: entry.name,
        parentId,
        depth,
        index,
        random,
        cluster,
        summary: `${entry.name} folder inside ${parentPath}.`,
      });
      nodesById.set(folderId, folderNode);
      const grandChildIds = spawnChildren({
        parentId: folderId,
        parentPath: `${parentPath}/${entry.name}`,
        entries: entry.children,
        depth: depth + 1,
        nodesById,
        random,
        cluster,
      });
      folderNode.childIds = grandChildIds;
      childIds.push(folderId);
    }
  });
  return childIds;
}

function createFolderNode({ id, name, parentId, depth, index, random, cluster, summary }) {
  const radius = 68 + random() * 48;
  const theta = random() * Math.PI * 2;
  const phi = Math.acos(2 * random() - 1);
  return {
    id,
    name,
    type: 'folder',
    cluster,
    depth,
    parentId,
    childIds: [],
    priority: Number((0.4 + random() * 0.6).toFixed(2)),
    signalStrength: Number((0.5 + random() * 0.5).toFixed(2)),
    summary: summary ?? `${name} folder.`,
    updatedAt: buildRelativeDate(index, depth),
    connections: 0,
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
  };
}

function createFileNode({ id, name, parentId, depth, index, random, cluster, path }) {
  const type = detectFileType(name);
  const radius = 52 + random() * 54;
  const theta = random() * Math.PI * 2;
  const phi = Math.acos(2 * random() - 1);
  return {
    id,
    name,
    type,
    cluster,
    depth,
    parentId,
    childIds: [],
    priority: Number((0.2 + random() * 0.8).toFixed(2)),
    signalStrength: Number((0.35 + random() * 0.65).toFixed(2)),
    summary: buildFileSummary(name, type, path),
    updatedAt: buildRelativeDate(index, depth),
    connections: 0,
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.sin(phi) * Math.sin(theta),
    z: radius * Math.cos(phi),
  };
}

function detectFileType(name) {
  // Special cases for files without a standard extension or dotfiles.
  const lower = name.toLowerCase();
  if (lower === 'dockerfile' || lower === 'makefile') return 'config';
  if (lower.startsWith('.env')) return 'config';
  if (lower.startsWith('.') && !lower.includes('.', 1)) return 'config';

  const dot = lower.lastIndexOf('.');
  if (dot < 0) return 'config';
  const ext = lower.slice(dot + 1);
  return FILE_TYPE_BY_EXTENSION[ext] ?? 'config';
}

function buildFileSummary(name, type, path) {
  const kind = fileKindLabel(type);
  return `${kind} file at ${path}.`;
}

function fileKindLabel(type) {
  switch (type) {
    case 'javascript':
      return 'JavaScript source';
    case 'typescript':
      return 'TypeScript source';
    case 'markdown':
      return 'Markdown document';
    case 'json':
      return 'JSON config';
    case 'css':
      return 'Stylesheet';
    case 'html':
      return 'HTML template';
    case 'python':
      return 'Python module';
    case 'image':
      return 'Image asset';
    case 'config':
      return 'Config';
    default:
      return 'File';
  }
}

function initializeTypeCounts() {
  return {
    folder: 0,
    javascript: 0,
    typescript: 0,
    markdown: 0,
    json: 0,
    css: 0,
    html: 0,
    python: 0,
    image: 0,
    config: 0,
  };
}

function buildAdjacency(nodes, links) {
  const adjacency = new Map(nodes.map((node) => [node.id, new Set()]));
  links.forEach((link) => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;
    adjacency.get(sourceId)?.add(targetId);
    adjacency.get(targetId)?.add(sourceId);
  });
  return adjacency;
}

function buildRelativeDate(index, depth) {
  const month = ((index + depth * 3) % 12) + 1;
  const day = ((index * 2 + depth * 5) % 27) + 1;
  return `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function createMulberry32(seed) {
  let state = seed >>> 0;

  return function next() {
    state += 0x6d2b79f5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
