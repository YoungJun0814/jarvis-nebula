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
11. [Implementation Readiness Specification](#11-implementation-readiness-specification)

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

The system is split into two layers connected via WebSocket:
- **Python Backend** — handles all computation: camera capture, hand/pose tracking, AI agent, speech recognition, file operations, and database access.
- **Browser Frontend** — handles all rendering: 3D nebula (Three.js), hand overlay (Canvas 2D), and UI panels.

This split is essential because the AI agent needs **local filesystem access** (file read/write, code execution, web scraping) which browsers cannot provide due to sandboxing.

```
┌─────────────────────────────────────────────────────────────────┐
│                   PYTHON BACKEND (FastAPI)                        │
│                                                                  │
│  ┌─────────────── INPUT CAPTURE ──────────────────────────┐     │
│  │                                                         │     │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────────────────┐ │     │
│  │  │ OpenCV   │ │ OpenCV   │ │ Microphone              │ │     │
│  │  │ Webcam   │ │ Webcam   │ │ + Whisper (local)       │ │     │
│  │  │    ↓     │ │    ↓     │ │ + faster-whisper        │ │     │
│  │  │MediaPipe │ │MediaPipe │ │   (offline STT)         │ │     │
│  │  │  Hands   │ │  Pose    │ │                         │ │     │
│  │  │(21 joint)│ │(33 joint)│ │                         │ │     │
│  │  └────┬─────┘ └────┬─────┘ └───────────┬─────────────┘ │     │
│  │       │            │                   │               │     │
│  └───────┼────────────┼───────────────────┼───────────────┘     │
│          │            │                   │                      │
│          ▼            ▼                   ▼                      │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │              INPUT PROCESSING LAYER (Python)             │     │
│  │                                                         │     │
│  │  Gesture Classifier ◄── Distance Calculator (Pose)     │     │
│  │  Voice Command Parser (Whisper → text)                  │     │
│  │                                                         │     │
│  │  Merge Rule: last active input wins for camera/select   │     │
│  │  Text input & voice: always available in parallel       │     │
│  └──────────────────────────┬──────────────────────────────┘     │
│                              │                                    │
│          ┌───────────────────┼───────────────────┐               │
│          │                   │                   │               │
│          ▼                   ▼                   ▼               │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │  Gesture     │  │  Command Router  │  │  Direct UI       │   │
│  │  Events      │  │                  │  │  Commands        │   │
│  │  (sent to    │  │  Classifies:     │  │  (sent to        │   │
│  │   browser)   │  │  - Graph query   │  │   browser)       │   │
│  │              │  │  - Agent task    │  │                  │   │
│  │              │  │  - UI command    │  │                  │   │
│  └──────┬───────┘  └────────┬─────────┘  └──────┬───────────┘   │
│         │                   │                    │               │
│         │        ┌──────────┴──────────┐         │               │
│         │        │                     │         │               │
│         │        ▼                     ▼         │               │
│         │ ┌─────────────┐  ┌──────────────────┐  │               │
│         │ │  Graph      │  │   AI AGENT CORE  │  │               │
│         │ │  Query      │  │   (Gemini API)   │  │               │
│         │ │ (Neo4j      │  │                  │  │               │
│         │ │  Cypher)    │  │  Intent Parser   │  │               │
│         │ │             │  │  Task Planner    │  │               │
│         │ └──────┬──────┘  │  Context Manager │  │               │
│         │        │         └────────┬─────────┘  │               │
│         │        │                  │             │               │
│         │        │                  ▼             │               │
│         │        │       ┌──────────────────┐    │               │
│         │        │       │  AGENT EXECUTOR  │    │               │
│         │        │       │  (Gemini Func    │    │               │
│         │        │       │   Calling +      │    │               │
│         │        │       │   Python Tools)  │    │               │
│         │        │       │                  │    │               │
│         │        │       │  ┌────────────┐  │    │               │
│         │        │       │  │ File Ops   │  │    │               │
│         │        │       │  │ Code Exec  │  │    │               │
│         │        │       │  │ Web Search │  │    │               │
│         │        │       │  │ API Calls  │  │    │               │
│         │        │       │  │ Data Pipe  │  │    │               │
│         │        │       │  └────────────┘  │    │               │
│         │        │       └────────┬─────────┘    │               │
│         │        │                │               │               │
│  ┌──────┴────────┴────────────────┴───────────────┴────────┐     │
│  │                     DATA LAYER                           │     │
│  │  ┌──────────────────────────────────────────────────┐   │     │
│  │  │                 Neo4j (Graph DB)                  │   │     │
│  │  │  Nodes: (:Entity {name, type, metadata})         │   │     │
│  │  │  Edges: [:RELATES_TO {weight, type}]             │   │     │
│  │  │  + Agent memory (task history, preferences)      │   │     │
│  │  └──────────────────────────────────────────────────┘   │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    WebSocket (ws://localhost:8000/ws)
                    JSON messages: landmarks, gestures,
                    commands, graph data, agent status
                           │
┌──────────────────────────┴──────────────────────────────────────┐
│                   BROWSER FRONTEND (Vite + JS)                   │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                  3D RENDERING ENGINE                        │  │
│  │  Three.js + 3d-force-graph + Post-processing               │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  Hand Overlay (Canvas 2D) — skeleton, laser, state labels  │  │
│  │  (receives landmark data from Python via WebSocket)        │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  Agent Status Panel — current task, progress, plan display │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │  Text Input Bar — always visible, type commands anytime    │  │
│  │  Mouse / Keyboard — always active, first-class input       │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

### Backend (Python)

| Layer | Technology | Role | License |
|-------|-----------|------|---------|
| **Web Server** | FastAPI | REST API + WebSocket server | MIT |
| **WebSocket** | websockets (via FastAPI) | Real-time bidirectional communication with browser | MIT |
| **Camera Capture** | OpenCV (cv2) | Webcam frame capture and preprocessing | Apache 2.0 |
| **Hand Tracking** | MediaPipe (Python) HandLandmarker | 21 hand joint 3D coordinates per hand | Apache 2.0 |
| **Body Pose** | MediaPipe (Python) PoseLandmarker | 33 body landmarks (chest distance calc) | Apache 2.0 |
| **Voice-to-Text** | faster-whisper (local) | Offline speech recognition, no internet needed | MIT |
| **LLM (Brain)** | Gemini API (google-generativeai) | Intent parsing, task planning, Cypher gen, function calling | API (free tier via Google Pro) |
| **Agent Executor** | Custom Python + Gemini Function Calling | Execute real-world actions (file, code, web, API) on local system | Custom |
| **Graph Database** | Neo4j Community (neo4j Python driver) | Node/edge storage, Cypher queries, agent memory | GPL v3 (Community) |
| **Text-to-Speech** | pyttsx3 or edge-tts | Agent speaks responses back to user (offline capable) | MIT |

### Frontend (Browser — JavaScript)

| Layer | Technology | Role | License |
|-------|-----------|------|---------|
| **3D Rendering** | Three.js | WebGL scene, camera, lighting, meshes | MIT |
| **Graph Physics** | 3d-force-graph | Force-directed layout, node/edge rendering | MIT |
| **Post-processing** | three/postprocessing | Bloom, glow effects (nebula aesthetic) | MIT |
| **Animation** | tween.js | Smooth camera transitions, node animations | MIT |
| **Frontend** | Vanilla JS | UI shell, event bus, state management | — |
| **Build Tool** | Vite | Fast dev server, HMR, bundling | MIT |
| **WebSocket Client** | Native WebSocket API | Receive landmarks, send commands to Python backend | Built-in |

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

**Purpose:** Track hands via webcam (Python backend) and classify gestures into discrete actions. Landmark data is sent to the browser via WebSocket. Coexists with mouse — both are always active.

**Open-source handles:**
- Hand detection and 21-landmark extraction (MediaPipe Python — HandLandmarker)
- Runs on the Python backend using OpenCV for camera capture

**Custom development — Gesture Classifier (Python):**

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

```python
# Finger extension detection (Python — runs on backend)
def is_finger_extended(landmarks, finger: str) -> bool:
    tip = landmarks[FINGER_TIPS[finger]]
    pip = landmarks[FINGER_PIPS[finger]]

    if finger == 'thumb':
        return abs(tip.x - landmarks[0].x) > abs(pip.x - landmarks[0].x)
    return tip.y < pip.y  # In screen coords, y increases downward
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

```python
# Exponential Moving Average (EMA) for position smoothing
SMOOTHING = 0.7
smoothed.x = SMOOTHING * smoothed.x + (1 - SMOOTHING) * raw.x
smoothed.y = SMOOTHING * smoothed.y + (1 - SMOOTHING) * raw.y
smoothed.z = SMOOTHING * smoothed.z + (1 - SMOOTHING) * raw.z
```

```python
# Gesture state machine — prevents flickering
GESTURE_HOLD_FRAMES = 5
GESTURE_RELEASE_FRAMES = 8
# States: IDLE → PENDING → ACTIVE → RELEASING → IDLE
```

#### Confidence Filtering

```python
if hand.score < 0.75:
    continue  # Skip this frame, keep last known state
    # Mouse/keyboard remain fully functional during low-confidence frames
```

---

### 4.3 Body Pose & Distance Sensing

**Purpose:** Use chest (pit of stomach) as an anchor point. The distance from chest to hand modulates gesture sensitivity.

**Open-source handles:**
- 33 upper-body landmarks (MediaPipe Python — PoseLandmarker)
- Runs alongside HandLandmarker on the Python backend, sharing the same OpenCV webcam feed

**Custom development — Distance Calculator (Python):**

#### Chest Anchor Estimation

```python
LEFT_SHOULDER = 11
RIGHT_SHOULDER = 12
LEFT_HIP = 23
RIGHT_HIP = 24

def get_chest_anchor(pose_landmarks):
    shoulder_center = midpoint(
        pose_landmarks[LEFT_SHOULDER],
        pose_landmarks[RIGHT_SHOULDER]
    )
    hip_center = midpoint(
        pose_landmarks[LEFT_HIP],
        pose_landmarks[RIGHT_HIP]
    )
    # Chest ≈ 30% down from shoulders toward hips
    return lerp(shoulder_center, hip_center, 0.3)
```

#### Distance-to-Sensitivity Mapping

```python
def get_sensitivity_scale(hand_position, chest_anchor, shoulder_width):
    distance = euclidean_distance(hand_position, chest_anchor)
    normalized_dist = distance / shoulder_width

    if normalized_dist < 0.5: return 0.3   # CLOSE — precision mode
    if normalized_dist < 1.2: return 1.0   # NORMAL — standard
    return 2.5                              # FAR — fast mode
```

#### Idle Detection

```python
# Both hands close to chest + stationary for 2 seconds = gesture IDLE
# Mouse/keyboard remain fully active during gesture idle state
if both_hands_near_chest and hand_velocity < IDLE_THRESHOLD and idle_duration > 2.0:
    gesture_state = 'IDLE'  # Only gesture input paused, not other inputs
```

#### Performance Note

MediaPipe Pose (Lite model) adds ~5-8ms per frame on the Python backend. If combined MediaPipe processing exceeds 25ms/frame, disable Pose and use fixed gesture sensitivity. Mouse/keyboard in the browser are completely unaffected by backend performance.

---

### 4.4 Hand Overlay (Visual Feedback)

**Purpose:** Show a transparent hand skeleton on screen so the user knows exactly where their hand is being tracked, what gesture is recognized, and where they're pointing.

**Data flow:** Python backend sends landmark coordinates + gesture state via WebSocket → Browser draws overlay.

**Custom development (browser-side rendering, data from Python):**

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
- Speech-to-text: **faster-whisper** (runs locally on Python backend, no internet needed)
- Natural language understanding: **Gemini API** (google-generativeai Python SDK)
- Cypher query execution: **neo4j** Python driver

**Custom development (Python backend):**

#### Input Methods (All Always Available)

| Method | Activation | Use Case |
|--------|-----------|----------|
| **Voice (Push-to-Talk)** | Left-hand pinch gesture (G8) | Hands-free commanding while manipulating nebula |
| **Voice (Wake Word)** | "Hey Nebula" (custom keyword spotter) | When hands are not tracked |
| **Text Input Bar** | Click or keyboard shortcut (/) in browser | Precise commands, code snippets, long queries |
| **Text + Keyboard** | Always focused when typing | Traditional input, copy-paste, editing |

#### Three-Way Command Classification

The Command Router must now classify into **three** categories, not two:

```python
def route_command(transcript: str) -> dict:
    normalized = transcript.lower().strip()

    # 1. UI Commands — instant, no LLM needed
    ui_action = match_ui_command(normalized)
    if ui_action:
        return {'type': 'ui', 'action': ui_action}

    # 2. Graph Queries — "show me", "find", "connect", "path between"
    #    Keywords that imply data lookup, not action
    if is_graph_query(normalized):
        return {'type': 'graph', 'query': normalized}

    # 3. Agent Tasks — everything else (the default)
    #    "Write a report on...", "Send an email to...",
    #    "Analyze this data...", "Create a file..."
    return {'type': 'agent', 'task': normalized}

UI_COMMANDS = {
    'reset': 'camera_reset',
    'zoom out': 'camera_zoom_out',
    'zoom in': 'camera_zoom_in',
    'show all': 'graph_show_all',
    'undo': 'state_undo',
    'help': 'show_help',
    'stop': 'agent_cancel',
    'confirm': 'agent_confirm',
    'reject': 'agent_reject',
}

GRAPH_KEYWORDS = [
    'show me', 'find', 'connections to', 'path between',
    'related to', 'linked to', 'top connected', 'filter',
    'how many', 'list all', 'nodes of type'
]

def is_graph_query(text: str) -> bool:
    return any(kw in text for kw in GRAPH_KEYWORDS)
```

#### Graph Query Pipeline (same as before)

```python
async def handle_graph_query(user_query: str):
    cypher = await generate_cypher_from_llm(user_query)
    validate_cypher(cypher)  # Block write operations
    results = neo4j_driver.run(cypher)
    return map_results_to_visuals(results)
```

#### Agent Task Pipeline

```python
async def handle_agent_task(user_task: str):
    # 1. AI Agent Core parses intent and creates a plan
    plan = await agent_core.plan_task(user_task)

    # 2. Send plan to browser via WebSocket for display in nebula
    await ws.send_json({'type': 'plan', 'data': plan})

    # 3. Wait for user confirmation (voice "confirm" or click in browser)
    if plan['requires_confirmation']:
        await wait_for_user_confirmation()

    # 4. Execute via Gemini Function Calling + Python tools
    for step in plan['steps']:
        await ws.send_json({'type': 'task_update', 'id': step['id'], 'status': 'running'})
        result = await agent_executor.execute(step)
        status = 'complete' if result['success'] else 'failed'
        await ws.send_json({'type': 'task_update', 'id': step['id'], 'status': status})

        # Feed results back into Neo4j as new knowledge
        if result.get('new_entities'):
            await neo4j_ingest_entities(result['new_entities'])
            await ws.send_json({'type': 'graph_refresh'})

    # 5. Speak summary back to user (via Python TTS)
    tts.speak(plan['summary'])
```

#### LLM → Cypher Pipeline (Gemini API)

```python
import google.generativeai as genai
import re

genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-2.0-flash')

async def generate_cypher_from_llm(user_query: str) -> str:
    system_prompt = """
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
    """

    response = model.generate_content(f"{system_prompt}\n\nUser: {user_query}")
    cypher = extract_cypher_from_response(response.text)

    if re.search(r'\b(DELETE|DETACH|CREATE|SET|MERGE|REMOVE)\b', cypher, re.IGNORECASE):
        raise ValueError('Write operations are not allowed via voice/text query')

    return cypher
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
- Python driver (`neo4j` package)

**Custom development (Python backend → WebSocket → Browser):**

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

#### Data Sync: Neo4j → WebSocket → 3d-force-graph

```python
# Python backend loads graph and sends to browser via WebSocket
from neo4j import GraphDatabase

driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "jarvis-nebula"))

