# REPORT_CONTENT.md

> Content plan for the 5–6 page mini-project report. Placeholders in ⟨angle brackets⟩ must be filled by the group. Do not invent data: every screenshot/test result referenced below should be captured from real runs before submission. Section ordering and page budget are suggested.

---

## Title block (Page 1, header)

**Project title:** GridPilot — Warehouse Robot Pathfinding Simulator

**Course:** ⟨Course code & title — Data Structures & Algorithms Laboratory⟩
**Mini-project:** ⟨Project registration / batch number⟩

| Field | Placeholder |
|---|---|
| Group members | ⟨Member 1 — Roll No.⟩ · ⟨Member 2 — Roll No.⟩ · ⟨Member 3 — Roll No.⟩ · ⟨Member 4 — Roll No.⟩ |
| Guide | ⟨Faculty guide name & designation⟩ |
| Institution / semester | ⟨College name, department, semester & academic year⟩ |

**Abstract (≈120 words, provided):**
GridPilot is an interactive simulator that teaches graph search using a warehouse robot navigation scenario. The warehouse floor is a 2D grid modeled as an implicit unweighted graph: cells are vertices, four-directional adjacency forms the edge set, and shelf obstacles are absent vertices. The application implements Breadth-First Search with an explicit FIFO queue, iterative Depth-First Search with an explicit LIFO stack, and a recursive backtracking extension, entirely from first principles with no pathfinding libraries. Algorithms run on immutable snapshots and emit structured traces consumed by a step-pausing animation controller. A comparison panel executes both engines on identical inputs to contrast route quality and node exploration, while an insights panel reports visited counts, path lengths, complexities and measured timings with honest caveats. A Vitest suite verifies correctness, edge cases and input immutability.

---

## 1. Problem statement (Page 1)

A warehouse robot must travel from its start dock to a pick-up destination without colliding with shelves, while operators need to understand *why* the reported route was chosen and how alternative planners would behave on the same floor. Existing black-box navigation tools hide the underlying algorithm, which limits their teaching value. The project must: (a) let a user construct arbitrary warehouse layouts; (b) compute and clearly animate traversal with classic graph algorithms implemented from scratch; (c) expose the data structures (queue, stack, visited/parent arrays) driving the search; (d) report complexity and performance honestly, including when no route exists.

## 2. Objectives

1. Model a 2D warehouse grid as an implicit, unweighted graph (vertices, edges, adjacency).
2. Implement BFS (FIFO queue) and DFS (LIFO stack) from scratch — correct, cycle-safe, immutable inputs, 4-directional movement only.
3. Add a recursive backtracking demonstration with mark/unmark visualization, bounded to 8×8 grids and a node limit.
4. Build an animation controller supporting start, pause, resume, single-step, speed control and clean reset, free of race conditions.
5. Provide BFS vs DFS comparison on identical snapshots with complexity analysis.
6. Handle all documented edge cases (start = destination, unreachable destination, dense/narrow layouts…).
7. Validate with an automated test suite and a production build.
8. Document the system for viva/discipline transfer.

## 3. Proposed solution (Page 2)

- **Architecture:** three cleanly separated layers — pure algorithm engine (`src/algorithms`), playback controller (`src/animation/useSimulation.js`), and React presentation components.
- **World model:** `{rows, cols, walls (flat Uint8Array), start, target}`; every user edit returns a new immutable world; algorithms receive a frozen snapshot.
- **Execution:** pressing Start freezes the snapshot, runs the selected engine synchronously, and obtains `{found, path, visitedOrder, animationSteps, nodesVisited, pathMoves, elapsedTime, limitReached, message}`. The controller replays `animationSteps` with one timer at a time.
- **Output:** color-coded cell states (robot/destination/frontier/visited/current/route/backtracked), live queue/stack telemetry, and a narrated "what is happening" panel.
(Technology: React 18 + Vite 5, plain CSS design tokens, lucide-react icons, Vitest.)

## 4. Data structures & algorithms used (Page 2–3)

| Structure | Role | Justification |
|---|---|---|
| Array queue with head index | BFS frontier | O(1) enqueue/dequeue; avoids `shift()` O(n) copies |
| Explicit stack | DFS frontier | O(1) LIFO; renders naturally in the UI as visible structure |
| Uint8Array `visited` | all searches | O(1) membership; one byte per vertex; guarantees termination |
| Int32Array `parent` | BFS/DFS | O(1) predecessor access for O(path) reconstruction |
| Recursion + path stack | Backtracking | natural mark/unmark semantics; `onPath` prevents in-route cycles |

**BFS pseudocode, DFS pseudocode, backtracking pseudocode, and graph-representation discussion:** include verbatim from `ALGORITHMS.md` §1–§5 (fits pages 2–3 with the flowchart).

### Complexity analysis table

| Algorithm | Time | Space | Route guarantee |
|---|---|---|---|
| BFS | O(V + E) (E ≤ 4V → O(V)) | O(V) | Shortest path in moves |
| DFS (iterative) | O(V + E) | O(V) | Valid path, not necessarily shortest |
| Backtracking | Exponential worst case | O(V) recursion | Route if exhausted; "limit reached" ⇒ no claim |

### Flowchart outline (draw manually before submission)

