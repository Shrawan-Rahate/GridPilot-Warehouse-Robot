# Algorithms — GridPilot

This document explains **how** the warehouse is modeled as a graph, and gives the pseudocode, complexity analysis and data-structure justifications for the three search algorithms implemented in `src/algorithms/`.

---

## 1. Graph representation of a 2D grid

The warehouse grid is a graph disguised as a table:

| Graph concept | Warehouse meaning | Implementation |
|---|---|---|
| Vertex `V` | One free cell | Flat integer index `i = row × cols + col` |
| Edge `E` | Two adjacent free cells | **Implicit** — computed on demand |
| Adjacency | Four-directional contact (up/right/down/left) | `neighbors4(world, i)` |
| Weights | — | Every move costs 1 (unweighted graph) |

Key points:

- **No adjacency list is stored.** In a grid, the neighbors of cell `i = (r, c)` are at most `(r−1, c), (r, c+1), (r+1, c), (r, c−1)` — computing them is O(1). Therefore total edges `E ≤ 4V`.
- **Visited / parent structures** are typed arrays (`Uint8Array`, `Int32Array`) indexed by the flat cell index — O(1) access, minimal memory.
- **Immutability:** algorithms receive a frozen snapshot (`snapshotWorld`) and are *test-verified* to mutate nothing; every state returned is freshly allocated.
- The robot start cell and destination are treated as traversable floor.

Deterministic neighbor order is **Up → Right → Down → Left** (applied in reverse when pushing onto the DFS stack so that Up is explored first). This makes DFS output reproducible — important for teaching and grading.

## 2. Path reconstruction

Both BFS and DFS record, at discovery time,

```
parent[neighbor] = current
```

When the destination is found, the path is rebuilt by walking parents **from the destination back to the start** and then reversing the list:

```
RECONSTRUCT-PATH(parent, start, target)
    path ← empty list
    node ← target
    while node ≠ start:
        append node to path        (length-bounded loop guard included)
        node ← parent[node]
    append start
    return REVERSE(path)
```

Cost: O(path length) time, no extra memory beyond the parent array.

---

## 3. Breadth-First Search (BFS)

**Data structure: FIFO Queue**, implemented with a **head index** (`structure/Queue.js`) so `dequeue()` is O(1) — `Array.shift()` would be O(n) and would destroy the complexity bound.

Cells are marked visited **when enqueued** (not when dequeued) so the queue never contains duplicates.

### Pseudocode

```
BFS(grid, start, target)
    queue ← new Queue()
    visited ← array of false        # visited-once guarantee
    parent   ← array of −1          # predecessor links
    enqueue(queue, start); visited[start] ← true

    while queue not empty:
        current ← dequeue(queue)                     # FRONT of the queue
        record visit(current, queue snapshot)        # animation trace

        if current = target:
            return RECONSTRUCT-PATH(parent, start, target)   # SHORTEST

        for each neighbor n of current in order U,R,D,L:
            if not visited[n] and grid[n] is free:
                visited[n] ← true
                parent[n] ← current
                enqueue(queue, n)                    # BACK of the queue

    return NO-PATH        # queue drained without meeting target
```

### Why BFS gives the shortest path here

The queue processes cells **in non-decreasing distance from the start**: first every cell 1 move away, then every cell 2 moves away, and so on (like a wave). Hence the *first* dequeue of the target must have the minimum possible number of moves. This holds for **unweighted** graphs; if shelves had different traversal costs, we would need Dijkstra/A*.

### Complexity

| | Cost | Explanation |
|---|---|---|
| Time | **O(V + E)** | each vertex enqueued/dequeued ≤ once; each edge scanned ≤ 2× |
| Space | **O(V)** | visited + parent arrays + queue ≤ V entries |

On a grid `E ≤ 4V`, so effectively **O(V)**.

---

## 4. Depth-First Search (DFS) — iterative

**Data structure: LIFO Stack** (`structure/Stack.js`, array push/pop are O(1)). Neighborhoods are pushed in **reverse priority order** so the stack direction (Up/Right/Down/Left) is deterministic.

Cells may be pushed more than once; a visited check **at pop time** skips repeats — the classic safe iterative pattern.

### Pseudocode