async def load_graph_data() -> dict:
    with driver.session() as session:
        result = session.run("""
            MATCH (n)
            WHERE n:Entity OR n:Task
            OPTIONAL MATCH (n)-[r]-(m)
            RETURN n, r, m
        """)

        nodes = []
        links = []
        node_map = {}

        for record in result:
            n = record['n']
            node_id = str(n.element_id)
            if node_id not in node_map:
                node_map[node_id] = {
                    'id': node_id,
                    'name': n.get('name', n.get('command', '')),
                    'type': n.get('type', n.get('status', 'default')),
                    'connections': 0
                }
            # ... build links array

    return {'nodes': list(node_map.values()), 'links': links}

# Send to browser via WebSocket
await ws.send_json({'type': 'graph_data', 'data': await load_graph_data()})
```

#### Caching Strategy

- **Startup:** Load entire graph into memory (for graphs < 10,000 nodes)
- **Voice/text queries:** Cache last 10 query results (LRU)
- **Agent updates:** Immediate push to graph on task completion (no polling)
- **Agent context:** Last 20 tasks + their connected entities kept in hot cache for LLM context

---

### 4.7 Input Merging System

**Purpose:** Allow all input methods (gesture, mouse, keyboard, voice, text) to work simultaneously without conflict. There is NO fallback mode — all inputs are first-class citizens at all times.

**Split architecture:**
- **Gesture data** arrives from Python backend via WebSocket (hand landmarks + classified gesture)
- **Mouse/keyboard** handled natively in the browser (no backend involvement)
- **Voice/text commands** sent to Python backend via WebSocket for processing

**Custom development (browser-side merging, data from both sources):**

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
- LLM inference: **Gemini API** (google-generativeai Python SDK, with function calling)
- Prompt management: Custom Python (no framework needed)

**Custom development (Python backend):**

#### Responsibilities

1. **Intent Parsing** — Understand what the user wants from natural language
2. **Context Management** — Track conversation history, selected nodes, recent tasks
3. **Task Planning** — Break complex requests into executable steps
4. **Plan Visualization** — Convert plans into nebula node structures
5. **Result Integration** — Feed task results back into Neo4j as new knowledge

#### Context Window Construction

The Agent Core builds a rich context for every LLM call:

```python
def build_agent_context(user_command: str, browser_state: dict) -> dict:
    """Build rich context for every Gemini API call."""
    return {
        # What the user said
        'command': user_command,

        # What the user is looking at (received from browser via WebSocket)
        'selected_nodes': browser_state.get('selected_nodes', []),
        'visible_nodes': browser_state.get('visible_node_summary', []),
        'recent_interactions': browser_state.get('recent_interactions', []),

        # Conversation history
        'recent_messages': conversation_history[-20:],

        # Agent memory from Neo4j
        'recent_tasks': neo4j_run(
            'MATCH (t:Task) RETURN t ORDER BY t.created_at DESC LIMIT 10'
        ),

        # Graph schema summary
        'entity_types': neo4j_run(
            'MATCH (n:Entity) RETURN DISTINCT n.type, count(n)'
        ),

        # System context
        'system_context': {
            'time': datetime.now().isoformat(),
            'user_name': config['user_name']
        }
    }
