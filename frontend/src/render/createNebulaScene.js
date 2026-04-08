import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const CATEGORY_COLORS = {
  person: '#00ccff',
  project: '#ff00aa',
  concept: '#9b5de5',
  document: '#ff00ff',
  default: '#d5d9ff',
};

const LINK_VISUALS = {
  semantic: { rgb: [255, 0, 170] },
  stabilizer: { rgb: [0, 204, 255] },
  default: { rgb: [155, 93, 229] },
};

const DEFAULT_SCENE_VISUALS = {
  bloomStrength: 1.2,
  bloomRadius: 0.6,
  bloomThreshold: 0.2,
  bloomOrbOpacity: 0.012,
  boundaryOpacity: 0.01,
  toneMappingExposure: 1.0,
};

const FOCUS_SCENE_VISUALS = {
  bloomStrength: 1.2,
  bloomRadius: 0.4,
  bloomThreshold: 0.3,
  bloomOrbOpacity: 0.007,
  boundaryOpacity: 0.012,
  toneMappingExposure: 1.0,
};

const RENDER_CONFIG = {
  sphereGeometryDetail: 0, // Performance: 0 = 12 verts, 1 = 42 verts. Huge savings for 500+ nodes.
  linkTubularResolution: 3, // Performance: 3 is the minimum for a solid tube
  bloomResolutionDivisor: 3, // Performance: reduces bloom pixel fill rate linearly
  d3AlphaDecay: 0.05,
  d3VelocityDecay: 0.4,
  chargeStrength: -130,
  linkDistance: 45,
  controlsDamping: 0.08,
  controlsMinDistance: 40,
  controlsMaxDistance: 1600,
  controlsRotateSpeed: 0.65,
  controlsZoomSpeed: 0.85,
  hoveredLinkColor: '#ffea00'
};

const geometryCache = new Map();
const ORIGIN = Object.freeze({ x: 0, y: 0, z: 0 });
const INITIAL_CAMERA = { x: 0, y: 28, z: 430 };

