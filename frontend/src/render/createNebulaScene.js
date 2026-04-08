import ForceGraph3D from '3d-force-graph';
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const CATEGORY_COLORS = {
  person: '#52c7ff',
  project: '#9df07c',
  concept: '#ffb661',
  document: '#ff7f95',
  default: '#d5d9ff',
};

const LINK_VISUALS = {
  semantic: { rgb: [98, 183, 255] },
  stabilizer: { rgb: [237, 227, 120] },
  default: { rgb: [163, 170, 255] },
};

const DEFAULT_SCENE_VISUALS = {
  bloomStrength: 0.78,
  bloomRadius: 0.48,
  bloomThreshold: 0.42,
  bloomOrbOpacity: 0.032,
  boundaryOpacity: 0.042,
  toneMappingExposure: 0.84,
};

const FOCUS_SCENE_VISUALS = {
  bloomStrength: 0.14,
  bloomRadius: 0.22,
  bloomThreshold: 0.68,
  bloomOrbOpacity: 0.007,
  boundaryOpacity: 0.012,
  toneMappingExposure: 0.64,
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
    .linkOpacity((link) => getLinkOpacity(link, getSelectionState))
    .linkWidth((link) => 0.2 + link.weight * 1.1)
    .linkDirectionalParticles(0)
    .d3AlphaDecay(0.026)
    .d3VelocityDecay(0.28)
    .onNodeHover((node) => onNodeHover(node))
    .onNodeClick((node) => onNodeClick(node))
    .onBackgroundClick(() => onBackgroundClick());

  graph.cameraPosition(INITIAL_CAMERA, ORIGIN, 0);

  const controls = graph.controls();
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 130;
  controls.maxDistance = 620;
  controls.rotateSpeed = 0.65;
  controls.zoomSpeed = 0.85;
  controls.target.set(ORIGIN.x, ORIGIN.y, ORIGIN.z);
  controls.update();

  const renderer = graph.renderer();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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

      const distance = Math.max(230, 190 + Math.log(node.connections + 2) * 34);
      const direction = new THREE.Vector3(node.x, node.y, node.z);
      if (direction.lengthSq() === 0) {
        direction.set(0, 0, 1);
      }

      direction.normalize();
      controls.target.set(ORIGIN.x, ORIGIN.y, ORIGIN.z);
      controls.update();
      graph.cameraPosition(
        {
          x: direction.x * distance,
          y: direction.y * distance,
          z: direction.z * distance,
        },
        ORIGIN,
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
    geometryCache.set(key, new THREE.IcosahedronGeometry(radius, 2));
  }

  return geometryCache.get(key);
}

function getLinkColor(link) {
  const palette = LINK_VISUALS[link.kind] ?? LINK_VISUALS.default;
  return `rgb(${palette.rgb.join(', ')})`;
}

function getLinkOpacity(link, selectionState) {
  const state = selectionState();

  if (!state.selectedNodeId) {
    return 0.5;
  }

  if (state.connectedLinkIds?.has(link.id)) {
    return 0.5;
  }

  return 0.1;
}

function getNodeBrightnessFactor(nodeId, selectionState) {
  if (!selectionState.selectedNodeId) {
    return 1;
  }

  if (nodeId === selectionState.selectedNodeId) {
    return 1.04;
  }

  if (selectionState.connectedNodeIds?.has(nodeId)) {
    return 0.9;
  }

  return 0.45;
}

function getNodeOpacity(nodeId, selectionState) {
  if (!selectionState.selectedNodeId) {
    return nodeId === selectionState.hoveredNodeId ? 1 : 0.96;
  }

  if (nodeId === selectionState.selectedNodeId) {
    return 1;
  }

  if (selectionState.connectedNodeIds?.has(nodeId)) {
    return 0.96;
  }

  return 0.2;
}