```

#### Task Planning (Gemini API)

```python
import google.generativeai as genai

model = genai.GenerativeModel('gemini-2.0-flash')

async def plan_task(user_command: str, browser_state: dict) -> dict:
    context = build_agent_context(user_command, browser_state)

    system_prompt = """
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
    """

    response = model.generate_content(
        f"{system_prompt}\n\nContext: {json.dumps(context)}\n\nUser: {user_command}"
    )
    return json.loads(response.text)
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

### 4.9 Agent Executor (Tool Use — Gemini Function Calling)

**Purpose:** Execute real-world actions on behalf of the AI agent. This is the "hands" of Jarvis — the part that actually does things on the local system.

**Architecture:** Uses **Gemini API's native Function Calling** feature. Gemini decides which tool to call, Python executes it locally. No external agent framework needed.

**Custom development (Python backend):**
- Tool registry with Gemini function declarations
- Agentic loop (Gemini calls tool → Python executes → result fed back → repeat)
- Safety layer (confirmation for dangerous actions)
- Result formatting for nebula integration

#### Tool Registry (Python + Gemini Function Declarations)

```python
import os
import subprocess
import requests

# === TOOL IMPLEMENTATIONS (Python — full local system access!) ===

async def file_read(path: str) -> str:
    """Read contents of a local file."""
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

async def file_write(path: str, content: str) -> str:
    """Write content to a local file."""
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    return f"Written {len(content)} bytes to {path}"

async def file_list(directory: str, pattern: str = '*') -> list:
    """List files in a directory."""
    from pathlib import Path
    return [str(p) for p in Path(directory).glob(pattern)]

async def code_run(language: str, code: str) -> str:
    """Execute code in a subprocess."""
    result = subprocess.run(
        ['python', '-c', code] if language == 'python' else [language, '-e', code],
        capture_output=True, text=True, timeout=30
    )
    return result.stdout + result.stderr

async def web_search(query: str) -> str:
    """Search the web for information."""
    # Use a search API or scraping
    resp = requests.get(f"https://api.duckduckgo.com/?q={query}&format=json")
    return resp.text

async def web_fetch(url: str) -> str:
    """Fetch content from a URL."""
    resp = requests.get(url, timeout=10)
    return resp.text[:5000]  # Limit response size

async def graph_create_node(name: str, type: str, metadata: dict = None) -> str:
    """Create a new entity node in Neo4j."""
    neo4j_run(
        "CREATE (n:Entity {name: $name, type: $type, metadata: $metadata})",
        name=name, type=type, metadata=metadata or {}
    )
    return f"Created node: {name} ({type})"

async def graph_create_edge(from_name: str, to_name: str, rel_type: str, weight: float = 1.0) -> str:
    """Create a relationship between two nodes."""
    neo4j_run("""
        MATCH (a:Entity {name: $from_name}), (b:Entity {name: $to_name})
        CREATE (a)-[:RELATES_TO {type: $rel_type, weight: $weight}]->(b)
    """, from_name=from_name, to_name=to_name, rel_type=rel_type, weight=weight)
    return f"Created edge: {from_name} -[{rel_type}]-> {to_name}"

# === TOOL REGISTRY (maps names to functions + danger flags) ===

TOOL_REGISTRY = {
    'file_read':         {'fn': file_read,         'dangerous': False},
    'file_write':        {'fn': file_write,        'dangerous': True},
    'file_list':         {'fn': file_list,         'dangerous': False},
    'code_run':          {'fn': code_run,          'dangerous': True},
    'web_search':        {'fn': web_search,        'dangerous': False},
    'web_fetch':         {'fn': web_fetch,         'dangerous': False},
    'graph_create_node': {'fn': graph_create_node, 'dangerous': False},
    'graph_create_edge': {'fn': graph_create_edge, 'dangerous': False},
}
```

