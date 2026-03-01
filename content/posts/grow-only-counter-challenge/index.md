---
title: "Grow-only Counter Challenge"
date: 2026-03-01T13:37:00+00:00
draft: false
summary: "How to build a distributed monotonic counter on top of a sequentially consistent store."
---

Hey everyone, long time no see :). A lot has happened since the last time I wrote an article. I've completed an internship at Bloomberg, graduated from EPFL and then came back to Bloomberg to work as a Software Engineer in their London office. I might write about this in the future, but now is not the time.

I haven't been coding in my spare time much, as I was just drained from work, however, I would occasionally write some toy programs here and there. One of the more interesting challenges I worked on is [Fly.io's Gossip Gloomers](https://fly.io/dist-sys/) challenge.

## Gossip Gloomers

Gossip Gloomers is a collection of distributed systems challenges which use [Jepsen](jepsen.io) to validate correctness. You can complete these in any programming language, the suggestion in the tutorial is to use Go as there's a library you can use with boilerplate code to read `stdin`, parse messages, set up request handlers etc. so that you can focus on the important bits. There are 6 challenges in increasing level of difficulty:
1. Echo - starting challenge to learn how to work with `Maelstrom`, which is a platform built on top of Jepsen, with the goal of making RPCs for nodes to communicate
2. Unique ID Generation - generating globally unique IDs
3. Broadcast - an eventually consistent broadcasting protocol
4. Grow-only Counter - a replicated monotonically increasing counter
5. Kafka-style Log - a replicated append-only log
6. Totally-Available Transactions - a key-value store which supports transactions

In this post I'll focus on the Grow-only counter. Beware, spoilers ahead!

## Grow-only Counter

In this challenge, they want us to implement a global counter distributed across all nodes, which is only ever allowed to store monotonically increasing values. There are 2 operations:
1. `add(delta)` - which adds the delta to the counter
2. `read()` - which returns the current value of the counter

Importantly, the testing scenario is set up such that there will be a `read()` invoked on all nodes, after the last `add(delta)` operation, which should return the latest value for all nodes. We'll come back to this later.

For example, given 2 nodes (`n1` and `n2`), one possible execution could look like:
```rust
n0.add(5)
n0.read() -> 5
n1.add(3)
n0.add(2)
n0.read() -> 10
n1.read() -> 10
```

Because of the constraint on the final read, the next execution would be incorrect:

```rust
n0.add(5)
n0.read() -> 5
n1.add(3)
n0.add(2)
n0.read() -> 7 // the latest value is 10, not 7
n1.read() -> 10
```

This looks like an impossible execution, however, there could be some lag in propagating `n1.add(3)` to `n0`, such that the execution is equivalent to:

```rust
n0.add(5)
n0.read() -> 5
n0.add(2)
n0.read() -> 7 // the latest value is 10, not 7
n1.add(3)
n1.read() -> 10
```

To solve this challenge, they tell us to use a *Sequentially consistent* key-value store provided by Maelstrom. This key-value store provides a couple of operations, but the most important ones are:
1. `read(key)` - returns the value of the key
2. `write(key, value)` - updates the key's value
3. `compare_and_swap(key, old_value, new_value)` - which replaces the `old_value` with the `new_value` only if the value of the key is equal to `old_value`. Otherwise, it returns an error.

## Sequential consistency

What does it mean for an object to be sequentially consistent? Simply put, this means that the operations invoked on that object appear to have executed in some total order and that this order is consistent with the order of operations on each node. 

To illustrate this, suppose that there are 2 nodes (`n0` and `n1`). A valid sequentially consistent execution would be:
```rust
n0: store.write("key-0", 1)
n1: store.write("key-1", 1)
n0: store.read("key-1") -> 0
n1: store.read("key-0") -> 1
```

Because we can reorder the operations to be equivalent to this execution:
```rust
n0: store.write("key-0", 1)
n0: store.read("key-1") -> 0
n1: store.write("key-1", 1)
n1: store.read("key-0") -> 1
```

However, an invalid sequentially consistent execution would be:
```rust
n0: store.write("key-0", 1)
n1: store.write("key-1", 1)
n0: store.read("key-1") -> 0
n1: store.read("key-0") -> 0
```

This is because the `n0: store.read("key-1") -> 0` must have occured before `n1: store.write("key-1", 1)`. As `n1: store.read("key-0") -> 0` occurs after `n1: store.write("key-1", 1)`, we can conclude that `n1: store.read("key-0") -> 0` occurs after `n0: store.read("key-1") -> 0`. The resulting ordering is:
```rust
n0: store.read("key-1") -> 0
n1: store.write("key-1", 1)
n1: store.read("key-0") -> 0
```
Using an equivalnet argument, we can get an execution order of:
```rust
n1: store.read("key-0") -> 0
n0: store.write("key-0", 1)
n0: store.read("key-1") -> 0
```
This is an obvious contradiction (the order of reads), therefore, there is no total order which can be established between the operations and, as such, this execution is not sequentially consistent.

## Solution

Once you understand this, it is not hard to come up with a solution to the problem which uses the `compare_and_swap` operation. The pseudocode would look something like this:
```rust
fn add(store: KVStore, delta: u64) {
    loop {
        let old_value = store.read("COUNTER");
        let result = store.compare_and_swap(
            "COUNTER", 
            old_value, 
            old_value + delta,
        );
        if result.is_ok() {
            break;
        }
    }
}

fn read(store: KVStore) -> u64 {
    store.read("COUNTER")
}
```

Because the store is sequentially consistent, every `read` on a node is guaranteed to observe the results of its previous `add(delta)`, as the `compare_and_swap` must have been ordered before the `read`. It is possible that another node updates the counter, but the update hasn't propagated to the current node doing the `read` and that the value returned is stale, however, this value must be `>=` the value after the current node updates the counter. 

As a matter of fact, this implementation will be sequentially consistent just like the store. This is because there is only ever going to be 1 modify operation executed for each `add` (the failed `compare_and_swap` operations are no-ops) and the `read` operations which come before the successful `compare_and_swap` can just be reordered to have happened before the add altogether.

## Final read problem

Now that we understand the solution, I'm going to talk a little bit about the constraint that final reads must return the latest counter value and why it is problematic.

Let's consider an example where we have 2 nodes (`n1` and `n2`) and they invoke these operations in order:

```rust
n0.add(1)
n1.read()
n0.read()
```

What must happen according to the problem constraints is:
```rust
n0.add(1)
n1.read() -> 1
n0.read() -> 1
```

However, because of sequential consistency guarantee of the underlying key-value store, what may happen is this:
```rust
n0.add(1)
n1.read() -> 0
n0.read() -> 1
```

Now, let's take a look at how the underlying operations may have executed:
```rust
n0: store.read("COUNTER") -> 0
n0: store.compare_and_swap("COUNTER", 0, 1)
n1: store.read() -> 0
n0: store.read() -> 1
```

This is equivalent to the following execution (among many others):
```rust
n1: store.read() -> 0
n0: store.read("COUNTER") -> 0
n0: store.compare_and_swap("COUNTER", 0, 1)
n0: store.read() -> 1
```
These executions are perfectly valid according to the sequential consistency guarantee of the store. In fact, there's nothing we can do to prevent this execution, unless there's some additional guarantees provided by the store. The argument boils down to, no matter how your algorithm looks like, it will always be possible to have an execution where the store operations inside `read()` on all but 1 node get ordered before the store operations in `add(delta)` on the node which does the final update, even though the `add()` operation has completed before the `read()` started. If this was actually possible, then you would be able to construct linearizable objects from sequentially consistent ones, but the paper [Sequential Consistency versus Linearizability by Hagit Attiya and Jennifer L. Welch](dl.acm.org/doi/abs/10.1145/176575.176576) proves otherwise.

## Expected solution

The solution the author expects is to put a CAS in the read operation to force the key-value store to update the state for everyone, or, to spam the key-value store with CAS operations. Both of these require either linearizability of the key-value store, or, some bounded staleness for the results of the operations, which is not provided by default by a sequentially consistency. The following code describes one of the solutions:

```rust
fn add(store: KVStore, delta: u64) {
    loop {
        let old_value = store.read("COUNTER");
        let result = store.compare_and_swap(
            "COUNTER", 
            old_value, 
            old_value + delta
        );
        if result.is_ok() {
            break;
        }
    }
}

fn read(store: KVStore) -> u64 {
    while let Err(_) = store.compare_and_swap(
        random::new_key(), 
        0, 
        random::new_value()
    ) {}
    store.read("COUNTER")
}
```

This is a gotcha in the implementation of the key-value store, which will cause it to linearize when it's doing CAS operations.

### Alternative solutions

There are some solution on the internet which really on every node having its own counter value. When reading, you contact all nodes for their counter value and sum them. Something like this:

```rust
fn add(&mut self, delta: u64) {
    self.counter += delta;
}

fn read(&self) -> u64 {
    let mut sum = 0;
    for node in self.nodes {
        sum += node.read_counter_RPC();
    } 

    sum
}
```

This is an interesting approach that doesn't use the key-value store, however, this also doesn't solve the problem that final reads need to return the latest value (this is going to be eventually consistent).

## Conclusion

It was a very fun problem to solve, however, the constraints are a little unfair, and, I'd argue that returning stale values in those final reads is perfectly fine as long as the values returned by reads on the nodes themselves don't decrease. This is because we deem the system to be sequentially consistent, and, given those conditions, we cannot guarantee the system will converge on those final reads.