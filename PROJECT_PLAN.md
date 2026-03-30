# Jarvis Nebula — Project Plan

> An AI Assistant with a 3D Spatial Interface — command your data with hands and voice, like Tony Stark's Jarvis.

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
   - 4.5 [Voice & Text Command Pipeline](#45-voice--text-command-pipeline)
   - 4.6 [Graph Database & Query Layer](#46-graph-database--query-layer)
   - 4.7 [Input Merging System](#47-input-merging-system)
   - 4.8 [AI Agent Core](#48-ai-agent-core)
   - 4.9 [Agent Executor (Tool Use)](#49-agent-executor-tool-use)
5. [Gesture Specification](#5-gesture-specification)
6. [Data Flow](#6-data-flow)
7. [Open Source vs Custom Development](#7-open-source-vs-custom-development)
8. [Development Phases](#8-development-phases)
9. [Risk Matrix & Mitigations](#9-risk-matrix--mitigations)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. Vision & Core Principles

### What This Is

Jarvis Nebula is an **AI assistant** — not a visualization tool. The user speaks or types commands, and an AI agent executes real-world tasks: file operations, code generation, web searches, API calls, data analysis, and more.

The 3D "Data Nebula" is the **interface** through which the user sees and manipulates the context the AI is working with. Nodes represent entities (files, people, projects, concepts). Edges represent relationships. The user grabs, rotates, and filters these nodes with their hands while giving voice commands to the AI — exactly like Tony Stark commanding Jarvis through holographic displays.

```
┌─────────────────────────────────────────────────────────┐
│                    What the user sees:                    │
│                                                          │
│    A glowing 3D sphere of interconnected data nodes      │
│    Their transparent hand overlaid on screen              │
│    AI responses spoken back / displayed as text          │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                   What actually happens:                  │
│                                                          │
│    Voice/text → AI Agent interprets intent               │
│    Agent decides: graph query? or real-world action?     │
│    Graph query → Neo4j → update 3D view                 │
│    Real-world action → Agent Executor → tools/APIs      │
│    Results fed back into the nebula as new/updated nodes │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Core Principles

1. **AI-First** — The assistant is the product. The 3D nebula is the interface, not the goal. Every feature serves the question: "Does this make the AI assistant more useful?"
2. **Spatial Cognition** — Distance encodes meaning. Related nodes cluster together; isolated nodes drift to edges. The user "feels" data structure by looking at it.
3. **Multi-Modal Input (All Channels Always On)** — Hands, voice, mouse, and keyboard all work simultaneously. There is no "fallback mode." Mouse is not a degraded experience — it's a first-class input that coexists with gestures. The user can switch freely between input methods mid-action.
4. **Immediate Feedback** — Every input must produce visible feedback within 1 frame (~16ms). Hand overlay confirms tracking. Gesture labels confirm recognition. AI status is always visible.
5. **Agent Autonomy with User Control** — The AI proposes actions and shows its plan visually in the nebula. The user confirms, modifies, or rejects before execution. Critical/destructive actions always require explicit confirmation.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        INPUT SOURCES                             │
│               (all active simultaneously)                        │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────────────────┐  │
│  │ MediaPipe│ │ MediaPipe│ │ Microphone│ │  Mouse / Keyboard │  │
│  │  Hands   │ │   Pose   │ │ + Whisper │ │  (always active)  │  │
│  │(21 joint)│ │(33 joint)│ │  (STT)    │ │                   │  │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └────────┬──────────┘  │
│       │            │             │                 │             │
│       ▼            ▼             ▼                 ▼             │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │                  INPUT MERGING LAYER                     │     │
│  │                                                         │     │
│  │  Gesture Classifier ◄── Distance Calculator (Pose)     │     │
│  │  Mouse/KB Handler                                       │     │
│  │  Text Input Handler                                     │     │
│  │                                                         │     │
│  │  Merge Rule: last active input wins for camera/select   │     │
│  │  Text input & voice: always available in parallel       │     │
│  └──────────────────────────┬──────────────────────────────┘     │
└─────────────────────────────┼───────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   Spatial    │   │  Command Router  │   │  Direct UI       │
│  Navigation  │   │                  │   │  Actions         │
│  (camera,    │   │  Classifies:     │   │  (reset, zoom,   │
│   select,    │   │  - Graph query   │   │   undo, help)    │
│   drag)      │   │  - Agent task    │   │                  │
│              │   │  - UI command    │   │                  │
└──────┬───────┘   └────────┬─────────┘   └──────┬───────────┘
       │                    │                     │
       │         ┌──────────┴──────────┐          │
       │         │                     │          │
       │         ▼                     ▼          │
       │  ┌─────────────┐   ┌──────────────────┐  │
       │  │  Graph      │   │   AI AGENT CORE  │  │
       │  │  Query      │   │                  │  │
       │  │ (Neo4j      │   │  Intent Parser   │  │
       │  │  Cypher)    │   │  Task Planner    │  │
       │  │             │   │  Context Manager │  │
       │  └──────┬──────┘   └────────┬─────────┘  │
       │         │                   │             │
       │         │                   ▼             │
       │         │         ┌──────────────────┐    │
       │         │         │  AGENT EXECUTOR  │    │
       │         │         │  (Tool Use)      │    │
       │         │         │                  │    │
       │         │         │  OpenClaw /      │    │
       │         │         │  NemoClaw /      │    │
       │         │         │  Custom Tools    │    │
       │         │         │                  │    │
       │         │         │  ┌────────────┐  │    │
       │         │         │  │ File Ops   │  │    │
       │         │         │  │ Code Exec  │  │    │
       │         │         │  │ Web Search │  │    │
       │         │         │  │ API Calls  │  │    │
       │         │         │  │ Data Pipe  │  │    │
       │         │         │  └────────────┘  │    │
       │         │         └────────┬─────────┘    │
       │         │                  │               │
       ▼         ▼                  ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RENDERING LAYER                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  3D RENDERING ENGINE                        │  │
│  │  Three.js + 3d-force-graph + Post-processing               │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  Hand Overlay (Canvas 2D) — skeleton, laser, state labels  │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  Agent Status Panel — current task, progress, plan display │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  Text Input Bar — always visible, type commands anytime    │  │
│  └────────────────────────────────────────────────────────────┘  │
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
│  │                                                          │   │
│  │  + Agent memory: task history, user preferences,         │   │
│  │    conversation context stored as graph relationships    │   │
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
| **LLM (Brain)** | GPT-4o API or Ollama (local) | Intent parsing, task planning, Cypher gen | API (paid) / Ollama: MIT |
| **Agent Executor** | OpenClaw / NemoClaw | Execute real-world actions (file, code, web, API) | Open source |
| **Graph Database** | Neo4j Community | Node/edge storage, Cypher queries, agent memory | GPL v3 (Community) |
| **Frontend** | Vanilla JS or React | UI shell, event bus, state management | MIT |
| **Build Tool** | Vite | Fast dev server, HMR, bundling | MIT |
| **Text-to-Speech** | Web Speech API or ElevenLabs | Agent speaks responses back to user | Free / API (paid) |

---

## 4. Module Breakdown

### 4.1 Rendering Engine

**Purpose:** Display the data nebula — nodes as spheres, edges as lines, all inside a spherical boundary. Also render the Agent Status Panel and Text Input Bar.

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
- **Agent task nodes:** Special node type that pulses while a task is in progress, turns green on success, red on failure
- **Agent Status Panel (HTML overlay):** Shows current task, plan steps, progress bar

**Key configuration:**

```javascript
// Node sizing
const nodeSize = (node) => 2 + Math.log(node.connections + 1) * 3;

// Category color map (expanded for agent context)
const categoryColors = {
  person: '#4FC3F7',
  project: '#81C784',
  concept: '#FFB74D',
  document: '#E57373',
  task_pending: '#FFF176',   // Agent task: waiting
  task_running: '#CE93D8',   // Agent task: executing (pulses)
  task_complete: '#A5D6A7',  // Agent task: done
  task_failed: '#EF9A9A',   // Agent task: error
  default: '#B0BEC5'
};

// Force-graph config
forceGraph
  .nodeVal(node => node.connections)
  .nodeColor(node => categoryColors[node.type] || categoryColors.default)
  .linkOpacity(link => link.weight / maxWeight)
  .d3AlphaDecay(0.02)
  .d3VelocityDecay(0.3);
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

**Purpose:** Track hands via webcam and classify gestures into discrete actions. Coexists with mouse — both are always active.

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

```javascript
// Exponential Moving Average (EMA) for position smoothing
const SMOOTHING = 0.7;
smoothed.x = SMOOTHING * smoothed.x + (1 - SMOOTHING) * raw.x;
smoothed.y = SMOOTHING * smoothed.y + (1 - SMOOTHING) * raw.y;
smoothed.z = SMOOTHING * smoothed.z + (1 - SMOOTHING) * raw.z;
```

```javascript
// Gesture state machine — prevents flickering
const GESTURE_HOLD_FRAMES = 5;
const GESTURE_RELEASE_FRAMES = 8;
// States: IDLE → PENDING → ACTIVE → RELEASING → IDLE
```

#### Confidence Filtering

```javascript
if (hand.score < 0.75) {
  return; // Skip this frame, keep last known state
  // Mouse/keyboard remain fully functional during low-confidence frames
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
  const normalizedDist = distance / shoulderWidth;

  if (normalizedDist < 0.5) return 0.3;   // CLOSE — precision mode
  if (normalizedDist < 1.2) return 1.0;   // NORMAL — standard
  return 2.5;                              // FAR — fast mode
}
```

#### Idle Detection

```javascript
// Both hands close to chest + stationary for 2 seconds = gesture IDLE
// Mouse/keyboard remain fully active during gesture idle state
if (bothHandsNearChest && handVelocity < IDLE_THRESHOLD && idleDuration > 2000) {
  gestureState = 'IDLE'; // Only gesture input paused, not other inputs
}
```

#### Performance Note

MediaPipe Pose (Lite model) adds ~5-8ms per frame. If combined MediaPipe processing exceeds 25ms/frame, disable Pose and use fixed gesture sensitivity. Mouse/keyboard are unaffected by MediaPipe performance.

---

### 4.4 Hand Overlay (Visual Feedback)

**Purpose:** Show a transparent hand skeleton on screen so the user knows exactly where their hand is being tracked, what gesture is recognized, and where they're pointing.

**Custom development (entirely):**

#### Layer Architecture

```
┌─────────────────────────────┐
│   Agent Status Panel (HTML) │  ← z-index: 20, top-right corner
├─────────────────────────────┤
│   Text Input Bar (HTML)     │  ← z-index: 15, bottom, always visible
├─────────────────────────────┤
│   Canvas 2D (hand overlay)  │  ← z-index: 10, pointer-events: none
│  - Hand skeleton lines      │
│  - Joint dots               │
│  - Laser pointer ray        │
│  - Gesture state label      │
├─────────────────────────────┤
│   WebGL Canvas (3D scene)   │  ← z-index: 0
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

### 4.5 Voice & Text Command Pipeline

**Purpose:** Accept natural language commands via voice OR text. Route them to graph queries, UI actions, or the AI agent for real-world task execution.

**Open-source handles:**
- Speech-to-text (Whisper API)
- Natural language understanding (GPT-4o or Ollama)
- Cypher query execution (Neo4j driver)

**Custom development:**

#### Input Methods (All Always Available)

| Method | Activation | Use Case |
|--------|-----------|----------|
| **Voice (Push-to-Talk)** | Left-hand pinch gesture (G8) | Hands-free commanding while manipulating nebula |
| **Voice (Wake Word)** | "Hey Nebula" (Porcupine) | When hands are not tracked |
| **Text Input Bar** | Click or keyboard shortcut (/) | Precise commands, code snippets, long queries |
| **Text + Keyboard** | Always focused when typing | Traditional input, copy-paste, editing |

#### Three-Way Command Classification

The Command Router must now classify into **three** categories, not two:

```javascript
function routeCommand(transcript) {
  const normalized = transcript.toLowerCase().trim();

  // 1. UI Commands — instant, no LLM needed
  const uiAction = matchUICommand(normalized);
  if (uiAction) return { type: 'ui', action: uiAction };

  // 2. Graph Queries — "show me", "find", "connect", "path between"
  //    Keywords that imply data lookup, not action
  if (isGraphQuery(normalized)) return { type: 'graph', query: normalized };

  // 3. Agent Tasks — everything else (the default)
  //    "Write a report on...", "Send an email to...",
  //    "Analyze this data...", "Create a file..."
  return { type: 'agent', task: normalized };
}

const UI_COMMANDS = {
  'reset': () => camera.resetPosition(),
  'zoom out': () => camera.zoomTo(DEFAULT_FOV),
  'zoom in': () => camera.zoomTo(CLOSE_FOV),
  'show all': () => graph.showAllNodes(),
  'undo': () => stateManager.undo(),
  'help': () => ui.showHelpOverlay(),
  'stop': () => agent.cancelCurrentTask(),
  'confirm': () => agent.confirmPendingAction(),
  'reject': () => agent.rejectPendingAction()
};

function isGraphQuery(text) {
  const graphKeywords = [
    'show me', 'find', 'connections to', 'path between',
    'related to', 'linked to', 'top connected', 'filter',
    'how many', 'list all', 'nodes of type'
  ];
  return graphKeywords.some(kw => text.includes(kw));
}
```

#### Graph Query Pipeline (same as before)

```javascript
async function handleGraphQuery(userQuery) {
  const cypher = await generateCypherFromLLM(userQuery);
  validateCypher(cypher); // Block write operations
  const results = await neo4j.run(cypher);
  return mapResultsToVisuals(results);
}
```

#### Agent Task Pipeline (NEW)

```javascript
async function handleAgentTask(userTask) {
  // 1. AI Agent Core parses intent and creates a plan
  const plan = await agentCore.planTask(userTask);

  // 2. Show plan in Agent Status Panel + create task nodes in nebula
  ui.showPlan(plan);
  nebula.createTaskNodes(plan.steps);

  // 3. Wait for user confirmation (voice "confirm" or click)
  if (plan.requiresConfirmation) {
    await waitForUserConfirmation();
  }

  // 4. Execute via Agent Executor
  for (const step of plan.steps) {
    nebula.updateTaskNode(step.id, 'running');
    const result = await agentExecutor.execute(step);
    nebula.updateTaskNode(step.id, result.success ? 'complete' : 'failed');

    // Feed results back into Neo4j as new knowledge
    if (result.newEntities) {
      await neo4j.ingestEntities(result.newEntities);
      nebula.refreshGraph();
    }
  }

  // 5. Speak summary back to user
  tts.speak(plan.summary);
}
```

#### LLM → Cypher Pipeline

```javascript
async function generateCypherFromLLM(userQuery) {
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

  if (/\b(DELETE|DETACH|CREATE|SET|MERGE|REMOVE)\b/i.test(cypher)) {
    throw new Error('Write operations are not allowed via voice/text query');
  }

  return cypher;
}
```

#### Visual Feedback for All Command Types

| Command Type | Visual Effect |
|-------------|---------------|
| **UI Command** | Instant action (camera move, reset, etc.) |
| **Graph Query** | Matching nodes glow bright, others fade to 10% opacity |
| **Agent Task (planning)** | New task nodes appear in nebula, connected to relevant entities, pulsing yellow |
| **Agent Task (executing)** | Active step node pulses purple, completed steps turn green |
| **Agent Task (failed)** | Failed step node turns red, error message in Status Panel |
| **Agent Task (complete)** | All task nodes settle, summary spoken aloud |

---

### 4.6 Graph Database & Query Layer

**Purpose:** Store nodes and relationships persistently. Serve as the single source of truth for graph structure AND agent memory/context.

**Open-source handles:**
- Storage, indexing, Cypher execution (Neo4j)
- JavaScript driver (`neo4j-driver`)

**Custom development:**

#### Schema Design

```cypher
// === ENTITY NODES (data the user works with) ===
CREATE CONSTRAINT entity_name IF NOT EXISTS
FOR (e:Entity) REQUIRE e.name IS UNIQUE;

// (:Entity {
//   name: string,
//   type: string,          — person, project, concept, document, file, api, etc.
//   description: string,
//   metadata: map,
//   created_at: datetime,
//   updated_at: datetime
// })

// === RELATIONSHIP EDGES ===
// -[:RELATES_TO {
//   weight: float,         — 0.0 to 1.0
//   type: string,          — works_on, depends_on, references, created_by, etc.
//   created_at: datetime
// }]->

// === AGENT TASK NODES (tasks the AI has executed) ===
// (:Task {
//   id: string,
//   command: string,        — original user command
//   status: string,         — planned, running, complete, failed
//   plan: list<string>,     — step descriptions
//   result_summary: string,
//   created_at: datetime,
//   completed_at: datetime
// })

// === AGENT MEMORY ===
// (:Task)-[:OPERATED_ON]->(:Entity)     — which entities a task touched
// (:Task)-[:PRODUCED]->(:Entity)        — new entities created by a task
// (:Entity)-[:MENTIONED_IN]->(:Task)    — reverse lookup
```

#### Data Sync: Neo4j → 3d-force-graph

```javascript
async function loadGraphData() {
  const result = await neo4j.run(`
    MATCH (n)
    WHERE n:Entity OR n:Task
    OPTIONAL MATCH (n)-[r]-(m)
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
        name: n.properties.name || n.properties.command,
        type: n.properties.type || n.properties.status,
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
- **Voice/text queries:** Cache last 10 query results (LRU)
- **Agent updates:** Immediate push to graph on task completion (no polling)
- **Agent context:** Last 20 tasks + their connected entities kept in hot cache for LLM context

---

### 4.7 Input Merging System

**Purpose:** Allow all input methods (gesture, mouse, keyboard, voice, text) to work simultaneously without conflict. There is NO fallback mode — all inputs are first-class citizens at all times.

**Custom development (entirely):**

#### Merge Strategy: "Last Active Wins" for Spatial, "Always On" for Commands

Inputs are split into two categories that never conflict:

```
SPATIAL INPUTS (camera, selection — only one controls at a time):
  - Mouse movement / scroll → camera orbit, zoom
  - Hand gesture (Open Palm) → camera orbit
  - Hand gesture (Pinch Zoom) → zoom
  - Hand gesture (Point) → raycast selection
  - Mouse click → click selection

COMMAND INPUTS (always available in parallel):
  - Voice (Push-to-Talk or Wake Word) → Command Router
  - Text Input Bar (keyboard) → Command Router
  - Keyboard shortcuts → UI Commands
```

#### Spatial Input Merging Rules

```javascript
class InputMerger {
  constructor() {
    this.lastSpatialSource = 'mouse'; // 'mouse' | 'gesture'
    this.lastSpatialTime = 0;
    this.SWITCH_DEBOUNCE_MS = 200; // Prevent rapid switching
  }

  // Called every frame
  update(gestureInput, mouseInput) {
    const now = performance.now();

    // Gesture input arrived
    if (gestureInput.active && gestureInput.confidence > 0.75) {
      if (this.lastSpatialSource !== 'gesture' &&
          now - this.lastSpatialTime > this.SWITCH_DEBOUNCE_MS) {
        this.lastSpatialSource = 'gesture';
      }
      if (this.lastSpatialSource === 'gesture') {
        this.lastSpatialTime = now;
        return { source: 'gesture', data: gestureInput };
      }
    }

    // Mouse input arrived
    if (mouseInput.moving || mouseInput.clicking) {
      if (this.lastSpatialSource !== 'mouse' &&
          now - this.lastSpatialTime > this.SWITCH_DEBOUNCE_MS) {
        this.lastSpatialSource = 'mouse';
      }
      if (this.lastSpatialSource === 'mouse') {
        this.lastSpatialTime = now;
        return { source: 'mouse', data: mouseInput };
      }
    }

    return null; // No spatial input this frame
  }
}
```

#### Key Behaviors

| Scenario | Behavior |
|----------|----------|
| User moves mouse | Mouse controls camera. Hand overlay still visible if tracked. |
| User raises hand and makes gesture | Gesture takes over camera. Mouse cursor still visible and clickable. |
| User types in text bar while gesturing | Gesture controls camera. Text input processes command. Both simultaneous. |
| User speaks while mouse-dragging | Mouse continues camera control. Voice processes command asynchronously. |
| User speaks "confirm" while pointing at node | Voice confirms action. Pointed node is the implicit target. |
| User clicks a node while voice command runs | Click selects node immediately. Voice command continues async. |
| No webcam / permission denied | Mouse + keyboard + text fully functional. Gesture features simply absent. |
| Webcam active but no hands visible | Mouse + keyboard work normally. Hand overlay not shown. |

#### Voice During Spatial Actions

Voice commands NEVER block spatial navigation. The user can rotate the nebula with their right hand while giving a voice command with their left-hand pinch. Both process independently:

```
Right hand (gesture) → Camera rotation (real-time, every frame)
Left hand (pinch) → Voice recording (async, result arrives later)
Text bar (typing) → Command input (submit on Enter)
Mouse (scroll) → Zoom (real-time, every frame)
```

---

### 4.8 AI Agent Core

**Purpose:** The "brain" of Jarvis Nebula. Interprets user intent, maintains conversation context, creates task plans, and decides which tools to invoke via the Agent Executor.

**This is NOT a graph query engine — it's a general-purpose AI assistant that happens to use a 3D nebula as its interface.**

**Open-source handles:**
- LLM inference (GPT-4o API or Ollama)
- Prompt management (LangChain or custom)

**Custom development:**

#### Responsibilities

1. **Intent Parsing** — Understand what the user wants from natural language
2. **Context Management** — Track conversation history, selected nodes, recent tasks
3. **Task Planning** — Break complex requests into executable steps
4. **Plan Visualization** — Convert plans into nebula node structures
5. **Result Integration** — Feed task results back into Neo4j as new knowledge

#### Context Window Construction

The Agent Core builds a rich context for every LLM call:

```javascript
function buildAgentContext(userCommand) {
  return {
    // What the user said
    command: userCommand,

    // What the user is looking at / has selected
    selectedNodes: selectionManager.getSelected(),       // Currently selected nodes
    visibleNodes: graph.getVisibleNodeSummary(),          // What's on screen
    recentInteractions: graph.getRecentInteractions(5),   // Last 5 node interactions

    // Conversation history
    recentMessages: conversationHistory.getLast(20),

    // Agent memory from Neo4j
    recentTasks: await neo4j.run(`
      MATCH (t:Task)
      RETURN t ORDER BY t.created_at DESC LIMIT 10
    `),

    // Graph schema summary (so the agent knows what data exists)
    entityTypes: await neo4j.run(`
      MATCH (n:Entity) RETURN DISTINCT n.type, count(n)
    `),

    // System time, user preferences, etc.
    systemContext: {
      time: new Date().toISOString(),
      userName: config.userName
    }
  };
}
```

#### Task Planning

```javascript
async function planTask(userCommand) {
  const context = await buildAgentContext(userCommand);

  const systemPrompt = `
    You are Jarvis Nebula, an AI assistant. The user interacts with you
    through a 3D spatial interface where data exists as glowing nodes.

    You can:
    1. Query the knowledge graph (Neo4j/Cypher)
    2. Execute real-world actions via tools (file ops, code, web, APIs)
    3. Create new knowledge nodes from results
    4. Speak responses back to the user

    Given the user's command and context, create a step-by-step plan.

    For each step, specify:
    - description: what this step does
    - type: "graph_query" | "tool_use" | "llm_reasoning" | "user_confirm"
    - tool: (if tool_use) which tool to call
    - dangerous: true if this step modifies external state

    IMPORTANT: Steps marked dangerous=true will require user confirmation
    before execution. Always mark file writes, API calls, sends, and
    deletions as dangerous.

    Respond in JSON format.
  `;

  const plan = await llm.chat(systemPrompt, JSON.stringify(context));
  return JSON.parse(plan);
}
```

#### Example Plan

User says: *"Research the latest trends in WebGPU and create a summary document."*

```json
{
  "summary": "Research WebGPU trends and create a summary document",
  "steps": [
    {
      "id": "step_1",
      "description": "Search the web for latest WebGPU developments",
      "type": "tool_use",
      "tool": "web_search",
      "args": { "query": "WebGPU latest developments 2026" },
      "dangerous": false
    },
    {
      "id": "step_2",
      "description": "Analyze and synthesize search results",
      "type": "llm_reasoning",
      "dangerous": false
    },
    {
      "id": "step_3",
      "description": "Create summary document: webgpu_trends_2026.md",
      "type": "tool_use",
      "tool": "file_write",
      "args": { "path": "webgpu_trends_2026.md" },
      "dangerous": true
    },
    {
      "id": "step_4",
      "description": "Add WebGPU topic node to knowledge graph with links",
      "type": "graph_query",
      "dangerous": false
    }
  ],
  "requiresConfirmation": true
}
```

This plan would appear in the nebula as 4 connected task nodes, linked to existing "WebGPU" or "technology" entities if they exist.

---

### 4.9 Agent Executor (Tool Use)

**Purpose:** Execute real-world actions on behalf of the AI agent. This is the "hands" of Jarvis — the part that actually does things.

**Open-source handles:**
- Agent execution frameworks: OpenClaw, NemoClaw, or similar
- Individual tool implementations vary by framework

**Custom development:**
- Tool registry and routing
- Safety layer (confirmation for dangerous actions)
- Result formatting for nebula integration

#### Tool Registry

```javascript
const toolRegistry = {
  // === FILE OPERATIONS ===
  file_read: {
    description: 'Read contents of a file',
    dangerous: false,
    execute: async ({ path }) => { /* ... */ }
  },
  file_write: {
    description: 'Write content to a file',
    dangerous: true,  // Always requires confirmation
    execute: async ({ path, content }) => { /* ... */ }
  },
  file_list: {
    description: 'List files in a directory',
    dangerous: false,
    execute: async ({ directory, pattern }) => { /* ... */ }
  },

  // === CODE EXECUTION ===
  code_run: {
    description: 'Execute code in a sandboxed environment',
    dangerous: true,
    execute: async ({ language, code }) => { /* ... */ }
  },

  // === WEB ===
  web_search: {
    description: 'Search the web for information',
    dangerous: false,
    execute: async ({ query }) => { /* ... */ }
  },
  web_fetch: {
    description: 'Fetch content from a URL',
    dangerous: false,
    execute: async ({ url }) => { /* ... */ }
  },

  // === DATA ===
  data_analyze: {
    description: 'Analyze a dataset and return statistics/insights',
    dangerous: false,
    execute: async ({ data, analysisType }) => { /* ... */ }
  },

  // === COMMUNICATION ===
  send_message: {
    description: 'Send a message via configured channel (email, Slack, etc.)',
    dangerous: true,
    execute: async ({ channel, recipient, message }) => { /* ... */ }
  },

  // === KNOWLEDGE GRAPH ===
  graph_create_node: {
    description: 'Create a new entity node in the knowledge graph',
    dangerous: false,  // Graph writes are generally safe
    execute: async ({ name, type, metadata }) => { /* ... */ }
  },
  graph_create_edge: {
    description: 'Create a relationship between two nodes',
    dangerous: false,
    execute: async ({ from, to, type, weight }) => { /* ... */ }
  }
};
```

#### Integration with OpenClaw / NemoClaw

The Agent Executor acts as an **adapter layer** between our AI Agent Core and the execution framework:

```javascript
class AgentExecutor {
  constructor(framework = 'openclaw') {
    // Initialize the chosen framework
    if (framework === 'openclaw') {
      this.runtime = new OpenClawRuntime({ tools: toolRegistry });
    } else if (framework === 'nemoclaw') {
      this.runtime = new NemoClawRuntime({ tools: toolRegistry });
    }
  }

  async execute(step) {
    // Safety check: dangerous actions need confirmation
    if (step.dangerous && !step.confirmed) {
      throw new Error('Dangerous action requires user confirmation');
    }

    // Execute via framework
    const result = await this.runtime.executeTool(step.tool, step.args);

    // Convert results to entities for Neo4j ingestion
    const newEntities = this.extractEntities(result);

    return {
      success: true,
      output: result,
      newEntities: newEntities
    };
  }

  extractEntities(result) {
    // Parse tool output for things worth remembering
    // e.g., a web search returns articles → each becomes a :Entity node
    // e.g., a file write creates a file → the file becomes a :Entity node
    // This is handled by LLM: "What entities are in this result?"
    return agentCore.extractEntitiesFromResult(result);
  }
}
```

#### Safety Architecture

```
User Command
    ↓
AI Agent Core (plans steps)
    ↓
For each step:
    ├─ dangerous: false → Execute immediately
    ├─ dangerous: true  → Show in nebula as PENDING node (yellow pulse)
    │                      Show in Status Panel: "Confirm: [action description]?"
    │                      Wait for:
    │                        - Voice: "confirm" / "yes" → Execute
    │                        - Voice: "reject" / "no" / "cancel" → Skip
    │                        - Click: Confirm/Reject buttons in Status Panel
    │                        - Gesture: Pinch on the PENDING node → Confirm
    │                        - Timeout 30s → Auto-reject with warning
    └─ After execution → Result shown in nebula, spoken summary
```

---

## 5. Gesture Specification

### Complete Gesture Table

| # | Gesture | Hand(s) | Detection Method | Mapped Action | Sensitivity Source |
|---|---------|---------|-----------------|---------------|-------------------|
| G1 | **Open Palm Drag** | 1 | All 5 fingers extended + palm moving | Camera orbit (azimuth θ, elevation φ) | Chest distance |
| G2 | **Index Point** | 1 | Only index extended, rest curled | Raycast → node selection | Fixed (raycast) |
| G3 | **Fist Grab** | 1 | All fingers curled | Drag selected node in 3D space | Chest distance |
| G4 | **Single Pinch** | 1 | Thumb-index distance < 30px | Confirm / click / approve pending action | N/A (binary) |
| G5 | **Two-Hand Pinch** | 2 | Both hands detected, inter-hand distance Δ | Zoom (FOV or camera.z) | Distance delta |
| G6 | **Horizontal Swipe** | 1 | Palm velocity.x > 500px/s | Dismiss / filter non-selected nodes | Fixed threshold |
| G7 | **Palm Halt** | 1 | Open palm, stationary for 0.5s | Pause / freeze current view | N/A (binary) |
| G8 | **Left-Hand Pinch** | 1 (left) | Left hand thumb-index pinch | Push-to-talk (voice activation) | N/A (trigger) |

### Mouse/Keyboard Equivalents (Always Available)

| Gesture | Mouse/Keyboard Equivalent |
|---------|--------------------------|
| G1 Open Palm Drag | Left-click drag on empty space |
| G2 Index Point | Mouse hover over node |
| G3 Fist Grab | Left-click drag on node |
| G4 Single Pinch | Left-click / Enter key |
| G5 Two-Hand Pinch | Scroll wheel |
| G6 Horizontal Swipe | Right-click drag / Escape to reset filter |
| G7 Palm Halt | Spacebar (pause/freeze) |
| G8 Left-Hand Pinch (PTT) | Hold `V` key / click microphone icon |

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
Time 8ms   — Mouse/Keyboard state polled (parallel, no delay)
Time 9ms   — Distance Calculator runs:
              - Chest anchor estimation
              - Hand-to-chest distance
              - Sensitivity scale output
Time 10ms  — Input Merger resolves:
              - Spatial: gesture or mouse (last active wins)
              - Commands: voice/text (always processed)
Time 11ms  — Application Layer processes action:
              - Camera update (rotate/zoom from winner)
              - Selection update (raycast or click)
              - Agent status update (if task running)
Time 12ms  — 3d-force-graph physics step
Time 14ms  — Three.js renders frame
Time 15ms  — Hand overlay draws on Canvas 2D
Time 16ms  — Frame displayed
```

### Voice / Text Command Flow (async, never blocks rendering or spatial input)

```
User input (voice OR text)
    ↓
Command Router classifies:
    ├─ UI Command → Execute instantly (camera reset, undo, etc.)
    ├─ Graph Query → Cypher pipeline:
    │     Whisper/text → LLM → Cypher → Neo4j → Visual update
    └─ Agent Task → Agent pipeline:
          LLM → Plan → [Show plan in nebula]
                         ↓
                    User confirms (voice "confirm" / click / pinch)
                         ↓
                    Execute steps via Agent Executor
                    (OpenClaw / NemoClaw)
                         ↓
                    Each step: update task node in nebula
                    (pending → running → complete/failed)
                         ↓
                    Results → Neo4j (new entities)
                         ↓
                    Nebula refreshes with new nodes
                         ↓
                    TTS speaks summary to user
```

### Spatial Navigation During Agent Execution

The 3D nebula remains fully interactive while the agent works. The user can:
- Rotate, zoom, select nodes while a task runs
- Cancel the current task mid-execution ("stop")
- Start a new task before the current one finishes (queued)
- Inspect task nodes to see step details and outputs

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
| **OpenClaw / NemoClaw** | **Agent execution framework — tool calling, sandboxing** | **Building a safe agent executor from scratch is a major project** |

### Glue Code (Combine open-source pieces)

| Integration | What We Write |
|------------|--------------|
| MediaPipe → Camera Controller | Map hand (x,y) delta to spherical camera rotation (θ, φ) |
| MediaPipe → Three.js Raycaster | Convert 2D index-tip position to 3D ray direction |
| Whisper → Command Router → LLM | Chain: audio/text → classify → graph query OR agent task |
| LLM → Neo4j (Cypher) | Prompt → Cypher → validate → execute → visual mapping |
| LLM → Agent Executor | Plan → confirm → execute tools → results → Neo4j |
| Neo4j → Graph visual state | Map query results to node visibility/highlight/animation |
| Agent Executor → Neo4j | Extract entities from tool results → create nodes/edges |
| Event Bus | Central pub/sub for gesture, voice, mouse, keyboard, agent events |

### Custom Development (Our core IP)

| Module | Why It Can't Be Off-the-Shelf |
|--------|------------------------------|
| Gesture Classifier | No library classifies "open palm vs fist vs point" — we define the gestures |
| Body Distance Sensitivity | Novel interaction: chest-to-hand distance as sensitivity modulator |
| Hand Overlay Renderer | Custom visual feedback tailored to our gesture set and color scheme |
| Input Merging System | Multi-modal coexistence (gesture + mouse + voice + text) is unique to our system |
| AI Agent Core | Our context construction, plan visualization, nebula integration |
| Command Router (3-way) | Graph query vs agent task vs UI command classification |
| Safety/Confirmation UX | Spatial confirmation (pinch a pending node, voice "confirm") |

**Effort split:** ~55% open-source / ~20% glue code / ~25% custom core

---

## 8. Development Phases

### Phase 1: Static Nebula + Basic UI (Week 1)

**Goal:** A beautiful 3D scene with floating nodes and edges. Mouse AND keyboard fully functional from day one.

- [ ] Initialize project: Vite + vanilla JS (or React)
- [ ] Install Three.js + 3d-force-graph
- [ ] Generate 500 random nodes with random categories
- [ ] Connect nodes with random edges (probability-based)
- [ ] Apply category-based colors and connection-based sizing
- [ ] Add bloom post-processing for glow effect
- [ ] Mouse orbit controls (OrbitControls — permanent, not placeholder)
- [ ] Mouse: click to select node, scroll to zoom, drag to rotate
- [ ] Keyboard: Spacebar to pause, Escape to reset view
- [ ] Node hover → show label tooltip
- [ ] Node click → side panel with details
- [ ] Text input bar at bottom (always visible, submit on Enter)
- [ ] Agent Status Panel placeholder (top-right, empty for now)

**Deliverable:** A rotating, glowing sphere of connected data points. Mouse, keyboard, and text input all working.

---

### Phase 2: Neo4j + Graph Queries (Week 2)

**Goal:** Replace random data with a real graph database. Text commands query the graph.

- [ ] Install and configure Neo4j Community Edition locally (Docker Compose)
- [ ] Design schema (Entity nodes, RELATES_TO edges, Task nodes)
- [ ] Create seed data script (50-100 meaningful nodes)
- [ ] Build Neo4j → 3d-force-graph data adapter
- [ ] Implement data refresh on query result
- [ ] Text input → LLM (GPT-4o) → Cypher → Neo4j → visual update
- [ ] Cypher validator (block write operations)
- [ ] Visual feedback: highlight query results, dim others
- [ ] Keyboard shortcut `/` to focus text input bar

**Deliverable:** A live graph database rendered in 3D, queryable via text input.

---

### Phase 3: Hand Tracking + Gestures (Weeks 3-4)

**Goal:** Add gesture control alongside mouse (not replacing it).

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
- [ ] Build Input Merger (gesture + mouse coexistence, last-active-wins)
- [ ] Map gestures to camera controller (works alongside OrbitControls)
- [ ] Map gestures to selection manager (works alongside click)
- [ ] Add confidence filtering (threshold 0.75)
- [ ] Verify: mouse/keyboard remain fully functional when gestures are active
- [ ] Verify: all features work with webcam disabled/denied

**Deliverable:** Gesture + mouse coexisting. Either works at any time.

---

### Phase 4: Body Pose + Sensitivity (Week 4)

**Goal:** Add body awareness for natural sensitivity scaling.

- [ ] Integrate MediaPipe Pose (Lite model)
- [ ] Implement chest anchor calculation
- [ ] Build distance-to-sensitivity mapper (3 zones)
- [ ] Idle detection (gesture idle only — mouse/keyboard unaffected)
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
- [ ] Ensure overlay does not interfere with mouse click events (pointer-events: none)

**Deliverable:** A transparent hand hologram on screen with real-time gesture labels.

---

### Phase 6: Voice Commands (Weeks 5-6)

**Goal:** Speak commands to query the graph or control the UI.

- [ ] Implement push-to-talk via left-hand pinch (G8) AND keyboard key (V)
- [ ] Implement microphone icon button (mouse click to toggle recording)
- [ ] Integrate Whisper API for speech-to-text
- [ ] Build 3-way Command Router (UI command / graph query / agent task placeholder)
- [ ] Implement UI command shortcuts (reset, zoom, undo, stop, confirm, reject)
- [ ] Graph query: same as text input but from voice
- [ ] Agent task: log to console for now (placeholder for Phase 8)
- [ ] Loading indicator during async processing
- [ ] Audio feedback: subtle chime on command recognized
- [ ] TTS: Web Speech API for agent responses
- [ ] Verify: voice works simultaneously with gesture and mouse (no blocking)

**Deliverable:** "Show me connections to Project Alpha" works via voice, text, or both.

---

### Phase 7: Interaction Polish (Week 7)

**Goal:** Make all inputs work together seamlessly.

- [ ] Refine Input Merger with real-world usage edge cases
- [ ] Voice + Point gesture = targeted command (point at node, speak about it)
- [ ] Text + gesture = simultaneous (type while gesturing)
- [ ] Add node transition animations (GSAP)
- [ ] Particle background (nebula aesthetic)
- [ ] Performance optimization pass:
  - [ ] LOD: distant nodes → points
  - [ ] Frustum culling
  - [ ] Throttle MediaPipe to 30fps if GPU-bound
- [ ] Final UI polish: loading states, error messages, help overlay
- [ ] Keyboard shortcuts guide (? key)

**Deliverable:** A polished multi-modal 3D interface where all inputs coexist seamlessly.

---

### Phase 8: AI Agent Integration (Weeks 8-9)

**Goal:** Transform the system from a graph query tool into a full AI assistant.

- [ ] Design and implement AI Agent Core:
  - [ ] Context builder (selected nodes, visible graph, conversation history)
  - [ ] Task planner (LLM generates step-by-step plans in JSON)
  - [ ] Plan-to-nebula visualizer (task steps → pulsing nodes)
- [ ] Integrate Agent Executor framework:
  - [ ] Evaluate and choose: OpenClaw vs NemoClaw vs custom
  - [ ] Implement tool registry (file ops, web search, code execution, etc.)
  - [ ] Sandbox unsafe operations
- [ ] Implement safety/confirmation flow:
  - [ ] Dangerous actions → PENDING node in nebula (yellow pulse)
  - [ ] Confirm via: voice "confirm", click button, pinch on node
  - [ ] Reject via: voice "reject", click button, timeout 30s
  - [ ] Cancel running task: voice "stop" or Escape key
- [ ] Results → Neo4j integration:
  - [ ] Extract entities from tool results
  - [ ] Create new nodes/edges in graph
  - [ ] Nebula refreshes with new data
- [ ] Agent Status Panel:
  - [ ] Current task description
  - [ ] Step-by-step progress (checkboxes)
  - [ ] Output/error display
  - [ ] Confirm/Reject buttons
- [ ] Task history in Neo4j:
  - [ ] :Task nodes with OPERATED_ON / PRODUCED edges
  - [ ] User can explore past tasks in the nebula
- [ ] TTS: Agent speaks summaries and asks for confirmation
- [ ] Verify: nebula remains interactive during agent execution

**Deliverable:** "Research WebGPU trends and write a summary" → agent plans, confirms, executes, creates file, adds knowledge to graph.

---

### Phase 9: Agent Refinement + Full Polish (Weeks 9-10)

**Goal:** Production-quality assistant experience.

- [ ] Conversation memory: agent remembers past interactions via Neo4j
- [ ] Multi-step task queuing: start new tasks while one runs
- [ ] Error recovery: agent retries failed steps with modified approach
- [ ] Custom tool development: add project-specific tools
- [ ] User preferences: learn from confirmation/rejection patterns
- [ ] Performance: optimize LLM calls (caching, streaming)
- [ ] Onboarding: first-run tutorial (webcam permission, basic gestures, sample commands)
- [ ] Full end-to-end testing across all input modes

**Deliverable:** The complete Jarvis Nebula — an AI assistant you command through a 3D spatial interface.

---

## 9. Risk Matrix & Mitigations

| # | Risk | Probability | Impact | Mitigation |
|---|------|------------|--------|-----------|
| R1 | MediaPipe hand tracking jitters too much | Medium | High | EMA smoothing + gesture hold threshold (5 frames). Increase SMOOTHING to 0.85 if needed. Mouse always available as parallel input. |
| R2 | Two MediaPipe models (Hands + Pose) exceed frame budget | Medium | High | Profile early in Phase 4. Fallback: disable Pose, use fixed sensitivity. Mouse/keyboard performance unaffected. |
| R3 | 3D scene drops below 30fps at 5000+ nodes | Medium | Medium | LOD system: far nodes as GL_POINTS. Limit visible nodes to 2000. Cluster distant groups into meta-nodes. |
| R4 | LLM generates invalid Cypher | High | Low | Regex validator catches write ops. Invalid syntax → retry once with error. Show "I didn't understand" on second failure. |
| R5 | Whisper misrecognizes technical terms | Medium | Low | Text input always available as alternative. Show transcript before executing. Allow correction. |
| R6 | Webcam permission denied | Low | Medium | All features except gesture/pose work perfectly. Mouse + keyboard + text + voice (via keyboard) fully functional. No degraded experience. |
| R7 | Gesture + mouse conflict | Medium | Medium | Input Merger with 200ms debounce. Last-active-wins rule. Both can always be used for different purposes. |
| R8 | Neo4j setup complexity for end users | Low | Medium | Docker Compose for one-command setup. Demo mode with pre-loaded graph. |
| R9 | Agent executes unintended destructive action | Low | Critical | All dangerous actions require explicit confirmation. 30s timeout auto-rejects. Agent cannot bypass confirmation for dangerous=true steps. |
| R10 | Agent executor framework (OpenClaw/NemoClaw) unstable or insufficient | Medium | High | Abstract via adapter pattern. Tool registry is framework-agnostic. Can swap executor without changing Agent Core or UI. |
| R11 | LLM context window too small for complex plans | Medium | Medium | Summarize conversation history aggressively. Use Neo4j for persistent memory instead of stuffing everything into prompt. |

---

## 10. Future Enhancements

These are explicitly **NOT** in the MVP (Phases 1-9). Documented here for future reference only.

| Enhancement | Description | When to Add |
|-------------|-------------|-------------|
| **Eye Tracking** | MediaPipe Face Mesh iris landmarks → Zone-level gaze detection → passive node highlighting | After Phase 9, if users want "look to highlight" |
| **WebGazer.js** | ML-based pixel-level gaze estimation (requires calibration) | Only if Zone-level gaze proves insufficient |
| **Multi-user** | WebRTC + shared Neo4j → multiple people in the same nebula | V2.0 |
| **VR Mode** | WebXR integration — the nebula in a headset | V2.0 |
| **Data Import** | CSV, JSON, or API connectors to populate the graph automatically | After MVP, when real users need to load their own data |
| **Embedding-based Layout** | Use text embeddings to position nodes by semantic similarity | When graph exceeds 10,000 nodes |
| **Offline Voice** | Replace Whisper API with whisper.cpp (local WASM) | When latency is a complaint |
| **Custom Gestures** | Let users define their own gesture → action mappings | V2.0 |
| **Plugin System** | Third-party tool plugins for the Agent Executor | V2.0 |
| **Mobile Companion** | React Native app that connects to the same Neo4j + agent | V2.0 |
| **Proactive Agent** | Agent suggests actions based on graph changes, schedules, etc. | V2.0, after trust is established |

---

*Last updated: 2026-03-31*