#### Gemini Function Calling — Agentic Loop

```python
import google.generativeai as genai

# Define tools as Gemini function declarations
GEMINI_TOOLS = [
    genai.protos.Tool(function_declarations=[
        genai.protos.FunctionDeclaration(
            name="file_read",
            description="Read contents of a local file",
            parameters={"type": "OBJECT", "properties": {
                "path": {"type": "STRING", "description": "File path to read"}
            }, "required": ["path"]}
        ),
        genai.protos.FunctionDeclaration(
            name="file_write",
            description="Write content to a local file",
            parameters={"type": "OBJECT", "properties": {
                "path": {"type": "STRING"},
                "content": {"type": "STRING"}
            }, "required": ["path", "content"]}
        ),
        # ... (all other tools defined similarly)
    ])
]

model = genai.GenerativeModel('gemini-2.0-flash', tools=GEMINI_TOOLS)

async def run_agent_loop(user_command: str, context: dict) -> dict:
    """The core agentic loop: Gemini decides tools → Python executes → repeat."""
    chat = model.start_chat()
    prompt = f"Context: {json.dumps(context)}\n\nUser command: {user_command}"
    response = chat.send_message(prompt)

    results = []

    # Loop until Gemini returns final text (no more tool calls)
    while response.candidates[0].content.parts:
        part = response.candidates[0].content.parts[0]

        # If Gemini wants to call a function
        if hasattr(part, 'function_call') and part.function_call:
            call = part.function_call
            tool_name = call.name
            tool_args = dict(call.args)

            tool_info = TOOL_REGISTRY.get(tool_name)
            if not tool_info:
                raise ValueError(f"Unknown tool: {tool_name}")

            # Safety check: dangerous actions need user confirmation
            if tool_info['dangerous']:
                await ws.send_json({
                    'type': 'confirm_request',
                    'tool': tool_name,
                    'args': tool_args
                })
                confirmed = await wait_for_user_confirmation()
                if not confirmed:
                    # Tell Gemini the action was rejected
                    response = chat.send_message(
                        genai.protos.Content(parts=[
                            genai.protos.Part(function_response=genai.protos.FunctionResponse(
                                name=tool_name,
                                response={"result": "USER REJECTED this action"}
                            ))
                        ])
                    )
                    continue

            # Execute the tool!
            result = await tool_info['fn'](**tool_args)
            results.append({'tool': tool_name, 'result': result})

            # Send result back to Gemini for next step
            response = chat.send_message(
                genai.protos.Content(parts=[
                    genai.protos.Part(function_response=genai.protos.FunctionResponse(
                        name=tool_name,
                        response={"result": str(result)}
                    ))
                ])
            )
        else:
            # Gemini returned final text — agent loop is done
            break

    final_text = response.text
    return {
        'success': True,
        'summary': final_text,
        'tool_results': results
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

### Frame-by-Frame Processing (Split Architecture)

```
=== PYTHON BACKEND (runs independently at ~30 FPS) ===