1. Start → build snapshot (freeze walls, endpoints)
2. Initialize queue/stack, visited[], parent[]
3. Frontier empty? → No → step 4; Yes → output "No Path"
4. Dequeue/Pop current cell → record trace → visited?
5. Current = target? → Yes → reconstruct path via parent[] → output & end; No → step 6
6. Discover neighbors (U/R/D/L): unvisited & free → mark visited, store parent, push/order per structure
7. Loop control for backtracking variant: mark → descend → dead end? → unmark (backtrack step)
8. Emit result struct → animation engine steps through trace → UI rendering → End

## 5. Implementation details (Page 4)

- **Immutability contract:** `snapshotWorld()` deep-freezes a copy; engines verified via tests to leave walls/endpoints untouched.
- **Queue with a head index:** `structure/Queue.js` advances `head` and periodically compacts — makes dequeue O(1) and keeps memory bounded.
- **Deterministic neighbor order:** Up → Right → Down → Left; DFS pushes neighborhoods in reverse so Up pops first — reproducible demos.
- **Animation safety:** single `setTimeout` per effect run, cleared on cleanup, guarded by a `runId` counter — reset/speed-change/editing mid-run cannot leak stale timers.
- **Backtracking safety:** auto-trim to 8×8, 3000-node hard limit, explicit "limit reached" messaging that asserts nothing about existence or optimality.
- **Honesty features of the UI:** DFS labels its route "valid, length not optimal"; timings carry a variance warning; comparison runs both engines on the *same frozen snapshot*.

## 6. Sample inputs & outputs (Page 5)

Record real numbers from the running app before submission. Template rows (fill from the comparison panel and insights panel):

| Scenario | Algorithm | Found? | Path length (moves) | Nodes visited | Trace steps | Compute time | Result strip |
|---|---|---|---|---|---|---|---|
| Easy Warehouse (15×15) | BFS | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | Path Found |
| Easy Warehouse | DFS | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | Path Found |
| Complex Warehouse | BFS | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | Path Found |
| Complex Warehouse | DFS | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | Path Found |
| Blocked Destination | BFS | No | — | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | No Path |
| Blocked Destination | DFS | No | — | ⟨fill⟩ | ⟨fill⟩ | ⟨fill⟩ | No Path |
| Robot = destination | any | Yes | 0 | ⟨fill⟩ | 1 | ⟨fill⟩ | Path Found — 0 moves |

Known-good reference checks (from the test suite, executed with Vitest): open 5×5 corner-to-corner BFS is 8 moves; open 8×8 corner-to-corner BFS is 14 moves; DFS never shorter than BFS on the Complex preset; both engines report No Path on the Blocked preset.

## 7. Screenshot placeholders (Page 5)

Insert actual captures taken from `http://localhost:5173` during the demo run:

- **Fig. 1:** Full dashboard after *Easy Warehouse* + BFS completion (labels: sidebar, grid, insights panel).
- **Fig. 2:** Mid-animation wave showing visited/frontier/current cells and the queue chips in the structure viz.
- **Fig. 3:** DFS on Complex Warehouse with the "valid path, length not optimal" annotation visible.
- **Fig. 4:** BFS vs DFS comparison cards on the same layout.
- **Fig. 5:** Blocked Destination run ending in the red "No Path" strip.
- **Fig. 6:** Backtracking mode on 8×8 showing amber route cells and grey retracted cells.
- **Fig. 7:** Terminal output of `npm test` (72 passing tests) and `npm run build`.

## 8. Testing summary (Page 5–6)

State results actually observed when running `npm test` in your environment (do not fabricate). The suite covers: BFS shortest-path correctness on known grids; DFS valid-path correctness and a deliberately suboptimal case; unreachable destination; start = destination; obstacle compliance; no repeated cell visits; path reconstruction validity; completely empty grids; input-grid immutability for every engine; queue/stack unit behavior; world-editing immutability and endpoint-safety regressions; the three preset scenarios (Easy/Complex reachable, Blocked unreachable); a full-App render smoke test; and a React Testing Library interaction suite driving real pointer events — shelf painting/dragging/erasing, endpoint moves with swap, animated BFS/DFS/backtracking runs, pause/resume/step/clear-path/reset, speed pacing, grid size, all presets, the BFS-vs-DFS comparison, the mid-run editing guard, the ErrorBoundary no-blank guarantee, and a cursor-0 narration regression.

## 9. Conclusion & applications

GridPilot converts abstract textbook traversal into observable, controllable behavior: the wave discipline of the queue and the dive-and-retreat discipline of the stack become visible, comparable and honest about their guarantees. The project demonstrates disciplined engineering habits — immutable computation boundaries, trace-based animation, deterministic orderings, guarded recursion — as much as it demonstrates algorithms.

**Applications:** warehouse AMR/AGV floor routing on uniform tiles; BFS as the base of fewest-move planners; DFS in maze generation and topological search; backtracking in routing with back-off semantics; the same grid-as-graph pattern extends to A*/Dijkstra with weighted cells for cost-graded floors, dynamic re-planning when shelves move, and multi-robot coordination with reserved time windows.

## 10. References

1. Cormen, Leiserson, Rivest & Stein — *Introduction to Algorithms*, Chapter 22 (Graph Traversals).
2. Rich — *Artificial Intelligence*, Chapter 3 (Search).
3. Vitest & Vite documentation (testing and tooling).
4. React documentation — controlled state, effect cleanup semantics.
