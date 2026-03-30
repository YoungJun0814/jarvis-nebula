# Jarvis Nebula — Project Plan

> A 3D Multimodal Knowledge Graph navigated by hand gestures, body pose, and voice commands.

---

## Table of Contents

1. [Vision & Core Principles](#1-vision--core-principles)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Module Breakdown](#4-module-breakdown)
   - 4.1 [Rendering Engine](#41-rendering-engine)
   - 4.2 [Hand Tracking & Gesture System](#42-hand-tracking--gesture-system)
   - 4.3 [Body Pose & Distance Sensing](#43-body-pose--distance-sensing)
   - 4.4 [Hand Overlay (Visual Feedback)](#44-hand-overlay-visual-feedback)
   - 4.5 [Voice Command Pipeline](#45-voice-command-pipeline)
   - 4.6 [Graph Database & Query Layer](#46-graph-database--query-layer)
   - 4.7 [Interaction Priority System](#47-interaction-priority-system)
5. [Gesture Specification](#5-gesture-specification)
6. [Data Flow](#6-data-flow)
7. [Open Source vs Custom Development](#7-open-source-vs-custom-development)
8. [Development Phases](#8-development-phases)
9. [Risk Matrix & Mitigations](#9-risk-matrix--mitigations)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. Vision & Core Principles

### What This Is

A spatial interface where data exists as glowing nodes floating inside a 3D sphere. Nodes are connected by edges that represent relationships. The user navigates this "data nebula" using their hands and voice — no keyboard, no mouse.

### Core Principles

1. **Spatial Cognition** — Distance encodes meaning. Closely related nodes cluster together; isolated nodes drift to the edges. The user "feels" the data structure by looking at it.
2. **Natural User Interface (NUI)** — Hands are for navigation (rotate, zoom, select, drag). Voice is for intelligence (filter, query, analyze). Body posture modulates sensitivity.
3. **Immediate Feedback** — Every input must produce visible feedback within 1 frame (~16ms). A transparent hand overlay on screen confirms tracking status. Gesture state labels confirm recognition.
4. **Graceful Degradation** — If hand tracking is lost, fall back to mouse. If voice fails, show a text input. The system never becomes unusable.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        WEBCAM (shared)                          │
│  Single video stream, distributed to all MediaPipe models       │
└──────┬──────────────┬──────────────┬────────────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌─────────────┐ ┌──────────┐ ┌─────────────┐   ┌───────────────┐
│  MediaPipe  │ │ MediaPipe│ │  Microphone  │   │   Mouse /     │
│   Hands     │ │   Pose   │ │  + Whisper   │   │   Keyboard    │
│ (21 joints) │ │(33 joints)│ │  (STT)      │   │  (fallback)   │
└──────┬──────┘ └────┬─────┘ └──────┬───────┘   └──────┬────────┘
       │             │              │                   │
       ▼             ▼              ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INPUT PROCESSING LAYER                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Gesture    │  │   Distance   │  │  Command Interpreter │   │
│  │  Classifier  │  │  Calculator  │  │  (LLM → Cypher)      │   │
│  │              │  │ (chest dist) │  │                      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                     │               │
│         ▼                 ▼                     ▼               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              INTERACTION PRIORITY RESOLVER               │    │
│  │  Voice > Hand Gesture > Mouse (fallback)                │    │
│  │  Body distance modulates gesture sensitivity            │    │
│  └──────────────────────────┬──────────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Camera     │  │  Selection   │  │    Graph Filter      │   │
│  │  Controller  │  │   Manager    │  │    (Neo4j query      │   │
│  │ (rotate/zoom)│  │ (highlight,  │  │     results →        │   │
│  │              │  │  drag, info) │  │     visibility)      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                     │               │
│         ▼                 ▼                     ▼               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   3D RENDERING ENGINE                    │    │
│  │  Three.js + 3d-force-graph + Post-processing            │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │                                   │
│  ┌──────────────────────────▼──────────────────────────────┐    │
│  │                  HAND OVERLAY (Canvas 2D)                │    │
│  │  Transparent hand skeleton + laser pointer + state label │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     Neo4j (Graph DB)                      │   │
│  │  Nodes: (:Entity {name, type, metadata, embedding})      │   │
│  │  Edges: [:RELATES_TO {weight, type}]                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

| Layer | Technology | Role | License |
|-------|-----------|------|---------|
| **3D Rendering** | Three.js | WebGL scene, camera, lighting, meshes | MIT |
| **Graph Physics** | 3d-force-graph | Force-directed layout, node/edge rendering | MIT |
| **Post-processing** | three/postprocessing | Bloom, glow effects (nebula aesthetic) | MIT |
| **Animation** | GSAP or tween.js | Smooth camera transitions, node animations | GSAP: free for non-commercial / tween.js: MIT |
| **Hand Tracking** | MediaPipe Hands | 21 hand joint 3D coordinates per hand | Apache 2.0 |
| **Body Pose** | MediaPipe Pose | 33 body landmarks (chest distance calc) | Apache 2.0 |
| **Voice-to-Text** | OpenAI Whisper API | Speech recognition for commands | API (paid) |
| **LLM** | GPT-4o API or Ollama (local) | Natural language → Cypher translation | API (paid) / Ollama: MIT |
| **Graph Database** | Neo4j Community | Node/edge storage, Cypher queries | GPL v3 (Community) |
| **Frontend** | Vanilla JS or React | UI shell, event bus, state management | MIT |
| **Build Tool** | Vite | Fast dev server, HMR, bundling | MIT |

---

## 4. Module Breakdown

### 4.1 Rendering Engine

**Purpose:** Display the data nebula — nodes as spheres, edges as lines, all inside a spherical boundary.

**Open-source handles:**
- Scene setup, camera, renderer (Three.js)
- Force-directed node positioning (3d-force-graph)
- Bloom/glow post-processing

**Custom development:**
- Node appearance logic: size = `log(connectionCount + 1)`, color = category mapping
- Edge appearance logic: opacity = `weight / maxWeight`, dashed if weak
- Spherical boundary enforcement: clamp node positions to `r <= R_MAX`
- LOD (Level of Detail): nodes beyond camera distance threshold render as simple points
- Performance budget: maintain 60fps with up to 5,000 nodes

**Key configuration:**

```javascript
// Node sizing
const nodeSize = (node) => 2 + Math.log(node.connections + 1) * 3;

// Category color map
const categoryColors = {
  person: '#4FC3F7',
  project: '#81C784',
  concept: '#FFB74D',
  document: '#E57373',
  default: '#B0BEC5'
};

// Force-graph config
forceGraph
  .nodeVal(node => node.connections)
  .nodeColor(node => categoryColors[node.type] || categoryColors.default)
  .linkOpacity(link => link.weight / maxWeight)
  .d3AlphaDecay(0.02)     // slower decay = smoother settling
  .d3VelocityDecay(0.3);  // friction
```

**Spherical coordinate conversion (for initial placement):**

```
x = r · sin(φ) · cos(θ)
y = r · sin(φ) · sin(θ)
z = r · cos(φ)

where:
  r = distance from center (mapped from node importance)
  θ = azimuthal angle (0 to 2π)
  φ = polar angle (0 to π)
```

After initial placement, the force-directed algorithm takes over and repositions nodes organically.

---

### 4.2 Hand Tracking & Gesture System

**Purpose:** Track hands via webcam and classify gestures into discrete actions.

**Open-source handles:**
- Hand detection and 21-landmark extraction (MediaPipe Hands)
- Runs entirely in the browser via WebAssembly/WebGL

**Custom development — Gesture Classifier:**

MediaPipe only outputs raw coordinates. We must build the classifier that interprets them.

#### Landmark Reference

```
        8 (INDEX_TIP)
        |
        7
        |
        6
        |
        5 ── 9 ── 13 ── 17
       /    |      |      |
      /    10     14     18
     /      |      |      |
    /      11     15     19
   /        |      |      |
  0 ────── 1      16     20
  (WRIST)  (THUMB  |
            CMC)   12
                (MIDDLE_TIP)
```

#### Gesture Definitions

Each gesture is defined by finger state detection:

```javascript
// Finger extension detection
function isFingerExtended(landmarks, finger) {
  // Compare fingertip y-position to PIP joint y-position
  // For thumb: compare x-position (different axis)
  const tip = landmarks[fingerTips[finger]];
  const pip = landmarks[fingerPIPs[finger]];

  if (finger === 'thumb') {
    return Math.abs(tip.x - landmarks[0].x) > Math.abs(pip.x - landmarks[0].x);
  }
  return tip.y < pip.y; // In screen coords, y increases downward
}
```

| Gesture | Detection Logic | Action |
|---------|----------------|--------|
| **Open Palm** | All 5 fingers extended | Rotation mode — hand (x,y) delta maps to camera orbit |
| **Point (Index)** | Only index extended, rest curled | Selection mode — index tip → raycast into 3D scene |
| **Fist** | All fingers curled | Drag mode — move selected node or "grab" the scene |
| **Pinch (single hand)** | Thumb tip distance to index tip < threshold | Confirm/click action |
| **Pinch Zoom (two hands)** | Both hands detected, track inter-hand distance | Zoom — distance increase = zoom in, decrease = zoom out |
| **Swipe** | Open palm velocity.x > threshold | Dismiss/filter — push away unrelated nodes |

#### Smoothing & Debouncing

Raw MediaPipe output jitters frame-to-frame. Apply:

```javascript
// Exponential Moving Average (EMA) for position smoothing
const SMOOTHING = 0.7; // 0 = no smoothing, 1 = frozen
smoothed.x = SMOOTHING * smoothed.x + (1 - SMOOTHING) * raw.x;
smoothed.y = SMOOTHING * smoothed.y + (1 - SMOOTHING) * raw.y;
smoothed.z = SMOOTHING * smoothed.z + (1 - SMOOTHING) * raw.z;
```

```javascript
// Gesture state machine — prevents flickering
const GESTURE_HOLD_FRAMES = 5; // Must hold gesture for 5 frames to activate
const GESTURE_RELEASE_FRAMES = 8; // Must release for 8 frames to deactivate

// States: IDLE → PENDING → ACTIVE → RELEASING → IDLE
```

#### Confidence Filtering

```javascript
// Discard frames where MediaPipe is not confident
if (hand.score < 0.75) {
  return; // Skip this frame, keep last known state
}
```

---

### 4.3 Body Pose & Distance Sensing

**Purpose:** Use chest (pit of stomach) as an anchor point. The distance from chest to hand modulates gesture sensitivity.

**Open-source handles:**
- 33 upper-body landmarks (MediaPipe Pose)
- Runs alongside MediaPipe Hands sharing the same webcam feed

**Custom development — Distance Calculator:**

#### Chest Anchor Estimation

```javascript
// MediaPipe Pose landmarks
const LEFT_SHOULDER = 11;
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

function getChestAnchor(poseLandmarks) {
  const shoulderCenter = midpoint(
    poseLandmarks[LEFT_SHOULDER],
    poseLandmarks[RIGHT_SHOULDER]
  );
  const hipCenter = midpoint(
    poseLandmarks[LEFT_HIP],
    poseLandmarks[RIGHT_HIP]
  );
  // Chest ≈ 30% down from shoulders toward hips
  return lerp(shoulderCenter, hipCenter, 0.3);
}
```

#### Distance-to-Sensitivity Mapping

```javascript
function getSensitivityScale(handPosition, chestAnchor, shoulderWidth) {
  const distance = euclideanDistance(handPosition, chestAnchor);
  const normalizedDist = distance / shoulderWidth; // Normalize by body size

  // Three zones
  if (normalizedDist < 0.5) {
    return 0.3;  // CLOSE — precision mode (slow, fine control)
  } else if (normalizedDist < 1.2) {
    return 1.0;  // NORMAL — standard sensitivity
  } else {
    return 2.5;  // FAR — fast mode (large, sweeping movements)
  }
}
```

#### Idle Detection

```javascript
// Both hands close to chest + stationary for 2 seconds = IDLE
// → Ignore all gesture input (user is just resting, not commanding)
if (bothHandsNearChest && handVelocity < IDLE_THRESHOLD && idleDuration > 2000) {
  gestureState = 'IDLE';
}
```

#### Performance Note

MediaPipe Pose (Lite model) adds ~5-8ms per frame on a GPU-equipped laptop. Combined with MediaPipe Hands, total processing should stay under 25ms per frame (40fps minimum). If performance drops below 30fps, disable Pose and fall back to hand-only tracking with fixed sensitivity.

---

### 4.4 Hand Overlay (Visual Feedback)

**Purpose:** Show a transparent hand skeleton on screen so the user knows exactly where their hand is being tracked, what gesture is recognized, and where they're pointing.

**Open-source handles:**
- Nothing — this is entirely custom.

**Custom development:**

#### Layer Architecture

```
┌─────────────────────────────┐
│     Canvas 2D (overlay)     │  ← z-index: 10, pointer-events: none
│  - Hand skeleton lines      │
│  - Joint dots               │
│  - Laser pointer ray        │
│  - Gesture state label      │
├─────────────────────────────┤
│     WebGL Canvas (3D scene) │  ← z-index: 0
│  - Nodes, edges, effects    │
└─────────────────────────────┘
```

#### What to Draw

1. **Hand Skeleton**
   - Connect the 21 landmarks with semi-transparent lines
   - Color: white at 40% opacity (default), shifts to cyan when gesture is ACTIVE
   - Line width: 2px

2. **Joint Dots**
   - Small circles at each landmark
   - Fingertip dots slightly larger (4px vs 2px)
   - Color: matches gesture state

3. **Laser Pointer (in Point gesture)**
   - A line from index fingertip extending toward the 3D scene
   - Rendered in 3D space (Three.js `Line`) not the overlay
   - Fades from bright cyan to transparent over distance
   - When the ray intersects a node: node glows, laser dot appears on it

4. **Gesture State Label**
   - Small text near the wrist: "ROTATE", "SELECT", "DRAG", "ZOOM", "IDLE"
   - Fades in/out with 200ms transition
   - Only shown when gesture is ACTIVE (not during PENDING)

5. **Confidence Indicator**
   - Overall hand opacity = MediaPipe confidence score
   - confidence 1.0 = fully visible, confidence 0.75 = ghostly
   - Below 0.7 = hand disappears (not tracked)

#### Color Scheme by Gesture State

| State | Skeleton Color | Label |
|-------|---------------|-------|
| IDLE | white @ 30% | — |
| ROTATE | cyan @ 50% | "ROTATE" |
| SELECT | yellow @ 60% | "SELECT" |
| DRAG | red @ 60% | "DRAG" |
| ZOOM | green @ 50% | "ZOOM" |
| SWIPE | orange @ 50% | "SWIPE" |

---

### 4.5 Voice Command Pipeline

**Purpose:** Allow the user to speak natural language commands that get translated into graph queries or UI actions.

**Open-source handles:**
- Speech-to-text (Whisper API)
- Natural language understanding (GPT-4o or Ollama)
- Cypher query execution (Neo4j driver)

**Custom development:**

#### Activation Method

- **Push-to-Talk:** User makes a specific gesture (e.g., pinch with left hand) to start recording
- OR **Wake Word:** "Hey Nebula" (lightweight local keyword detection via `Porcupine` or similar)
- Visual feedback: microphone icon pulses on screen while recording

#### Command Classification

Before sending to LLM, classify the command type to optimize routing:

```javascript
const UI_COMMANDS = {
  'reset': () => camera.resetPosition(),
  'zoom out': () => camera.zoomTo(DEFAULT_FOV),
  'zoom in': () => camera.zoomTo(CLOSE_FOV),
  'show all': () => graph.showAllNodes(),
  'undo': () => stateManager.undo(),
  'help': () => ui.showHelpOverlay()
};

function routeCommand(transcript) {
  // 1. Check for exact UI commands first (no LLM needed)
  const normalized = transcript.toLowerCase().trim();
  for (const [keyword, action] of Object.entries(UI_COMMANDS)) {
    if (normalized.includes(keyword)) {
      return action();
    }
  }

  // 2. Otherwise, send to LLM for Cypher generation
  return generateCypherQuery(transcript);
}
```

#### LLM → Cypher Pipeline

```javascript
async function generateCypherQuery(userQuery) {
  const systemPrompt = `
    You are a Neo4j Cypher query generator.

    SCHEMA:
    (:Entity {name: string, type: string, metadata: object})
    -[:RELATES_TO {weight: float, type: string}]->

    RULES:
    - Only generate READ queries (MATCH, RETURN, ORDER BY, LIMIT)
    - NEVER generate DELETE, DETACH, CREATE, SET, MERGE, or REMOVE
    - Return node IDs and names so the frontend can highlight them
    - If the user asks for "connections" or "links", traverse relationships
    - If the user asks for "path", use shortestPath()

    EXAMPLES:
    User: "Show me everything connected to Project Alpha"
    Cypher: MATCH (n:Entity {name: 'Project Alpha'})-[r:RELATES_TO]-(m) RETURN n, r, m

    User: "Find the shortest path between Alice and Server-01"
    Cypher: MATCH p = shortestPath(
      (a:Entity {name: 'Alice'})-[:RELATES_TO*]-(b:Entity {name: 'Server-01'})
    ) RETURN p

    User: "What are the top 5 most connected nodes?"
    Cypher: MATCH (n:Entity)-[r:RELATES_TO]-() RETURN n.name, count(r) AS connections ORDER BY connections DESC LIMIT 5
  `;

  const response = await llm.chat(systemPrompt, userQuery);
  const cypher = extractCypherFromResponse(response);

  // Validate: reject any write operations
  if (/\b(DELETE|DETACH|CREATE|SET|MERGE|REMOVE)\b/i.test(cypher)) {
    throw new Error('Write operations are not allowed');
  }

  return cypher;
}
```

#### Query Result → Visual Mapping

| Query Type | Visual Effect |
|-----------|---------------|
| Filter ("show only X") | Matching nodes glow bright, others fade to 10% opacity |
| Path ("shortest path A→B") | Path nodes and edges highlighted in yellow, others dim |
| Aggregation ("top 5 connected") | Top nodes enlarge + pulse animation |
| Reset ("show all") | All nodes restore to default appearance with smooth transition |

---

### 4.6 Graph Database & Query Layer

**Purpose:** Store nodes and relationships persistently. Serve as the single source of truth for graph structure.

**Open-source handles:**
- Storage, indexing, Cypher execution (Neo4j)
- JavaScript driver (`neo4j-driver`)

**Custom development:**

#### Schema Design

```cypher
// Node types
CREATE CONSTRAINT entity_name IF NOT EXISTS
FOR (e:Entity) REQUIRE e.name IS UNIQUE;

// Core node properties
// (:Entity {
//   name: string,          — unique identifier
//   type: string,          — category (person, project, concept, document)
//   description: string,   — for LLM context
//   metadata: map,         — flexible key-value pairs
//   created_at: datetime,
//   updated_at: datetime
// })

// Edge properties
// -[:RELATES_TO {
//   weight: float,   — 0.0 to 1.0, strength of relationship
//   type: string,    — e.g., "works_on", "depends_on", "references"
//   created_at: datetime
// }]->
```

#### Data Sync: Neo4j → 3d-force-graph

```javascript
async function loadGraphData() {
  const result = await neo4j.run(`
    MATCH (n:Entity)
    OPTIONAL MATCH (n)-[r:RELATES_TO]-(m)
    RETURN n, r, m
  `);

  const nodes = [];
  const links = [];
  const nodeMap = new Map();

  result.records.forEach(record => {
    const n = record.get('n');
    if (!nodeMap.has(n.identity.toString())) {
      nodeMap.set(n.identity.toString(), {
        id: n.identity.toString(),
        name: n.properties.name,
        type: n.properties.type,
        connections: 0
      });
    }
    // ... build links array
  });

  return { nodes: [...nodeMap.values()], links };
}
```

#### Caching Strategy

- **Startup:** Load entire graph into memory (for graphs < 10,000 nodes)
- **Voice queries:** Cache last 10 query results (LRU)
- **Real-time updates:** Use Neo4j change streams (if available) or poll every 30s

---

### 4.7 Interaction Priority System

**Purpose:** Resolve conflicts when multiple inputs fire simultaneously.

**Custom development (no open-source for this):**

#### Priority Hierarchy

```
PRIORITY 1 — Voice Command (highest)
  When active: pause gesture processing, show "listening" indicator
  Duration: from activation to command execution complete

PRIORITY 2 — Hand Gesture (explicit)
  When active: normal operation
  Modulated by: body distance (Pose)

PRIORITY 3 — Mouse / Keyboard (fallback)
  Activated: when no hands detected for 5 seconds
  Deactivated: when hands reappear
```

#### Conflict Resolution Rules

```javascript
const conflictRules = {
  // Voice + Point gesture → voice command targets the pointed node
  'voice_active + pointing': (voiceCmd, pointedNode) => {
    return executeVoiceCommand(voiceCmd, { target: pointedNode });
  },

  // Rotate + Voice → pause rotation, execute voice
  'rotating + voice_active': () => {
    camera.pauseRotation();
    // Resume after voice command completes
  },

  // Two hands detected → zoom mode overrides single-hand gestures
  'two_hands': () => {
    return 'ZOOM_MODE';
  },

  // No input for 5 seconds → enable auto-rotate (ambient mode)
  'no_input_5s': () => {
    camera.startAutoRotate(0.001); // Very slow rotation
  }
};
```

#### State Machine

```
                    ┌──────────┐
                    │   IDLE   │
                    └────┬─────┘
                         │ (hand detected)
                         ▼
              ┌─────────────────────┐
              │   GESTURE_TRACKING  │◄──── (voice ends)
              └─────┬──────┬────────┘
         (gesture   │      │  (voice starts)
          confirmed)│      ▼
                    │  ┌──────────────┐
                    │  │ VOICE_ACTIVE │
                    │  └──────────────┘
                    ▼
          ┌──────────────────┐
          │  ACTION_EXECUTE  │
          │  (rotate/select/ │
          │   drag/zoom)     │
          └────────┬─────────┘
                   │ (action complete)
                   ▼
              ┌──────────┐
              │   IDLE   │
              └──────────┘

  * If no hand detected for 5s → FALLBACK_MOUSE
  * If MediaPipe Pose loses chest anchor → fixed sensitivity mode
```

---

## 5. Gesture Specification

### Complete Gesture Table

| # | Gesture | Hand(s) | Detection Method | Mapped Action | Sensitivity Source |
|---|---------|---------|-----------------|---------------|-------------------|
| G1 | **Open Palm Drag** | 1 | All 5 fingers extended + palm moving | Camera orbit (azimuth θ, elevation φ) | Chest distance |
| G2 | **Index Point** | 1 | Only index extended, rest curled | Raycast → node selection | Fixed (raycast) |
| G3 | **Fist Grab** | 1 | All fingers curled | Drag selected node in 3D space | Chest distance |
| G4 | **Single Pinch** | 1 | Thumb-index distance < 30px | Confirm / click | N/A (binary) |
| G5 | **Two-Hand Pinch** | 2 | Both hands detected, inter-hand distance Δ | Zoom (FOV or camera.z) | Distance delta |
| G6 | **Horizontal Swipe** | 1 | Palm velocity.x > 500px/s | Dismiss / filter non-selected nodes | Fixed threshold |
| G7 | **Palm Halt** | 1 | Open palm, stationary for 0.5s | Pause / freeze current view | N/A (binary) |
| G8 | **Left-Hand Pinch** | 1 (left) | Left hand thumb-index pinch | Push-to-talk (voice activation) | N/A (trigger) |

### Gesture Priority (when ambiguous)

```
G5 (two-hand zoom) > G1 (palm drag)     — two hands always means zoom
G2 (point) > G1 (palm drag)             — if index is isolated, it's a point
G8 (left pinch PTT) > G4 (right pinch)  — left hand is reserved for voice trigger
```

---

## 6. Data Flow

### Frame-by-Frame Processing (target: 16ms per frame)

```
Time 0ms   — Webcam captures frame
Time 3ms   — MediaPipe Hands processes → 21 landmarks (per hand)
Time 6ms   — MediaPipe Pose processes → 33 landmarks
Time 8ms   — Gesture Classifier runs:
              - Finger extension detection
              - Gesture state machine update
              - Smoothing (EMA)
Time 9ms   — Distance Calculator runs:
              - Chest anchor estimation
              - Hand-to-chest distance
              - Sensitivity scale output
Time 10ms  — Interaction Priority Resolver:
              - Check voice state
              - Apply sensitivity to gesture output
              - Emit action event
Time 11ms  — Application Layer processes action:
              - Camera update (rotate/zoom)
              - Selection update (raycast hit test)
              - Graph filter (if voice query result arrived)
Time 12ms  — 3d-force-graph physics step
Time 14ms  — Three.js renders frame
Time 15ms  — Hand overlay draws on Canvas 2D
Time 16ms  — Frame displayed
```

### Voice Command Flow (async, does not block rendering)

```
User pinches left hand → Microphone starts recording
User speaks: "Show me connections to Project Alpha"
User releases pinch → Recording stops

  → Whisper API (async, ~1-2s)
    → Transcript: "Show me connections to Project Alpha"
      → Command Router:
        → Not a UI command → Send to LLM
          → GPT-4o generates Cypher (~1-3s)
            → Validate Cypher (no write ops)
              → Execute on Neo4j (~50-200ms)
                → Result: [node IDs to highlight]
                  → Graph Filter: fade non-matching, glow matching
                  → Camera: auto-focus on result cluster
```

During the 2-5 seconds of async processing, a loading indicator pulses near the user's hand. The 3D scene remains interactive throughout.

---

## 7. Open Source vs Custom Development

### Open Source (Import, don't build)

| Library | What It Does For Us | Why Not Build It |
|---------|-------------------|-----------------|
| `three` | WebGL rendering, cameras, meshes, raycasting, lights | Would take 6+ months to replicate |
| `3d-force-graph` | Force-directed layout, node/edge management, physics sim | The math (Barnes-Hut, velocity Verlet) is complex |
| `@mediapipe/hands` | 21-landmark hand tracking from webcam | ML model training requires massive datasets |
| `@mediapipe/pose` | 33-landmark body pose estimation | Same as above |
| `neo4j-driver` | JavaScript driver for Neo4j Cypher queries | Protocol implementation is non-trivial |
| `postprocessing` | Bloom, glow, tone mapping for Three.js | Shader programming is specialized |
| `gsap` or `tween.js` | Smooth value interpolation for animations | Easing functions are well-solved |

### Glue Code (Combine open-source pieces)

| Integration | What We Write |
|------------|--------------|
| MediaPipe → Camera Controller | Map hand (x,y) delta to spherical camera rotation (θ, φ) |
| MediaPipe → Three.js Raycaster | Convert 2D index-tip position to 3D ray direction |
| Whisper → LLM → Neo4j | Chain: audio blob → transcript → prompt → Cypher → results |
| Neo4j result → Graph visual state | Map query results to node visibility/highlight/animation |
| Event Bus | Central pub/sub for gesture, voice, and UI events |

### Custom Development (Our core IP)

| Module | Why It Can't Be Off-the-Shelf |
|--------|------------------------------|
| Gesture Classifier | No library classifies "open palm vs fist vs point" — we define the gestures |
| Body Distance Sensitivity | Novel interaction: chest-to-hand distance as sensitivity modulator |
| Hand Overlay Renderer | Custom visual feedback tailored to our gesture set and color scheme |
| Command Interpreter + Cypher Validator | Our schema, our prompt, our safety rules |
| Interaction Priority Resolver | Multi-modal conflict resolution is specific to our input combination |

**Effort split:** ~60% open-source / ~20% glue code / ~20% custom core

---

## 8. Development Phases

### Phase 1: Static Nebula (Week 1)

**Goal:** A beautiful 3D scene with floating nodes and edges.

- [ ] Initialize project: Vite + vanilla JS (or React)
- [ ] Install Three.js + 3d-force-graph
- [ ] Generate 500 random nodes with random categories
- [ ] Connect nodes with random edges (probability-based)
- [ ] Apply category-based colors and connection-based sizing
- [ ] Add bloom post-processing for glow effect
- [ ] Mouse orbit controls (OrbitControls as placeholder)
- [ ] Node hover → show label tooltip
- [ ] Node click → side panel with details

**Deliverable:** A rotating, glowing sphere of connected data points navigable by mouse.

---

### Phase 2: Real Data + Neo4j (Week 2)

**Goal:** Replace random data with a real graph database.

- [ ] Install and configure Neo4j Community Edition locally
- [ ] Design schema (Entity nodes, RELATES_TO edges)
- [ ] Create seed data script (50-100 meaningful nodes)
- [ ] Build Neo4j → 3d-force-graph data adapter
- [ ] Implement data refresh on query result
- [ ] Add search bar (text input) as temporary voice placeholder
- [ ] Text-to-Cypher via LLM (GPT-4o API)
- [ ] Cypher validator (block write operations)
- [ ] Visual feedback: highlight query results, dim others

**Deliverable:** A live graph database rendered in 3D, queryable via text.

---

### Phase 3: Hand Tracking + Gestures (Weeks 3-4)

**Goal:** Replace mouse with hands.

- [ ] Integrate MediaPipe Hands (webcam access)
- [ ] Build hand landmark smoother (EMA)
- [ ] Implement gesture classifier:
  - [ ] G1: Open Palm → rotate
  - [ ] G2: Index Point → raycast select
  - [ ] G3: Fist → drag
  - [ ] G4: Single Pinch → confirm
  - [ ] G5: Two-Hand Pinch → zoom
  - [ ] G6: Swipe → dismiss
- [ ] Build gesture state machine (IDLE → PENDING → ACTIVE → RELEASING)
- [ ] Map gestures to camera controller (replace OrbitControls)
- [ ] Map gestures to selection manager (replace click)
- [ ] Add confidence filtering (threshold 0.75)
- [ ] Mouse fallback: auto-switch when no hands detected for 5s

**Deliverable:** Full hand-controlled 3D navigation.

---

### Phase 4: Body Pose + Sensitivity (Week 4)

**Goal:** Add body awareness for natural sensitivity scaling.

- [ ] Integrate MediaPipe Pose (Lite model)
- [ ] Implement chest anchor calculation
- [ ] Build distance-to-sensitivity mapper (3 zones)
- [ ] Idle detection (both hands near chest + stationary)
- [ ] Performance monitoring: ensure combined MediaPipe stays under 25ms/frame
- [ ] Fallback: if Pose drops below 30fps, disable and use fixed sensitivity

**Deliverable:** Gesture sensitivity that feels natural — fine-grained up close, sweeping at arm's length.

---

### Phase 5: Hand Overlay (Week 5)

**Goal:** Show the user's hand on screen with state feedback.

- [ ] Create Canvas 2D overlay layer (above WebGL canvas)
- [ ] Draw hand skeleton (21 landmarks connected)
- [ ] Color-code by gesture state
- [ ] Add gesture state label near wrist
- [ ] Build laser pointer ray for Point gesture (3D line in Three.js)
- [ ] Laser-node intersection → node glow effect
- [ ] Opacity tied to MediaPipe confidence
- [ ] Smooth appearance/disappearance transitions

**Deliverable:** A transparent hand hologram on screen with real-time gesture labels.

---

### Phase 6: Voice Commands (Weeks 5-6)

**Goal:** Speak to query the nebula.

- [ ] Implement push-to-talk via left-hand pinch (G8)
- [ ] Integrate Whisper API for speech-to-text
- [ ] Build command router (UI commands vs LLM queries)
- [ ] Implement UI command shortcuts (reset, zoom, undo)
- [ ] Build LLM prompt template with Neo4j schema + examples
- [ ] Cypher generation → validation → execution pipeline
- [ ] Query result → visual mapping (highlight, path, aggregate)
- [ ] Loading indicator during async processing
- [ ] Audio feedback: subtle chime on command recognized

**Deliverable:** "Show me connections to Project Alpha" → matching nodes glow, others fade.

---

### Phase 7: Interaction Priority + Polish (Week 7)

**Goal:** Make all inputs work together seamlessly.

- [ ] Build Interaction Priority Resolver
- [ ] Implement conflict resolution rules
- [ ] Voice active → pause gesture processing
- [ ] Two hands → override single-hand gesture
- [ ] No input → auto-rotate ambient mode
- [ ] Combine gesture + voice (point + speak = targeted command)
- [ ] Add node transition animations (GSAP)
- [ ] Particle background (nebula aesthetic)
- [ ] Performance optimization pass:
  - [ ] LOD: distant nodes → points
  - [ ] Frustum culling
  - [ ] Throttle MediaPipe to 30fps if GPU-bound
- [ ] Final UI polish: loading states, error messages, help overlay

**Deliverable:** A polished, multi-modal 3D knowledge graph — the complete Jarvis Nebula.

---

## 9. Risk Matrix & Mitigations

| # | Risk | Probability | Impact | Mitigation |
|---|------|------------|--------|-----------|
| R1 | MediaPipe hand tracking jitters too much | Medium | High | EMA smoothing + gesture hold threshold (5 frames). If still bad, increase SMOOTHING to 0.85 |
| R2 | Two MediaPipe models (Hands + Pose) exceed frame budget | Medium | High | Profile early in Phase 4. Fallback: disable Pose, use fixed sensitivity |
| R3 | 3D scene drops below 30fps at 5000+ nodes | Medium | Medium | LOD system: far nodes as GL_POINTS. Limit visible nodes to 2000. Cluster distant groups into single meta-nodes |
| R4 | LLM generates invalid Cypher | High | Low | Regex validator catches write ops. Invalid syntax → retry once with error feedback to LLM. If still fails, show "I didn't understand" |
| R5 | Whisper misrecognizes technical terms | Medium | Low | Show transcript before executing. Allow user to correct via voice ("No, I said X"). Add custom vocabulary to system prompt |
| R6 | Webcam permission denied | Low | Critical | Show clear onboarding explaining why webcam is needed. Offer mouse-only mode as alternative |
| R7 | Gesture conflicts (palm vs point ambiguity) | Medium | Medium | Strict finger-extension checks + 5-frame hold. Priority rules resolve ties |
| R8 | Neo4j setup complexity for end users | Low | Medium | Provide Docker Compose file for one-command setup. Alternatively, use in-memory graph (e.g., graphology) for demo mode |

---

## 10. Future Enhancements

These are explicitly **NOT** in the MVP. Documented here for future reference only.

| Enhancement | Description | When to Add |
|-------------|-------------|-------------|
| **Eye Tracking** | MediaPipe Face Mesh iris landmarks → Zone-level gaze detection → passive node highlighting | After Phase 7, if users want "look to highlight" |
| **WebGazer.js** | ML-based pixel-level gaze estimation (requires calibration) | Only if Zone-level gaze proves insufficient |
| **Multi-user** | WebRTC + shared Neo4j → multiple people in the same nebula | V2.0 |
| **VR Mode** | WebXR integration — the nebula in a headset | V2.0 |
| **Data Import** | CSV, JSON, or API connectors to populate the graph automatically | After MVP, when real users need to load their own data |
| **Embedding-based Layout** | Use text embeddings to position nodes by semantic similarity (instead of only force-directed) | When the graph exceeds 10,000 nodes and force layout becomes chaotic |
| **Offline Voice** | Replace Whisper API with whisper.cpp (local WASM) for zero-latency, offline STT | When latency becomes a complaint |
| **Custom Gestures** | Let users define their own gesture → action mappings | V2.0 |

---

*Last updated: 2026-03-30*