```
DFS-ITERATIVE(grid, start, target)
    stack ← new Stack()
    visited ← array of false
    parent   ← array of −1
    push(stack, start)

    while stack not empty:
        current ← pop(stack)                         # TOP of the stack
        if visited[current]: continue                # skip stack duplicates
        visited[current] ← true
        record visit(current, stack snapshot)

        if current = target:
            return RECONSTRUCT-PATH(parent, start, target)   # VALID, not optimal

        for each neighbor n of current (pushed in reverse order
            so exploration priority is Up, Right, Down, Left):
            if not visited[n] and grid[n] is free:
                parent[n] ← current
                push(stack, n)                       # TOP of the stack

    return NO-PATH        # stack emptied without meeting target
```

### The honest claim

DFS **does not guarantee a shortest path**. It commits to one branch until a dead end, then unwinds to the last choice point and tries the next option. The route returned is always *valid* (4-adjacent, obstacle-free) but its length depends on the traversal order. The comparison panel in the app demonstrates this live on the Complex preset.

### Complexity

| | Cost | Explanation |
|---|---|---|
| Time | **O(V + E)** | each vertex expanded ≤ once; each edge scanned ≤ 2× |
| Space | **O(V)** | visited + parent + stack ≤ V entries |

DFS may still open *more* cells than BFS before finding the target (often visible in the demo), even though the bound is identical.

---

## 5. Recursive backtracking (optional extension, 8×8 max)

A plain recursive route search that walks forward cell by cell, keeping only the **current route** marked. At a dead end it *unmarks* the last cell — a visible "backtrack" event — and continues with the next option.

### Pseudocode

```
BACKTRACK(grid, current, path)   →  bool
    if nodesExplored ≥ NODE-LIMIT: LIMIT-REACHED; return false
    mark current as on-path; nodesExplored++
    record enter(current, path)

    if current = target:
        record final path
        return true                        # keep the path marked

    for each neighbor n in order U,R,D,L:
        if free and not on-path:
            if BACKTRACK(grid, n, path): return true
            if limit reached: return false

    unmark current (remove from path)      # ← THE backtracking step
    record backtrack(current, path)
    return false
```

### Why it is exponential — and how the app stays safe

There is **no global visited set**, only per-path marking. The same cell may legitimately be re-explored along *different* simple paths, so worst-case time is exponential (on the order of the number of simple paths from start to target, up to ~4^V). Mitigations shipped in the app:

1. the UI restricts the mode to **8×8 grids** (selecting Backtracking auto-trims the world), and
2. a hard **node limit** (default 3000) aborts the search; the result is then explicitly labeled **"Limit Reached — no conclusion about a path"** and *no optimality claim is ever made*.

Space is O(V) (recursion depth + path stack).

---

## 6. Comparison: BFS vs DFS

Both engines implement exactly the same contract on exactly the same snapshot, so any output difference comes from the algorithm, not the map.

| Aspect | BFS | DFS |
|---|---|---|
| Frontier discipline | FIFO queue | LIFO stack |
| Exploration pattern | Wave, level by level | One deep channel, then retreat |
| Path guarantee | **Shortest** in moves (unweighted) | Any valid path |
| Explored cells in practice | Often fewer before the target | Often more (dives past the target's ring) |
| Time complexity | O(V + E) | O(V + E) |
| Space complexity | O(V) | O(V) |
| Best when | You need the fewest moves | You just need "a" route, or the goal is deep along one branch |

**Timing honesty:** wall-clock times are measured in the browser, vary run-to-run and machine-to-machine, and must not be used to claim one algorithm is universally "faster". The deterministic metrics (explored nodes, path length) are the pedagogically reliable ones.

## 7. Data-structure selection — justification summary

| Structure | Where used | Why this one |
|---|---|---|
| Array-based queue with head index | BFS | O(1) enqueue *and* O(1) dequeue without copying; `Array.shift()` would be O(n) |
| Stack (array push/pop) | DFS | O(1) LIFO; mirrors recursion order explicitly and makes "the stack" visible in the UI |
| Uint8Array visited | all | one byte per cell, O(1) membership tests |
| Int32Array parent | BFS/DFS | O(1) predecessor lookup; enables O(path) reconstruction |
| Recursion + path stack | Backtracking | Natural expression of mark/unmark; explicit `onPath` array prevents cycles within the current route |
| Frozen snapshot | all engines | proves algorithms never mutate UI state; verified by tests |