export function createNebulaScene({
  container,
  graphData,
  getSelectionState,
  onNodeHover,
  onNodeClick,
  onBackgroundClick,
}) {
  const graph = ForceGraph3D()(container)
    .graphData(graphData)
    .backgroundColor('rgba(0,0,0,0)')
    .showNavInfo(false)
    .enableNodeDrag(false)
    .nodeThreeObject((node) => createNodeMesh(node, getSelectionState))
    .linkColor((link) => getLinkColor(link))
    .linkOpacity((link) => getLinkVisuals(link.id, getSelectionState()).opacity)
    .linkVisibility((link) => getLinkVisuals(link.id, getSelectionState()).opacity > 0)
    .linkWidth((link) => {
      const state = getSelectionState();
      const isSelected = state.selectedNodeId && state.connectedLinkIds?.has(link.id);
      const isSecondDegree = !isSelected && state.selectedNodeId && state.secondDegreeLinkIds?.has(link.id);
      
      if (isSelected) return 0.55 + link.weight * 0.5;
      if (isSecondDegree) return 0.12 + link.weight * 0.16;
      return 0.1 + link.weight * 0.15;
    })
    .linkResolution(RENDER_CONFIG.linkTubularResolution)
    .linkDirectionalParticles(0)
    .d3AlphaDecay(RENDER_CONFIG.d3AlphaDecay)
    .d3VelocityDecay(RENDER_CONFIG.d3VelocityDecay)
    .onNodeHover((node) => onNodeHover(node))
    .onNodeClick((node) => onNodeClick(node))
    .onBackgroundClick(() => onBackgroundClick());

  graph.cameraPosition(INITIAL_CAMERA, ORIGIN, 0);

  graph.d3Force('charge').strength(RENDER_CONFIG.chargeStrength);
  graph.d3Force('link').distance(RENDER_CONFIG.linkDistance);

  const controls = graph.controls();
  controls.enableDamping = true;
  controls.dampingFactor = RENDER_CONFIG.controlsDamping;
  controls.enablePan = false;
  controls.minDistance = RENDER_CONFIG.controlsMinDistance;
  controls.maxDistance = RENDER_CONFIG.controlsMaxDistance;
  controls.rotateSpeed = RENDER_CONFIG.controlsRotateSpeed;
  controls.zoomSpeed = RENDER_CONFIG.controlsZoomSpeed;
  controls.target.set(ORIGIN.x, ORIGIN.y, ORIGIN.z);
  controls.update();

  const renderer = graph.renderer();
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = DEFAULT_SCENE_VISUALS.toneMappingExposure;
  graph.__nebulaRenderer = renderer;

  decorateScene(graph.scene());
  configureBloom(graph, container);
  resizeGraph(graph, container);
  window.setTimeout(() => syncVisualState(), 0);

  const handleResize = () => {
    resizeGraph(graph, container);
    updateBloom(graph, container);
  };

  window.addEventListener('resize', handleResize);

  let paused = false;

  return {
    setPaused(nextValue) {
      paused = nextValue;
      if (paused) {
        graph.pauseAnimation();
      } else {
        graph.resumeAnimation();
      }
    },
    refreshVisuals() {
      syncVisualState();

      if (paused) {
        graph.resumeAnimation();
        graph.refresh();
        graph.pauseAnimation();
        return;
      }

      graph.refresh();
    },
    resetCamera() {
      const wasPaused = paused;
      if (wasPaused) {
        graph.resumeAnimation();
      }

      controls.target.set(ORIGIN.x, ORIGIN.y, ORIGIN.z);
      controls.update();
      graph.cameraPosition(INITIAL_CAMERA, ORIGIN, 950);

      if (wasPaused) {
        window.setTimeout(() => graph.pauseAnimation(), 980);
      }
    },
    focusNode(node) {
      if (!node || typeof node.x !== 'number') {
        return;
      }

      const wasPaused = paused;
      if (wasPaused) {
        graph.resumeAnimation();
      }

      const distance = 160;
      const currentCameraDist = Math.hypot(node.x, node.y, node.z);
      const distRatio = 1 + distance / (currentCameraDist || 1);

      const targetPos = { x: node.x, y: node.y, z: node.z };
      const cameraPos = {
        x: node.x * distRatio,
        y: node.y * distRatio,
        z: node.z * distRatio,
      };

      controls.target.set(targetPos.x, targetPos.y, targetPos.z);
      controls.update();

      graph.cameraPosition(
        cameraPos,
        targetPos,
        900,
      );

      if (wasPaused) {
        window.setTimeout(() => graph.pauseAnimation(), 940);
      }
    },
    destroy() {
      window.removeEventListener('resize', handleResize);
    },
  };

  function syncVisualState() {
    const selectionState = getSelectionState();

    graphData.nodes.forEach((node) => {
      applyNodeVisualState(node.__threeObj, node, selectionState);
    });

    graphData.links.forEach((link) => {
      applyLinkVisualState(link.__lineObj, link, selectionState);
    });

    applySceneVisualState(graph, selectionState);
  }
}

function createNodeMesh(node, selectionState) {
  const selectionStateData = selectionState();
  const radius = 1.7 + Math.log(node.connections + 1) * 0.85;
  const baseColor = new THREE.Color(CATEGORY_COLORS[node.type] ?? CATEGORY_COLORS.default);
  const group = new THREE.Group();
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: baseColor.clone(),
    emissive: baseColor.clone(),
    emissiveIntensity: 0.026,
    metalness: 0.12,
    roughness: 0.22,
    transparent: true,
    opacity: 0.96,
  });
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: baseColor.clone(),
    transparent: true,
    opacity: 0.011,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: '#f4f8ff',
    transparent: true,
    opacity: 0.045,
    wireframe: true,
    depthWrite: false,
  });

  const core = new THREE.Mesh(
    getSphereGeometry(radius),
    coreMaterial,
  );

  group.add(core);
  const halo = new THREE.Mesh(
    getSphereGeometry(radius * 1.72),
    haloMaterial,
  );

  group.add(halo);
  const ring = new THREE.Mesh(getSphereGeometry(radius * 2.18), ringMaterial);
  ring.visible = false;
  group.add(ring);

  group.userData = {
    baseColor,
    coreMaterial,
    haloMaterial,
    halo,
    ring,
  };
  applyNodeVisualState(group, node, selectionStateData);

  return group;
}

