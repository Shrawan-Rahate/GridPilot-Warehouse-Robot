/**
 * Queue.js — minimal FIFO queue implemented with a head index.
 *
 * Using Array.shift() would make dequeue O(n); advancing a head index
 * makes both enqueue and dequeue O(1) so BFS keeps its O(V + E) bound.
 */
export class Queue {
  constructor() {
    this._items = []
    this._head = 0
  }

  /** Add an item to the back of the queue — O(1). */
  enqueue(item) {
    this._items.push(item)
    return this.size()
  }

  /** Remove the item at the front of the queue — O(1). */
  dequeue() {
    if (this.isEmpty()) return undefined
    const item = this._items[this._head]
    this._head += 1
    // Periodically compact the backing array so memory stays bounded.
    if (this._head > 64 && this._head * 2 > this._items.length) {
      this._items = this._items.slice(this._head)
      this._head = 0
    }
    return item
  }

  /** Front item without removing it. */
  peek() {
    if (this.isEmpty()) return undefined
    return this._items[this._head]
  }

  isEmpty() {
    return this._head >= this._items.length
  }

  /** Number of items waiting in the queue. */
  size() {
    return this._items.length - this._head
  }
}