Time 0ms   — OpenCV captures webcam frame
Time 3ms   — MediaPipe HandLandmarker processes → 21 landmarks (per hand)
Time 6ms   — MediaPipe PoseLandmarker processes → 33 landmarks
Time 8ms   — Gesture Classifier runs:
              - Finger extension detection
              - Gesture state machine update
              - Smoothing (EMA)
Time 9ms   — Distance Calculator runs:
              - Chest anchor estimation
              - Hand-to-chest distance
              - Sensitivity scale output
Time 10ms  — WebSocket SEND to browser:
              {landmarks, gesture, sensitivity, voice_text}

=== BROWSER FRONTEND (runs at 60 FPS via requestAnimationFrame) ===

Time 0ms   — Receive latest WebSocket data (landmarks, gesture)
Time 0ms   — Mouse/Keyboard state polled (local, no delay)
Time 1ms   — Input Merger resolves:
              - Spatial: gesture (from WS) or mouse (local) — last active wins
              - Commands: voice/text → send to Python via WebSocket
Time 2ms   — Application Layer processes action:
              - Camera update (rotate/zoom from winner)
              - Selection update (raycast or click)
              - Agent status update (if task running)
Time 3ms   — 3d-force-graph physics step
Time 12ms  — Three.js renders frame
Time 14ms  — Hand overlay draws on Canvas 2D (using WS landmarks)
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

