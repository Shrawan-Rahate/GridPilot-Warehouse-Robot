/**
 * Stack.js — a thin wrapper over the array stack (push / pop).
 * Iterative DFS relies on this LIFO structure; push and pop are O(1).
 */
export class Stack {
  constructor() {
    this._items = []
  }

  /** Put an item on top of the stack — O(1). */
  push(item) {
    this._items.push(item)
  }

  /** Remove and return the top item — O(1). */
  pop() {
    return this._items.pop()
  }

  peek() {
    return this._items[this._items.length - 1]
  }

  isEmpty() {
    return this._items.length === 0
  }

  size() {
    return this._items.length
  }
}