function decorateScene(scene) {
  scene.add(new THREE.AmbientLight('#89a7ff', 0.68));

  const keyLight = new THREE.DirectionalLight('#d7f7ff', 0.58);
  keyLight.position.set(48, 72, 120);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight('#4fd3ff', 1.02, 420, 1.8);
  rimLight.position.set(-80, 32, -100);
  scene.add(rimLight);

  const bloomOrb = new THREE.Mesh(
    new THREE.SphereGeometry(132, 42, 42),
    new THREE.MeshBasicMaterial({
      color: '#2a4478',
      transparent: true,
      opacity: DEFAULT_SCENE_VISUALS.bloomOrbOpacity,
      side: THREE.BackSide,
    }),
  );
  bloomOrb.userData.role = 'bloom-orb';
  scene.add(bloomOrb);

  const boundarySphere = new THREE.Mesh(
    new THREE.SphereGeometry(128, 32, 32),
    new THREE.MeshBasicMaterial({
      color: '#6cc7ff',
      transparent: true,
      opacity: DEFAULT_SCENE_VISUALS.boundaryOpacity,
      wireframe: true,
    }),
  );
  boundarySphere.userData.role = 'boundary-sphere';
  scene.add(boundarySphere);

  scene.add(createStarField());
}

function createStarField() {
  const starCount = 900;
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
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.clientWidth || 1, container.clientHeight || 1),
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

  bloomPass.setSize(container.clientWidth || 1, container.clientHeight || 1);
}

function resizeGraph(graph, container) {
  const width = container.clientWidth || window.innerWidth;
  const height = container.clientHeight || window.innerHeight;

  graph.width(width);
  graph.height(height);
}

function applyNodeVisualState(object, node, selectionState) {
  if (!object?.userData?.coreMaterial || !object.userData.baseColor) {
    return;
  }

  const isSelected = node.id === selectionState.selectedNodeId;
  const isHovered = node.id === selectionState.hoveredNodeId;
  const brightnessFactor = getNodeBrightnessFactor(node.id, selectionState);
  const haloScale = isSelected ? 1.95 : isHovered ? 1.78 : 1.62;
  const coreMaterial = object.userData.coreMaterial;
  const haloMaterial = object.userData.haloMaterial;
  const ring = object.userData.ring;
  const halo = object.userData.halo;
  const baseColor = object.userData.baseColor;

  coreMaterial.color.copy(baseColor).multiplyScalar(brightnessFactor);
  coreMaterial.emissive.copy(baseColor).multiplyScalar(brightnessFactor * 0.6);
  coreMaterial.emissiveIntensity = getNodeEmissiveIntensity(node.id, selectionState, isHovered);
  coreMaterial.opacity = getNodeOpacity(node.id, selectionState);
  coreMaterial.needsUpdate = true;

  halo.scale.setScalar(haloScale);
  haloMaterial.color.copy(baseColor).multiplyScalar(Math.max(brightnessFactor, isSelected ? 0.8 : 0.56));
  haloMaterial.opacity = getNodeHaloOpacity(node.id, selectionState, isHovered);
  haloMaterial.needsUpdate = true;

  ring.visible = isSelected;
}

function applyLinkVisualState(object, link, selectionState) {
  if (!object) {
    return;
  }

  const palette = LINK_VISUALS[link.kind] ?? LINK_VISUALS.default;
  const opacity = getLinkOpacity(link, () => selectionState);
  const color = new THREE.Color(
    palette.rgb[0] / 255,
    palette.rgb[1] / 255,
    palette.rgb[2] / 255,
  );

  updateObjectMaterials(object, (material) => {
    if (material.color) {
      material.color.copy(color);
    }

    material.transparent = true;
    material.opacity = opacity;
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

function getNodeHaloOpacity(nodeId, selectionState, isHovered) {
  if (!selectionState.selectedNodeId) {
    return isHovered ? 0.02 : 0.012;
  }

  if (nodeId === selectionState.selectedNodeId) {
    return 0.016;
  }

  if (selectionState.connectedNodeIds?.has(nodeId)) {
    return 0.011;
  }

  return 0.0024;
}

function getNodeEmissiveIntensity(nodeId, selectionState, isHovered) {
  if (!selectionState.selectedNodeId) {
    return isHovered ? 0.034 : 0.026;
  }

  if (nodeId === selectionState.selectedNodeId) {
    return 0.024;
  }

  if (selectionState.connectedNodeIds?.has(nodeId)) {
    return 0.018;
  }

  return 0.008;
}

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

  graph.scene().traverse((object) => {
    if (object.userData?.role === 'bloom-orb' && object.material) {
      object.material.opacity = sceneVisuals.bloomOrbOpacity;
      object.material.needsUpdate = true;
    }

    if (object.userData?.role === 'boundary-sphere' && object.material) {
      object.material.opacity = sceneVisuals.boundaryOpacity;
      object.material.needsUpdate = true;
    }
  });
}