## 11. Implementation Readiness Specification

This section is the authoritative implementation baseline. If any earlier section offers multiple options or contains outdated wording, this section wins.

### 11.1 Locked Product And Technical Decisions

- **Language policy:** All user-facing UI, prompts, labels, help text, speech output, sample data, and documentation are English-only.
- **Frontend framework:** MVP uses **Vite + Vanilla JavaScript (ES modules)**. Do not use React for the initial build.
- **Backend framework:** MVP uses **Python + FastAPI** for REST, WebSocket, orchestration, hardware access, and AI integration.
- **LLM boundary:** Gemini is called **only from the Python backend**. The browser must never call Gemini directly.
- **Secret handling:** The Gemini key must live in a **server-side** environment variable named `GEMINI_API_KEY`. `VITE_GEMINI_API_KEY` is explicitly disallowed because it would expose the key to the client bundle.
- **Speech stack:** Use **faster-whisper** for STT, **edge-tts** as the primary TTS engine, and `pyttsx3` only as a fallback.
- **Graph database:** Use **Neo4j Community** via Docker Compose for local development.
- **Primary development platform:** Windows desktop development is first-class. Browser target is current Chrome on desktop.
- **Scope rule:** Build the MVP in phase order. No future-enhancement work is allowed before Phase 9 is complete.

