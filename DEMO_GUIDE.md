# Demo Guide — GridPilot

Step-by-step scripts for the DSA lab demonstration, expected outputs, viva questions and troubleshooting.

**Start the app:** `npm run dev` → open <http://localhost:5173>

Layout orientation: left = controls, center = warehouse grid (rows and columns are numbered starting at 1), right = insights, comparison and lab notes.

Cell colors: **amber = robot / route**, **green = destination**, **slate textured = shelves**, **dim teal = visited**, **bright teal = frontier**, **glowing teal = current cell**, **grey = backtracked cells** (backtracking mode only).

---

## Scenario 1 — Easy Warehouse: BFS guarantees the shortest route

1. Click **presets → Easy Warehouse** in the sidebar.
2. Keep **BFS** selected (default). Press **Start**.
3. Watch the teal wave expand ring-by-ring; the amber route appears when playback finishes.
4. Read the right panel: *Path Found*, path length, nodes visited, `O(V + E)` complexity, and an empty-queue -> "Route rebuilt from parent links" narration at the end.

**Expected output**
- Status: **Path Found** with a green strip in the insights panel.
- BFS takes the fewest possible moves (it hugs the open corridor; the visited wave is round and disciplined).
- The queue visualization at the bottom right shows the FIFO contents growing and draining, front cell highlighted.

**Talking point:** BFS explores in "distance rings". The first dequeue of the destination therefore carries the minimum move count — a *guarantee*, not luck.

## Scenario 2 — Complex Warehouse: BFS vs DFS on identical input

1. Click **presets → Complex Warehouse** (serpentine aisles).
2. Press **Start** with **DFS** selected first (speed slider mapped up as required).
3. Watch DFS pour down the first available channel; note how the visited region looks like a deep tongue, not a wave.
4. In the **Analysis** panel press **Compare on this layout**.
5. Read the comparison cards: same path validity, different path lengths and explored nodes; note both share `O(V+E)/O(V)`.

**Expected output**
- DFS always reports *Path Found* here, but its route may be longer than BFS's (the "valid path, length not optimal" line makes the honest claim explicit).
- Comparison bars show explored-node counts — the deterministic metric. The timing line reminds that wall-clock time varies between runs and machines and is not a proof of speed.

**Talking point:** DFS's LIFO stack commits to one branch. On an unweighted grid nothing in that discipline encodes distance, so it cannot promise minimality — exactly what the demo shows.

## Scenario 3 — Blocked Destination: the clean "No Path" demo

1. Click **presets → Blocked Destination** (the target is sealed in a shelf ring).
2. Press **Start** with **BFS**.
3. The wave fills the whole reachable region, then stops.

**Expected output**
- Status: **No Path** (red strip), path length "—", message "No path: the queue emptied while the target was never visited."
- Compare with the same preset using DFS — the stack drains, identical verdict. No crash, no hang, no fake route.

**Talking point:** "No path" is *proof by exhaustion* — every reachable vertex was visited and none of them was the destination.

## Bonus demos (quick wins during Q&A)

- **Start = destination:** move the robot onto the destination (they swap). Press Start → "Path Found — 0 moves".
- **Single-step:** press **Step** repeatedly to advance one dequeue/pop per press; the narration explains each move and the structure panel tracks the stack/queue.
- **Backtracking (8×8):** select **Backtracking** — the grid auto-trims to 8×8 (a notice explains why). Watch forward enters (amber) and retreats (grey). On a dense maze the node limit may stop the run — the app then explicitly says *no conclusion is made*, never inflating results.
- **Pause mid-wave:** Pause, then move the speed slider — the pace updates live; Resume continues exactly where it stopped.
- **Edit during pause:** Pause a run, draw a shelf, press Start again — the invalidated run is replaced cleanly.

---

## Viva questions with concise answers

**Q. How is the grid a graph?**
Cells = vertices indexed `row × cols + col`; edges are implicit four-neighbor adjacency; shelves are simply absent vertices. `E ≤ 4V`, so any "O(V + E)" claim is effectively O(V).

**Q. Why does a queue give BFS its shortest-path power?**
FIFO ordering = non-decreasing distance ordering. When the destination is dequeued for the first time, no shorter distance class remains unexplored, so that route is minimal (unweighted graph).

**Q. Why a head index in the queue instead of `Array.shift()`?**
`shift()` is O(n) because it copies the array; the head index makes dequeue O(1) and keeps BFS truly O(V + E).

**Q. Why does DFS use a stack instead of recursion here?**
Recursion *is* a stack (the call stack), but an explicit stack avoids call-depth issues and — more importantly — makes the frontier *visible and animated*. The iterative pattern with pop-time visited checks duplicates safely.

**Q. What prevents infinite loops / cycles?**
The `visited` array: each cell is marked at most once, bounding work by O(V). Backtracking instead marks only the current path (`onPath`), which is why it is exponential and why we cap it.

**Q. How is the path reconstructed?**
`parent[neighbor] = current` at discovery time; walk `target → start` through parents; reverse. O(path length).

**Q. DFS vs BFS complexity?**
Identical asymptotics, O(V + E) time / O(V) space — the difference is *route quality and exploration shape*, not big-O. Explored-node counts differ; measured wall-clock times must not be used to claim a winner.

**Q. When is BFS wrong for this problem?**
If shelves had different traversal costs (weighted floor), BFS's uniform-ring logic breaks; Dijkstra/A* would be needed. That is exactly why we say "shortest in *moves*".

**Q. What is backtracking's worst case?**
Exponential — every simple path is a candidate. The app restricts it to 8×8 and enforces a node limit; when the limit fires, the UI refuses to make any path/optimality claim.

**Q. Why are BFS and DFS timings in the panel not comparable "results"?**
Browser timers measure only this one execution on this one machine; noise, JIT and workload dominate. We print them raw with the honest caveat.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `localhost:5173` refuses | dev server not running — `npm run dev` in `warehouse-robot/`. It binds `0.0.0.0` with strict port; if another process holds 5173, free it (Vite will *not* silently switch ports). |
| Port taken by a previous session | `lsof -i :5173` (or `npx kill-port 5173`) then restart. |
| Tests fail after editing engines | run `npm test`; engines must stay pure (no React imports) and immutable (snapshot contract). |
| Grid seems stuck mid-animation | press Pause → Start to recompute a fresh run; Reset Grid to rebuild the layout. |
| Robot/destination refuses to move handle | they swap instead of overlapping — by design, so `start ≠ target` stays valid; the engine still handles equality internally. |
| Backtracking button changes my big grid | expected: the mode is limited to 8×8 (exponential worst case); a notice explains it and switching algorithms restores your size. |
| Nothing happens on Start | ensure a destination exists (it cannot be removed, only moved). If the robot already sits on it, "Path Found — 0 moves" is the correct output. |