function getSphereGeometry(radius) {
  const key = radius.toFixed(1);
  if (!geometryCache.has(key)) {
    geometryCache.set(key, new THREE.IcosahedronGeometry(radius, RENDER_CONFIG.sphereGeometryDetail));
  }

  return geometryCache.get(key);
}

function getLinkColor(link) {
  const palette = LINK_VISUALS[link.kind] ?? LINK_VISUALS.default;
  return `rgb(${palette.rgb.join(', ')})`;
}

function getNodeVisuals(nodeId, state, isHovered) {
  const isSelected = nodeId === state.selectedNodeId;
  const isConnected = state.connectedNodeIds?.has(nodeId);
  const isSecondDegree = !isSelected && !isConnected && state.secondDegreeNodeIds?.has(nodeId);
  const hasSelection = !!state.selectedNodeId;

  const isHoveredConnected = state.hoveredConnectedNodeIds?.has(nodeId);

  if (isHovered) {
    return { bright: 1.5, bloom: 2.5, opacity: 1.0, halo: 0.05, scale: 2.0, overrideColor: true };
  }
  if (isHoveredConnected) {
    return { bright: 1.2, bloom: 1.0, opacity: 1.0, halo: 0.02, scale: 1.8, overrideColor: true };
  }

  if (isSelected) {
    return { bright: 1.04, bloom: 1.0, opacity: 1.0, halo: 0.016, scale: 1.95 };
  }
  if (hasSelection && isConnected) {
    return { bright: 0.9, bloom: 0.6, opacity: 0.96, halo: 0.011, scale: 1.62 };
  }
  if (hasSelection && isSecondDegree) {
    return { bright: 0.8, bloom: 0.0, opacity: 0.75, halo: 0.0, scale: 1.62 };
  }
  if (hasSelection) {
    return { bright: 0.45, bloom: 0.1, opacity: 0.2, halo: 0.0024, scale: 1.62 };
  }
  
  if (state.hoveredNodeId) {
    return { bright: 0.45, bloom: 0.1, opacity: 0.3, halo: 0.005, scale: 1.62 };
  }

  return { 
    bright: 1.0, 
    bloom: 0.4, 
    opacity: 0.96, 
    halo: 0.012, 
    scale: 1.62 
  };
}

function getLinkVisuals(linkId, state) {
  const isSelected = state.selectedNodeId && state.connectedLinkIds?.has(linkId);
  const isSecondDegree = !isSelected && state.selectedNodeId && state.secondDegreeLinkIds?.has(linkId);
  const isHovered = state.hoveredNodeId && state.hoveredConnectedLinkIds?.has(linkId);

  if (isHovered) return { opacity: 1.0, glow: 5.0, boost: 4.0, isHoveredLink: true };
  if (isSelected) return { opacity: 1.0, glow: 3.5, boost: 2.5, isHoveredLink: false };
  if (isSecondDegree) return { opacity: 0.5, glow: 0.0, boost: 1.0, isHoveredLink: false };
  
  // Completely hide links that are not connected to the selected/hovered node
  return { opacity: 0.0, glow: 0.0, boost: 1.0, isHoveredLink: false };
}

function decorateScene(scene) {
  scene.add(new THREE.AmbientLight('#89a7ff', 0.68));

  const keyLight = new THREE.DirectionalLight('#d7f7ff', 0.58);
  keyLight.position.set(48, 72, 120);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight('#4fd3ff', 1.02, 420, 1.8);
  rimLight.position.set(-80, 32, -100);
  scene.add(rimLight);

  scene.add(createStarField());
}

function createStarField() {
  const starCount = 300;
  const positions = new Float32Array(starCount * 3);

  for (let index = 0; index < starCount; index += 1) {
    const radius = 180 + Math.random() * 170;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const offset = index * 3;

    positions[offset] = radius * Math.sin(phi) * Math.cos(theta);
    positions[offset + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[offset + 2] = radius * Math.cos(phi);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: '#8bc9ff',
      size: 1.1,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    }),
  );
}