### 11.2 Authoritative MVP Scope

The MVP includes:

- 3D nebula rendering with mouse and keyboard support
- FastAPI backend with WebSocket connection to the browser
- Neo4j-backed graph querying and visual refresh
- Gesture tracking with graceful fallback when webcam access is unavailable
- Voice command input in English
- Agent planning and controlled tool execution with explicit confirmation for dangerous actions
- Task history written back into the graph

The MVP excludes:

- Multi-user collaboration
- VR or AR mode
- Mobile companion apps
- Plugin marketplace or third-party plugin loading
- Eye tracking
- Semantic embedding-based layout
- Autonomous background actions without user initiation

### 11.3 Repository Layout

The repository should be created with this structure:

```text
/
  frontend/
    index.html
    src/
      main.js
      app/
      render/
      graph/
      input/
      overlay/
      ui/
      state/
      services/
      utils/
    public/
  backend/
    app/
      main.py
      api/
      ws/
      core/
      graph/
      tracking/
      gestures/
      voice/
      agent/
      tools/
      models/
      services/
    tests/
  infra/
    docker-compose.yml
    neo4j/
      seed/
  docs/
  scripts/
```

Ownership boundaries:

- `frontend/` owns rendering, browser input, overlay drawing, local UI state, and WebSocket client logic.
- `backend/` owns AI orchestration, hardware capture, gesture classification, voice processing, graph access, and tool execution.
- `infra/` owns local services such as Neo4j and seed data bootstrap.
- `docs/` owns specifications, architecture notes, and operational runbooks.

### 11.4 Runtime Requirements

Use these versions unless a compatibility issue forces a change:

- Node.js 20 LTS
- npm 10+
- Python 3.11
- Docker Desktop with Compose v2
- Neo4j 5.x Community
- Google Gemini API via the official Python SDK

### 11.5 Environment Variables

The implementation should standardize on the following variables:

| Variable | Scope | Required | Notes |
|----------|-------|----------|-------|
| `GEMINI_API_KEY` | backend | Yes | Server-only secret. Never expose to the browser. |
| `NEO4J_URI` | backend | Yes | Example: `bolt://localhost:7687` |
| `NEO4J_USERNAME` | backend | Yes | Usually `neo4j` for local development |
| `NEO4J_PASSWORD` | backend | Yes | Local development password |
| `APP_NAME` | backend | No | Human-readable app name for logs and status |
| `VITE_WS_URL` | frontend | No | Optional explicit WebSocket endpoint for non-default setups |
| `EDGE_TTS_VOICE` | backend | No | Default English voice for TTS |
| `LOG_LEVEL` | backend | No | Default `INFO` |

Implementation rules:

- All secrets stay in backend-only env vars.
- Frontend env vars must use the `VITE_` prefix only when they are safe to expose publicly.
- `.env.example` must be aligned to this table before coding begins.

### 11.6 Public API Surface

The backend must expose:

- `GET /api/health`
  - Returns service health, Neo4j availability, and model readiness.
- `GET /api/config/public`
  - Returns non-secret runtime configuration needed by the frontend.
- `POST /api/graph/query`
  - Accepts validated graph query requests from text or voice pipelines.
- `POST /api/agent/command`
  - Accepts agent task requests initiated from the frontend.
- `WS /ws`
  - Bi-directional real-time channel for input frames, browser state, graph updates, agent status, and confirmations.

These endpoints are implementation targets even if some of them are initially stubbed in early phases.

### 11.7 WebSocket Contract

Every WebSocket message must use this envelope:

```json
{
  "type": "message_type",
  "ts": "2026-04-08T12:00:00Z",
  "payload": {}
}
```

Client-to-server messages:

- `client_ready`
- `browser_state`
- `text_command`
- `voice_control`
- `ui_action`
- `agent_confirmation`
- `task_cancel`

Server-to-client messages:

- `graph_snapshot`
- `graph_patch`
- `input_frame`
- `gesture_event`
- `agent_plan`
- `agent_step`
- `agent_confirmation_request`
- `agent_result`
- `system_status`
- `error`

Minimum payload expectations:

- `browser_state` includes selected node IDs, visible node IDs, camera pose, and the current input focus state.
- `input_frame` includes hand landmarks, pose landmarks when available, gesture state, confidence, and sensitivity.
- `agent_plan` includes a stable task ID, ordered steps, and a danger flag per step.
- `agent_confirmation_request` includes the task ID, step ID, human-readable summary, timeout, and allowed confirmation methods.
- `graph_snapshot` includes the full node-link graph for initial load.
- `graph_patch` includes node and edge additions, updates, and removals without forcing a full refresh.

