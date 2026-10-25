# GridPilot — Warehouse Robot Pathfinding Simulator

**A college DSA mini-project.** GridPilot is an interactive control-center-style dashboard where a robot must drive from its dock to a destination through warehouse shelves. You build the warehouse, pick a graph-search algorithm, and watch it explore the grid step by step — with live queue/stack telemetry, honest complexity notes, and a BFS-vs-DFS comparison.

> Simulation only — this is educational software for demonstrating Data Structures & Algorithms, not robot-control firmware.

---

## Features

- **Interactive warehouse grid** (8×8 up to 20×20, default 15×15) — draw/erase shelves by clicking or dragging, move the robot and destination, never able to bury a shelf on either endpoint.
- **Three algorithms, implemented from scratch** (no pathfinding libraries):
  - **BFS** — explicit FIFO queue (head-index based, O(1) dequeue), guaranteed shortest path in moves.
  - **DFS** — iterative with an explicit LIFO stack, deterministic neighbor order, returns a *valid but not necessarily shortest* path.
  - **Recursive backtracking** — mark/unmark route traversal with visible retreat events, restricted to 8×8 grids with a hard node limit.
- **Animation engine** — Start / Pause / Resume / Step, a 10-position speed slider (speed changeable while paused or running), and clean cancel/reset with no stale timers.
- **Algorithm insights panel** — nodes visited, path length, trace steps, measured compute time, time/space complexity, and a live "what is happening" narration.
- **Live data-structure visualization** — the BFS queue or DFS stack contents, step by step (front/top highlighted).
- **BFS vs DFS comparison** — both engines run instantly on the *same* immutable snapshot; path, moves, explored nodes, time and complexity are shown side by side.
- **Sample scenarios** — Easy Warehouse, Complex Warehouse, and Blocked Destination (a clean "No Path" demo).
- **Educational lab notes** — viva-oriented Q&A: grid-as-graph, queue vs stack, visited arrays, path reconstruction, complexities.
- **Edge cases handled** — start = destination, adjacent endpoints, unreachable targets, sealed destinations, narrow routes, dense layouts, repeated runs, algorithm switching, reset during animation.

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| UI | React 18 + Vite 5 | JavaScript only (JSX), no TypeScript |
| Styling | Plain CSS (single stylesheet, design tokens) | Fira Sans / Fira Code |
| Icons | lucide-react | the only runtime dependency |
| Algorithms | Pure JS modules under `src/algorithms` | zero DOM, zero React — fully unit-testable |
| Testing | Vitest | 72 automated tests (49 algorithm/unit + 23 interaction/React Testing Library) |
| Backend/DB | none | fully client-side |

## Installation & run

```bash
cd warehouse-robot
npm install        # install dependencies
npm run dev        # dev server → http://localhost:5173 (host 0.0.0.0, strict port)
npm test           # run the algorithm test suite (Vitest)
npm run build      # production build into dist/
npm run preview    # serve the production build on the same port
```

## Folder structure

```
warehouse-robot/
├── index.html                     # entry page (fonts, meta, favicon)
├── package.json
├── vite.config.js                 # dev/build/test config (port 5173 strict)
├── README.md                      # this file
├── ALGORITHMS.md                  # pseudocode, complexity analysis, DS choices
├── DEMO_GUIDE.md                  # demo scripts, viva Q&A, troubleshooting
├── REPORT_CONTENT.md              # content for the 5–6 page mini-project report
└── src/
    ├── main.jsx                   # React bootstrap
    ├── App.jsx                    # layout + all state wiring / editors
    ├── styles/app.css             # design tokens + full dashboard styling
    ├── algorithms/                # PURE engine — no framework code
    │   ├── gridUtils.js           # world model, snapshots, neighbor graph
    │   ├── bfs.js                 # BFS + path reconstruction
    │   ├── dfs.js                 # iterative DFS + path reconstruction
    │   ├── backtracking.js        # recursive route search (extension)
    │   ├── index.js               # registry + descriptions + runAlgorithm()
    │   └── structure/
    │       ├── Queue.js           # FIFO with head index (O(1) dequeue)
    │       └── Stack.js           # LIFO wrapper
    ├── animation/
    │   └── useSimulation.js       # playback controller (timers, cursor, speed)
    ├── scenarios/
    │   └── presets.js             # 3 sample warehouse layouts + grid sizes
    ├── utils/
    │   └── worldOps.js            # immutable editing ops (paint, move, resize…)
    ├── components/
    │   ├── Header.jsx             # brand, live algorithm + status, Clear Path
    │   ├── Sidebar.jsx            # algorithm, tools, playback, presets
    │   ├── WarehouseGrid.jsx      # grid + cell-state derivation + legend
    │   ├── InsightsPanel.jsx      # stats, narration, structure telemetry
    │   ├── ComparisonPanel.jsx    # BFS vs DFS on identical snapshot
    │   └── ErrorBoundary.jsx      # runtime error recovery boundary
    └── __tests__/                 # Vitest suites (algorithms, presets, utils)
```

## How the pieces fit

1. The UI holds an **editable world** (rows, cols, walls, endpoints). Every edit produces a **new immutable world** (`utils/worldOps.js`).
2. Pressing *Start* creates a **frozen snapshot** (`snapshotWorld`) and runs the selected pure algorithm on it. The algorithm never touches the UI world.
3. The algorithm returns a **structured result**: `found, path, visitedOrder, animationSteps, nodesVisited, pathMoves, elapsedTime, limitReached, message`.
4. `useSimulation` animates the `animationSteps` trace with a single timer per step (speed-controlled), exposing status/pause/resume/step/reset.
5. Components derive cell colors from `(result, cursor)` — nothing about the visualization is faked or hardcoded.

## Cell color legend

| Color | Meaning |
|---|---|
| Amber | Robot (start) / computed route |
| Green | Destination |
| Slate with shelf frame | Shelf / obstacle (wall) |
| Dim teal | Visited cell |
| Bright teal | Frontier (waiting in queue/stack) |
| Glowing teal | Current exploration cell |
| Grey (backtracking only) | Retracted (unmarked) dead-end cell |

## Licence / usage

Free, open-source packages only. Built for academic demonstration.