function configureBloom(graph, container) {
  if (typeof graph.postProcessingComposer !== 'function') {
    return;
  }

  const composer = graph.postProcessingComposer();
  const renderWidth = Math.max(1, Math.floor((container.clientWidth || window.innerWidth) / RENDER_CONFIG.bloomResolutionDivisor));
  const renderHeight = Math.max(1, Math.floor((container.clientHeight || window.innerHeight) / RENDER_CONFIG.bloomResolutionDivisor));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(renderWidth, renderHeight),
    DEFAULT_SCENE_VISUALS.bloomStrength,
    DEFAULT_SCENE_VISUALS.bloomRadius,
    DEFAULT_SCENE_VISUALS.bloomThreshold,
  );

  composer.addPass(bloomPass);
  graph.__nebulaBloomPass = bloomPass;
}

function updateBloom(graph, container) {
  const bloomPass = graph.__nebulaBloomPass;
  if (!bloomPass) {
    return;
  }

  const renderWidth = Math.max(1, Math.floor((container.clientWidth || window.innerWidth) / RENDER_CONFIG.bloomResolutionDivisor));
  const renderHeight = Math.max(1, Math.floor((container.clientHeight || window.innerHeight) / RENDER_CONFIG.bloomResolutionDivisor));
  bloomPass.setSize(renderWidth, renderHeight);
}

function resizeGraph(graph, container) {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  graph.width(width);
  graph.height(height);
}

function applyNodeVisualState(object, node, selectionState) {
  if (!object?.userData?.coreMaterial || !object.userData.baseColor) return;

  const isHovered = node.id === selectionState.hoveredNodeId;
  const visuals = getNodeVisuals(node.id, selectionState, isHovered);
  const { coreMaterial, haloMaterial, ring, halo, baseColor } = object.userData;

  const renderColor = visuals.overrideColor ? new THREE.Color(RENDER_CONFIG.hoveredLinkColor) : baseColor;

  coreMaterial.color.copy(new THREE.Color('#ffffff'));
  coreMaterial.emissive.copy(renderColor).multiplyScalar(visuals.bright * 0.8);
  coreMaterial.emissiveIntensity = visuals.bloom;
  coreMaterial.opacity = visuals.opacity;
  coreMaterial.needsUpdate = true;

  halo.scale.setScalar(visuals.scale);
  haloMaterial.color.copy(renderColor).multiplyScalar(Math.max(visuals.bright, visuals.scale > 1.8 ? 0.8 : 0.56));
  haloMaterial.opacity = visuals.halo;
  haloMaterial.needsUpdate = true;

  ring.visible = visuals.scale > 1.8;
}

function applyLinkVisualState(object, link, selectionState) {
  if (!object) return;

  const visuals = getLinkVisuals(link.id, selectionState);
  const rgb = LINK_VISUALS[link.kind]?.rgb ?? LINK_VISUALS.default.rgb;
  let baseColor = new THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);

  if (visuals.isHoveredLink) {
    baseColor = new THREE.Color(RENDER_CONFIG.hoveredLinkColor);
  }

  object.visible = visuals.opacity > 0; // Remove from render tree if invisible (Massive GPU optimization)

  if (!object.visible) {
    return; // Fast path: skip material updates if it's not even visible
  }

  updateObjectMaterials(object, (material) => {
    if (material.color) {
      material.color.copy(baseColor).multiplyScalar(visuals.boost);
    }
    if (material.emissive !== undefined) {
      material.emissive.copy(baseColor);
      material.emissiveIntensity = visuals.glow;
    }
    material.transparent = true;
    material.opacity = visuals.opacity;
    material.depthWrite = false;
    material.needsUpdate = true;
  });
}

function updateObjectMaterials(object, applyMaterial) {
  if (object.material) {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach(applyMaterial);
  }

  if (Array.isArray(object.children)) {
    object.children.forEach((child) => updateObjectMaterials(child, applyMaterial));
  }
}

// Helper functions refactored to getNodeVisuals and getLinkVisuals

function applySceneVisualState(graph, selectionState) {
  const sceneVisuals = selectionState.selectedNodeId ? FOCUS_SCENE_VISUALS : DEFAULT_SCENE_VISUALS;
  const bloomPass = graph.__nebulaBloomPass;
  const renderer = graph.__nebulaRenderer;

  if (bloomPass) {
    bloomPass.strength = sceneVisuals.bloomStrength;
    bloomPass.radius = sceneVisuals.bloomRadius;
    bloomPass.threshold = sceneVisuals.bloomThreshold;
  }

  if (renderer) {
    renderer.toneMappingExposure = sceneVisuals.toneMappingExposure;
  }
}