### 11.8 Graph Data Model

The authoritative graph labels are:

- `:Entity`
- `:Task`
- `:Session`

The authoritative relationship types are:

- `:RELATES_TO`
- `:OPERATED_ON`
- `:PRODUCED`
- `:MENTIONED_IN`
- `:PART_OF`

Required node properties:

- `Entity`
  - `id`, `name`, `type`, `metadata`, `created_at`, `updated_at`
- `Task`
  - `id`, `command`, `status`, `plan_json`, `result_summary`, `dangerous`, `created_at`, `updated_at`
- `Session`
  - `id`, `started_at`, `ended_at`, `metadata`

Required constraints:

```cypher
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (n:Entity) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT task_id IF NOT EXISTS FOR (n:Task) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT session_id IF NOT EXISTS FOR (n:Session) REQUIRE n.id IS UNIQUE;
```

Rules:

- Browser rendering IDs must map directly to graph IDs.
- Graph queries from natural language are read-only unless the request is routed through the agent execution path.
- Agent-created graph writes must be explicit and traceable to a `Task`.

### 11.9 Safety And Execution Rules

Non-negotiable safety rules:

- Dangerous actions always require explicit confirmation.
- Dangerous actions include file write, file delete, shell execution, code execution, external communication, and any irreversible graph mutation.
- Confirmation timeout defaults to 30 seconds and rejects by default.
- The backend tool layer must operate on an allowlisted workspace root when touching local files.
- Secrets, raw API keys, and credential-bearing URLs must never be sent to the browser, voice output, or logs.
- A failed tool step cannot silently continue as success. Every failure updates task state and is surfaced to the UI.

### 11.10 Testing Strategy

Testing is mandatory from the first implementation phase onward.

- Frontend unit tests: **Vitest**
- Backend unit and integration tests: **pytest**
- End-to-end browser tests: **Playwright**
- Manual hardware validation: webcam, microphone, gesture fallback, and voice pipeline checks

Required test gates:

- Phase 1-2: smoke tests for app boot, WebSocket connection, and graph rendering
- Phase 3-5: deterministic gesture-classifier tests using recorded landmark fixtures
- Phase 6: transcript and command-router tests for English voice commands
- Phase 8-9: agent safety tests covering confirm, reject, cancel, timeout, and tool failure propagation

### 11.11 Phase Gates And Exit Criteria

No phase is complete until its exit criteria are met.

- **Phase 1 exit:** browser app boots locally, renders a stable 3D demo graph, supports mouse orbit/select/zoom, shows an always-visible English text input, and maintains interactive performance at 500 demo nodes.
- **Phase 2 exit:** Neo4j runs locally through Docker Compose, graph data loads from the database, text queries update the view, and write operations are blocked from the graph query path.
- **Phase 3 exit:** gestures can rotate, point, drag, confirm, and zoom; webcam denial leaves mouse and keyboard fully functional.
- **Phase 4 exit:** distance-based sensitivity works and cleanly disables itself when pose tracking drops below the frame budget.
- **Phase 5 exit:** the hand overlay is visually stable, non-blocking, and accurately mirrors gesture state.
- **Phase 6 exit:** English voice commands work for UI actions and graph queries, and do not block other interaction channels.
- **Phase 7 exit:** concurrent input combinations behave predictably under manual testing and no longer show priority conflicts.
- **Phase 8 exit:** the agent can plan, request confirmation, execute safe and dangerous tools correctly, and write task outcomes back to Neo4j.
- **Phase 9 exit:** memory, queueing, retry behavior, onboarding, and end-to-end tests are in place for a stable MVP.

### 11.12 Execution Order Before Feature Work

Before Phase 1 implementation starts, complete this setup sequence:

1. Align `PROJECT_PLAN.md` and `.env.example` to the locked decisions in this section.
2. Create the repository layout exactly as specified.
3. Add backend and frontend dependency manifests.
4. Add Docker Compose for Neo4j.
5. Add formatter, linter, and test runner configuration.
6. Add a minimal `README.md` with local startup instructions.
7. Only then begin Phase 1 feature work.

### 11.13 Definition Of Done For Planning

Planning is considered complete when all of the following are true:

- There is exactly one authoritative answer for each major architecture choice.
- Secrets and trust boundaries are clearly defined.
- The repo layout is fixed.
- Data contracts are written down.
- Each phase has measurable exit criteria.
- The MVP scope is frozen against feature creep.

At that point, implementation can begin without re-deciding core architecture.

---

*Last updated: 2026-04-08*
