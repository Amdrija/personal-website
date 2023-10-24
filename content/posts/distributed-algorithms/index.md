---
title: "Distributed Algorithms"
date: 2023-10-18T00:55:00+02:00
draft: false
summary: "A distributed system is one in which the failure of a computer you did not even know existed can render your own computer unusable."
---

These are my lecture notes and comments for the [Distributed Algorithms](https://edu.epfl.ch/studyplan/en/master/computer-science/coursebook/distributed-algorithms-CS-451) course at EPFL. The reference for these notes are prof. Rachid Guerraoui's lectures and his book [Introduction to Reliable and Secure Distributed Programming](https://link.springer.com/book/10.1007/978-3-642-15260-3). I have tried to reformulate some proofs in order to better understand the subject. This post should be enough to get some basic understanding on distributed systems, for more advanced concepts, please consult the book.

With that in mind, we can begin.

## Assumptions

### Process

Processes model a sequential program. In our model we assume that there are N processes which are unique and know each other. They are connected by links through which they exchange messages. Finally, modules within the same process interact by exchanging events.

### Safety

Safety properties stipulate that nothing bad should happen. A property that can be violated at some time point T and never be satisfied again is a safety property.

Example: not lying

### Liveness

Liveness properties stipulate that something good should happen. At any time T there is some hope that the property can be satisfied at a later time T' >= T.

Example: saying anything

It is trivial to have one without the other, however, the hard part (i.e telling the truth) is satisfying both.

### Failure

Here we will talk about 3 kinds of failures:

- Omission: the process omits to send messages it is supposed to send
- Arbitary: the process sends messages it is not uspposed to send (malicious or Byzantine)
- Crash stop: A process that omits a message to a process, omits all subsequent messages to all processes

## Links

### Fair-loss links

1. Fair-loss: If a message is sent infintely often by p<sub>i</sub> to p<sub>j</sub> and neither p<sub>i</sub> or p<sub>j</sub> crashes, then m is delivered infinitely often by p<sub>j</sub> (Liveness)
2. Finite duplication: If a message m is sent a finite number of times by p<sub>i</sub> to p<sub>j</sub> m is delivered a finite number of times by p<sub>j</sub> (Liveness)
3. No creation: No message is delivered unless it was sent (Safety)

### Stubborn links

1. Stubborn delivery: If a process p<sub>i</sub> sends a message m to a correct process p<sub>j</sub> and p<sub>i</sub> does not crash, then p<sub>j</sub> delivers m an infinite number of times
2. No message is delivered unless it was sent

```dapseudo
Implements: StubbornLinks (sp2p)
Uses: FairLossLinks(flp2p)

upon event <sp2pSend, dest, m> do
    while (true) do
        trigger <flp2pSend, dest, m>;

upon event <flp2pDeliver, src, m> do
    trigger <sp2pDeliver, src, m>;
```

### Reliable (Perfect) links

1. Validity: If p<sub>i</sub> and p<sub>j</sub> are correct, then every message sent by p<sub>i</sub> to p<sub>j</sub> is eventually delivered by p<sub>j</sub>
2. No duplication: No message is delivered (to a process) more than once
3. No creation: No message is delivered unless it was sent

```dapseudo
Implements: PerfectLinks (pp2p)
Uses: StubbornLinks (sp2p)

upon event <Init> do
    delivered := ∅

upon event <pp2pSend, dest, m> do
    trigger <sp2pSend, dest, m>;

upon event <sp2pDeliver, src, m> do
    if m ∉ delivered then
        trigger <pp2pDeliver, src, m>;
        add m to delivered;
```

## Failure Detection

### Perfect Failure Detector

1. Strong Completeness: Eventually, every process that crashes is permanently suspected by every correct process
2. Strong Accuracy: No process is suspected before it crashes

### Eventually Perfect Failure Detector

1. Strong Completeness
2. Eventual Strong Accuracy: Eventually, no correct process is ever suspected

```dapseudo
1. Processes periodically send heartbeat messages
2. A process sets a timeout based on worst case round trip of a message exchange
3. A process suspects another process if it timeouts that process
4. A process that delivers a message from a suspected process revises its suspicion and double its time-out
```

## Timing Assumptions

### Synchronous

1. Processing: the time it takes for a process to execute a step is bounded and known
2. Delays: there is a known upper bound limit on the time it takes for a message to be received
3. Clocks: the drift between a local clock and the global real time clock is bounded and known

### Eventually Synchronous

The timing assumptions hold eventually

### Asynchronous

No assumption

## Reliable Broadcast

### Best-Effort Broadcast

With best-effort broadcast, the burden of ensuring reliability is only on the sender.

1. Validity: If p<sub>i</sub> and p<sub>j</sub> are correct, then every message broadcast by p<sub>i</sub> is eventually delivered by p<sub>j</sub>
2. No duplication: No message is delivered more than once.
3. No creation: No message is delivered unless it was broadcast

```dapseudo
Implements: BestEfforBroadcasts (beb)
Uses: PerfectPointToPointLinks (pp2p)

upon event <bebBroadcast, m> do
    forall pi ∈ S do
        trigger <p2pSend, pi, m>;

upon event <pp2pDeliver, pi, m> do
    trigger <bebDeliver, pi, m>;
```

### Regular Reliable Broadcast

1. Validity: If p<sub>i</sub> and p<sub>j</sub> are correct, then every message broadcast by p<sub>i</sub> is eventually delivered by p<sub>j</sub>
2. No duplication: No message is delivered more than once.
3. No creation: No message is delivered unless it was broadcast
4. Agreement: For any message m, if any correct process delivers m, then every correct process delivers m.

```dapseudo
Implements: ReliableBroadcast (rb)
Uses:
    BestEffortBroadcast (beb)
    PerfectFailureDetector (P)

upon event <Init> do
    delivered := ∅;
    correct := S;
    forall pi ∈ S do
        from[pi] := ∅;

upon event <rbBroadcast, m> do
    delivered := delivered U {m};
    trigger <rbDeliver, self, m>; // I don't think we need to deliver here.
    trigger <bebBroadcast, [Data,self,m]>;

upon event <crash, pi> do
    correct := correct \ {pi};
    forall [pj, m] ∈ from[pi] do
        trigger <bebBroadcast, [Data,pj,m]>;

upon event <bebDeliver, pi, [Data, pj, m]> do
    if m ∉ delivered then
        delivered := delivered U {m};
        trigger <rbDeliver, pj, m>;
        if pi ∉ correct then
            trigger <bebBroadcast,[Data,pj,m]>;
        else
            from[pi]:=from[pi] U {[pj,m]};
```

### Uniform Reliable Broadcast

1. Validity: If p<sub>i</sub> and p<sub>j</sub> are correct, then every message broadcast by p<sub>i</sub> is eventually delivered by p<sub>j</sub>
2. No duplication: No message is delivered more than once.
3. No creation: No message is delivered unless it was broadcast
4. Uniform Agreement: For any message m, if any process delivers m, then every correct process delivers m

Difference from reliable broadcast is that if ANY process delivers m, not if ANY CORRECT process deliver m.

```dapseudo
Implements: uniformBroadcast (urb)
Uses:
    BestEffortBroadcast (beb)
    PerfectFailureDetector (P)

upon event <Init> do
    correct := S;
    delivered := forward := ∅;
    ack[Message] := ∅;

upon event <crash, pi> do
    correct := correct \ {pi};

upon event <urbBroadcast, m> do
    forward := forward U {[self, m]};
    trigger <bebBroadcast, [Data, self, m]>;

upon event <bebDeliver, pi, [Data, pj, m]> do
    ack[m] := ack[m] U {pi};
    if [pj,m] ∉ forward then
        forward := forward U {[pj, m]};
        trigger <bebBroadcast, [Data, pj, m]>;

upon event (for any [pj,m] ∈ forward) <correct ⊆ ack[m]> and <m ∉ delivered> do
    delivered := delivered U {m}
    trigger <urbDeliver, pj, m>;
```

The `forward` set contains the messages that are currently waiting for acks.

At any point in time, the `correct` set will contain nodes that are correct and that won't fail and some nodes which are incorrect. If this set is a subset of `ack[m]` it means that all the correct nodes have acked the message, meaning they have received the message and can deliver it. Thus proving the Uniform Agreement property.

Here the acks are the same messages as the original broadcast message. The firs time that we get a message (when it isn't in the forward set), we rebroadcast it to all the other nodes as an ack.

## Causal Broadcast

Two messages from the same process might not be delivered in the order they were broadcast. With causal broadcast, we want to deliver messages in the causal order.

### Causality

Let m<sub>1</sub> and m<sub>2</sub> be any two messages: m<sub>1</sub>->m<sub>2</sub> (m<sub>1</sub> causally precedes m<sub>2</sub>) if and only if:

1. FIFO order: Some process p<sub>i</sub> broadcasts m<sub>1</sub> before broadcasting m<sub>2</sub>
2. Local order: Some process p<sub>i</sub> delivers m<sub>1</sub> and then broadcasts m<sub>2</sub>
3. Transitivity: There is a message m3 such that m<sub>1</sub>->m<sub>3</sub> and m<sub>3</sub>->m<sub>2</sub>

### Reliable Causal Broadcast

Reliable broadcast with the causal order property.

### Uniform Reliable Causal Broadcast

Uniform reliable broadcast with the causal order property.

### Non-blocking algorithm using the past

Same for uniform reliable causal broadcast, just uses unifrom reliable broadcast under the hood instead of reliable broadcast.

```dapseudo
Implements: ReliableCausalOrderBroadcast (rco)
Uses: ReliableBroadcast (rb)

upon event <Init> do
    delivered := past := ∅;

upon event <rcoBroadcast, m> do
    trigger <rbBroadcast, [Data, past, m]>;
    past := past U {[self, m]};

upon event <rbDeliver, pi, [Data, past_m, m]> do
    if m ∉ delivered then
        forall [sn, n] in past_m do
            if n ∉ delivered then
                trigger <rcoDeliver, sn, n>;
                delivered := delivered U {n};
                past := past U {[sn, n]};

        trigger <rcoDeliver, pi, m>;
        delivered := delivered U {m};
        past := past U {[pi, m]};

```

Whenever we broadcast a new message, we broadcast it with all the past messages which were broadcast or delivered by this node.

Whenever a message has been delivered by the underlying broadcast, we deliver all the messages in its past which haven't been delivered yet and add it to the nodes's past.

It is assumed that you cannot broadcast the same message twice.

This is a no wait algorithm, because if we deliver a message in the future, we don't wait first to deliver the messages in its past, but we deliver them immadeatly preceding the deliver of the future message.

The downside of this algorithm is that messages grow linearly with time and could become **HUUUUUUUGEE**.

### Garbage collection

The idea is simple, we can remove messages from the past when all the correct processes have delivered it. This can be achieved by using the perfect failure detector and ack messages.

```dapseudo
Implements: GarbageCollection, ReliableCausalOrderBroadcast
Uses:
    ReliableBroadcast (rb)
    PerfectFailureDetector (P)

upon event <Init> do
    delivered := past := ∅;
    correct := S;
    forall m: ack[m] := ∅;

upon event <crash, pi> do
    correct := correct \ {pi};

upon for some m ∈ delivered: self ∉ ack[m] do
    ack[m] := ack[m] U {self};
    trigger <rbBroadcast, [ACK, m]>;

upon event <rbDeliver, pi, [ACK, m]> do
    ack[m] := ack[m] U {pi};
    if forall pj ∈ correct: pj ∈ ack[m] do
        past := past \ {[sm, m]};

//Same as the rco example
upon event <rcoBroadcast, m> do
    trigger <rbBroadcast, [Data, past, m]>;
    past := past U {[self, m]};

upon event <rbDeliver, pi, [Data, past_m, m]> do
    if m ∉ delivered then
        forall [sn, n] in past_m do
            if n ∉ delivered then
                trigger <rcoDeliver, sn, n>;
                delivered := delivered U {n};
                past := past U {[sn, n]};

        trigger <rcoDeliver, pi, m>;
        delivered := delivered U {m};
        past := past U {[pi, m]};
```

### Waiting Causal Broadcast

Instead of sending the past of all the messages, we can just send a vector which contains as the i<sup>th<sup> element the sequence number of the message from process p<sub>i</sub> that the broadcasted message depends on.

For example: we have 3 processes, each will have the vector initialized to `[0,0,0]`. When process p<sub>1</sub> broadcasts a message, it will send the vector `[0,0,0]`, and it will change its vector to `[1,0,0]`. Now, when the same process broadcasts a message, it will send a vector `[1,0,0]` with the message. The process p<sub>3</sub> then delivers both messages, it will now send the vector `[2, 0, 0]` and change its vector to `[2, 0, 1]` etc.

It could be possible for a process p<sub>2</sub> to first receive the 2<sup>nd</sup> message from p<sub>1</sub> (this has a history of `[1,0,0]`), then receive the 1<sup>st</sup> message with the history `[0,0,0]`. Now, as you can see, because of the vector, it can correctly deduce the causal order of the messages.

```dapseudo
Implements: ReliableCausalOrderBroadcast (rco)
Uses: ReliableBroadcast (rb)

upon event <Init> do
    for all pi ∈ S: VC[pi] = ∅;
    pending := ∅;

upon event <rcoBroadcast, m> do
    trigger <rcoDeliver, self, m>;
    trigger <rbBroadcast, [Data,VC,m]>;
    VC[self] := VC[self] + 1;

upon event <rbDeliver, pj, [Data, VC_m , m]> do
    if pj != self then
        pending := pending U (pj, [Data, VC_m ,m]);
        deliver-pending()

procedure deliver-pending
    while(s, [Data, VC_m, m]) ∈ pending
        for all pk: (VC[pk] >= VC_m[pk]) do
            pending := pending \ (s, [Data, VC_m, m]);
            trigger <rcoDeliver, self, m>;
            VC[s] := VC[s] + 1;
```

## Total Order Broadcast

With causal and FIFO broadcast, "concurrent" unrelated messages could be delivered in different order by different nodes. For example, p<sub>1</sub> broadcasts m1 and p<sub>2</sub> broadcasts m2 at the same time. It may happen that p<sub>1</sub> delivers m1 and then m2 while p<sub>2</sub> delivers m2 then m1.

Total order broadcast imposes a global order on all the messages (even unrelated ones), so that in the previous example it would not be possible for p<sub>1</sub> and p<sub>2</sub> to deliver messages in a different order.

### (Uniform) Total order property

Let m1 and m2 be any two messages. Let p<sub>i</sub> be correct (any) process that delivers m1 without having delivered m2. Then no correct (any) process delivers m2 before m1.

### Weaker definitions

Let p<sub>i</sub> and p<sub>j</sub> be two correct (any) processes that deliver two messages m1 and m1. If p<sub>i</sub> delivers m1 before m2, then p<sub>j</sub> delivers m1 before m2.

Here this could happen (one of the processes doesn't deliver both messages before crashing), while this specification would not be possible in the first formulation (because one delivers m1 and the other delivers m2 first):

![Total Order two messages delivered](images/weaker-total-order-two-message-deliver.png)

Let p<sub>i</sub> and p<sub>j</sub> be correct (any) two processes that deliver amessage m2. If p<sub>i</sub> delivers a message m1 before m2, then p<sub>j</sub> delivers m1 before m2.

Here this could happen (both processes deliver a different message first and then crash):

![Total Order different messages delivered](images/weaker-total-order-different-message-deliver.png)

### Algorithm

For uniform total order broadcast we use the uniform reliable broadcast primitive instead of the reliable broadcast primitive.

```dapseudo
Implements: TotalOrderBroadcast (tob)
Uses:
    ReliableBroadcast (rb)
    Consensus (cons)

upon event <Init> do
    unordered := delivered := ∅;
    wait := false;
    sn := 1

upon event <tobBroadcast, m> do
    trigger <rbBroadcast, m>;

upon event <rbDeliver, sm, m> and (m ∉ delivered) do
    unordered := unordered U {(sm, m)};

upon (unordered != ∅) and not(wait) do
    wait := true;
    trigger <Propose, unordered>_sn;

upon event <Decide, decided>_sn do
    unordered := unordered \ decided;
    ordered := deterministicSort (decided);

    for all (sm, m) in ordered do
        trigger <tobDeliver, sm, m>;
        delivered := delivered U {m};

    sn := sn + 1;
    wait := false;
```

One can build consensus with total order broadcast (everybody tob broadcasts their proposal in a message and the consensus pick the first tob delivered message).

One can build total ordered broadcast with consensus and reliable broadcast.

Therefore, consensus and total order broadcast are equivalent problems in a system with reliable channels.

## Consensus

In the consensus problem, processes propose values and have to agree on one of these proposed values.

### (Regular) Consensus

1. Validity: Any value decided is a value proposed
2. Agreement: No two correct processes decide differently
3. Termination: Every correct process eventually decides
4. Integrity: No process decides twice

### Algorithm - Hierarchical Consensus

The processes exchange and update proposals in rounds and decide on the value of the non-suspected process with the smallest id.

The processes go through rounds incrementally, in each round, the process with the id corresponding to that round is the leader of the round. The leader of a round decides its current proposal and broadcasts it to all.

A process that is not a leader in a round waits either to deliver the proposal of the leader in that round to adopt it or to suspect the leader.

```dapseudo
Implements: Consensus (cons)
Uses:
    BestEffortBroadcast (beb)
    PerfectFailureDetector (P)

upon event <Init> do
    suspected := ∅;
    round := 1;
    currentProposal := nil;
    broadcast := delivered[] = false;

upon event <crash, pi> do
    suspected := suspected U {pi};

upon event <Propose, v> do
    if currentProposal = nil do
        currentProposal := v;

upon event <bebDeliver, p_round, value> do
    currentProposal := value;
    delivered[round] := true;

upon event delivered[round] = true or p_round ∈ suspected do
    round := round + 1;

upon event p_round = self and broadcast = false and currentProposal != nil do
    trigger <Decide, currentProposal>;
    trigger <bebBroadcast, currentProposal>;
    broadcast := true;
```

Let's assume that p<sub>i</sub> is a correct process with the smalles id in a run. Assume that p<sub>i</sub> decides `v`. Then if `i = n`, p<sub>n</sub> would be the only correct process, therefore a consensus is reached. Otherwise, in round `i`, all correct processes receive `v` and change their currentProposal to `v`, afterwards, when they are in their round, they will decide on their currentProposal which is `v`.

What happens if say process p<sub>1</sub> crashes, p<sub>2</sub> detects the crash and moves to next round, while p<sub>3</sub> still didn't detect the crash and gets a decided message of p<sub>1</sub> after p<sub>2</sub> has already sent it's message. But, I guess that this would not be possible because of `<bebDeliver, p_round, value>`. Since p<sub>3</sub> would still be in `round = 1`, it would be waiting for `<bebDeliver, p1, value>`, so it would not be able to trigger the event `<bebDeliver, p2, value>` (because the `round = 1`). Otherwise, if it managed to trigger the event `<bebDeliver, p2, value>`, it would have to have detected the crash of p<sub>1</sub> (because it wouldn't be able to move onto the next round `round = 2` as the p<sub>1</sub> decide message has to be delivered after p<sub>2</sub>'s). Therefore, it would not be able to trigger the event `<bebDeliver, p1, value>` to overwrite the `currentProposal`. Maybe it would be easier to just have an if clause in the event `<bebDeliver, pi, value>`: `if i == round do ...`

### Uniform Consensus

1. Validity: Any value decided is a value proposed
2. Uniform Agreement: No two processes decide differently
3. Termination: Every correct process eventually decides
4. Integrity: No process decides twice

### Algorithm - Uniform Hierarchical Consensus

The problem with the Hierarchical Consensus algorithm is that some processes decide too early, and if they crash, the others might have not choice but to decide on a different value. To fix this, every process should wait to make a decision until everyone has seen the proposals and sent theirs (or in other words, deicde only in the N<sup>th</sup> round.)

```dapseudo
Implements: Uniform Consensus (ucons)
Uses:
    BestEffortBroadcast (beb)
    PerfectFailureDetector (P)

upon event <Init> do
    suspected := ∅;
    round := 1;
    currentProposal := nil;
    broadcast := delivered[] := false;
    decided := false;

upon event <crash, pi> do
    suspected := suspected U {pi};

upon event <Propose, v> do
    if currentProposal = nil then
        currentProposal := v;

upon event <bebDeliver, p_round, value> do
    currentProposal := value;
    delivered[round] := true;

upon event delivered[round] = true or p_round ∈ suspected do
    if round = n and decided = false then
        trigger <Decide, currentProposal>;
        decided = true;
    else
        round := round + 1;

upon event p_round = self and broadcast = false and currentProposal != nil do
    trigger <bebBroadcast, currentProposal>;
    broadcast := true;
```

Lemma: If a process p<sub>j</sub> completes round `i` without receiving any message from p<sub>i</sub> and `i < j`, then p<sub>i</sub> crashes by the end of round `j`.

Proof: Suppose p<sub>j</sub> completes round `i` without receiving a message from p<sub>i</sub>, `i < j`, and p<sub>i</sub> completes round `j`. Since p<sub>j</sub> suspects p<sub>i</sub> in round `i`, p<sub>i</sub> has crashed before p<sub>j</sub> completes round `i`. Therefore, p<sub>i</sub> is in the worst case stuck in round `j` waiting for the p<sub>j</sub>'s message. In order to move to the next round, it would have to suspect p<sub>j</sub> crashed (which isn't possible, because p<sub>j</sub> detected p<sub>i</sub>'s crash, therefore p<sub>i</sub> crashed before p<sub>j</sub>) or it would have to have received a message from p<sub>j</sub> (which is not possible because p<sub>i</sub> crashes in p<sub>j</sub>'s round `i` and p<sub>j</sub> only sends a message in round `j > i`, which is after round `i`).

Correctness proof: Consider the process with the lowest id which decides, say p<sub>i</sub>. Thus, p<sub>i</sub> completes round `n`. By the previous lemma, in round `i`, every p<sub>j</sub> with `j > i` receives the `currentProposal` of p<sub>i</sub> (otherwise, p<sub>i</sub> would have crashed at the end of round `j`, which would prevent it from reaching round `n`) and adopts it. Thus, every process which sends a message after round `i` or decides, has the same `currentProposal` at the end of round `i`. As is the case with the regular consensus, all processes will decide on the value of the process with the lowest id. Therefore, all processes that decide will decide on the same value.

## FLP Impossibility Result

The FLP Impossibility result proves that it is not possible to solve binary consensus in an asynchronous model without a failure detector.

It proves that the "regular" consensus is not possible, therefore, the uniform consensus cannot be possible as well.

In an asynchronous model, there's no shared global clock and the message delays are arbitary (but finite).

Let `M` denote the message pool of outstanding (not-yet-received) messages. `M` is initialized to an empty set.

In this model, there exists at most one process which takes finitely many steps; all other processes take infintely many step (in other words at most 1 process can crash).

If a process takes infinitely many steps, it delivers all messages sent to it by processes.

### Proof

We will prove the FLP Impossibility result by contradiction. We assume that there is some deterministic algorithm `P` which solves the problem.

A configuration is a snapshost of a run, it includes:

- the current state of the message pool `M`
- the proposal of each process
- the sequence of messages received thus far by each process

A run represents a walk through a big (possibly infinite) directed graph, with vertices corresponding to configurations and edges corresponding to message deliveries.

Types of configurations:

- 0-valent: ll possible sequences of message deliveries lead to the all-zero outcome
- 1-valent: all possible sequences of message deliveries lead to the all-one outcome
- bivalent: neither 0-valent nor 1-valent configuration.

The idea is now to prove that there is always an infinite path of bivalent we can take, no matter the algorithm `P`.

### Lemma 1: There exists a bivalent initial configuration

Consider an initial configuration `Xi = 11...1100...00`, such that the first `i` processes propose `1` and the rest `n - i` processes propose `0`.
The configuration `X0 = 0...0` is therefore 0-valent, as if the algorithm `P` is correct, it would have to satisfy the validity property which stipulates that a decided value has to be proposed first. Since the proposed value is only `0` then the decided value can only be `0` afterwards. Similarly, the configuration `Xn = 1...1` is 1-valent.

Two configurations are similar iff:

1. For every process, the proposals are identical
2. For every process, the states are identical
3. The message pools are identical

Now, considering that we start with a 0-valent configuration `X0` and end up with a 1-valent configuration `Xn`, in between, there has to be at least 1 pair `Xj` and `Xj+1` where `Xj` is 0-valent and `Xj+1` is valent (proof by contradiction, suppose there isn't, then every pair is 0-valent, meaning that the pair `Xn-1` and `Xn` are both 0-valent, which isn't possible since `Xn` is 1-valent).

The configurations `Xj` and `Xj+1` are the same except the proposal of `pj+1`, which is `0` in `Xj` and `1` in `Xj+1`. Now, if we crash `pj+1` before it can propose at all, we can deliver the same sequence of messages from `Xj` and `Xj+1`. Now, they start with the same proposals, the same (empty) state and the same message pools, upon delivery of the messages in the same order, every subsequent configuration must have the same proposals, the same state (because the algorithm `P` is deterministic) and the same message pools in both runs. In the run from `Xj`, we know that the final configuration causes the algorithm to decide `0`, therefore, in the run from `Xj+1`, the algorithm must also decide `0`, however, this is a contradiction to the 1-valency of `Xj+1`. In conclusion, there must be at least 1 bivalent starting configuration.

### Lemma 2

Let `Ci` denote a bivalent configuration and a message (p, m) in the message pool. Then there exists a sequence of message delvieries such that:

1. The last step of the sequence is the delivery of (p, m)
2. The end of the sequence `Ci+1` is a bivalent configuration.

Case 1: Delivering leads to a bivalent configurations, trivial case.

Case 2: Delivering leads to a 0-valent (without loss of generality) configuration.

Let `Ci+1` be a configuration reachable from `Ci` via the delivery of a sequence of messages different from (p, m). The configuration is:

1. 0*-configuration: delivering (p,m) at `Ci+1` leads to a 0-valent configuration
2. 1*-configuration: delivering (p,m) at `Ci+1` leads to a 1-valent configuration
3. bivalent*-configuration: delivering (p,m) at `Ci+1` leads to a bivalent configuration

Therefore, `Ci` is a 0*-configuration. Now, we want to prove that starting from `Ci` there exists a non-0*-configuration.

If that configuration is bivalent*, then we have proved that there existss a bivalent configuration. Therefore, the configurations must be 1* configuration. Let that configuration be `Y`, and the 0* configuration before it `X` (the same argument that this transition exists that we used in lemma 1). By delivering (p', m') from `X` we end up in `Y`.

Because `X` is a 0* configuration, when we deliver (p,m) we end up in a 0-valent conviguration, and now when we deliver (p',m') we must still be in a 0-valent configuration - `V`.

When we deliver (p', m') from `X`, we end up in `Y` which is a 1*configuration and then when we deliver (p, m) we end up in a 1-valent configuration `Z`.

![Image for lemma 2 proof](images/flp-lemma2.png)

Scenario 1: p and p' are not the same process, therefore at `V` and `Z`, the proposals must be the same, the states must be the same (because the processes cannot know in which order the messages are delivered globally) and the messages pools are the same. Therefore, from `V`, we deliver a sequence of messages `Sm` and end up deciding `0`. From `Z`, if we deliver the same sequence of messages `Sm`, we must end up deciding the same, therefore we must decide `0`, but, this is a contradiction to the assumption that `Y` is a 1* ocnfiguration.

Scenario 2: p and p' are the same process. Now, p knows the order of the delviery of the messages m and m' and can therefore use this information to decide on `0` or `1` (because p's state might not be the same if first we deliver m and then m', compared to if we deliver m' and then m). However, if we crash p before it can decide, for all the processes outside P, the state will be the same. The message pools at `V` and `Z` are the same, the proposals are the same, but, as in scenario 1, we decide differently, which is a contradiction.

Combining Lemma 1 and Lemma 2, we can devise this adverserial example:

1. Start in a bivalent configuration `C0`
2. Deliver the oldest message in the message pool (p, m)
3. Using Lemma 2, we know that there must exist a bivalent configuration `Ci+1` the run ends up in when we deliver (p,m) last.
4. Go to step 2.

With this, we prove that there exists an infinite run where the algorithm never decides even if only 1 process crashes.
