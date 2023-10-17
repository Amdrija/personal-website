---
title: "Concurrent Algorithms"
date: 2023-10-18T00:06:00+02:00
draft: false
summary: "With the increase of availability of multi-core hardware, it has become vital to understand concurrent algorithms in order to fully exploit the capabilities of the machines. This course teaches exactly that."
---

# Concurrent Algorithms

## Assumptions

### Process

Processes model a sequential program, which means that, after invoking an operation op1 on some object O1, a process does not invoke a new operation (on the same or on some other object) until it receives the reply for op1.. In our model we assume that there are N processes which are unique and know each other. Additionally, a process either executes the algorithm assigned to it or crashes without ever recovering.

A process that doesn't crash in a given execution is considered correct.n (on the same or on some other object) until it receives the reply for op1.

### Safety

Safety properties stipulate that nothing bad should happen. A property that can be violated at some time point T and never be satisfied again is a safety property.

Example: not lying

### Liveness

Liveness properties stipulate that something good should happen. At any time T there is some hope that the property can be satisfied at a later time T' >= T.

Example: saying anything

It is trivial to have one without the other, however, the hard part (i.e telling the truth) is satisfying both.

### Compare and swap

```javascript
compare_and_swap(old_value, new_value) {
    y = x;
    if x == old_value
        x = new_value;

    return y;
}
```

Locking with c&s:

```javascript
lock() {
    while LOCKED == compare_and_swap(UNLOCKED, LOCKED);
}

unlock() {
    compare_and_swap(LOCKED, UNLOCKED);
}
```

### Test and Set

```javascript
test_and_set() {
    y = x;
    x = 1;

    return y;
}

set_state(value) {
    x = value;
}
```

Locking with test and set:

```javascript
lock() {
    while 1 == test_and_set();
}

unlock() {
    set_state(0);
}
```

### Wait Freedom

Any correct process that invokes an operation eventually gets a reply, no matter what happens to the other processes (very slow or crash)

### Atomicity (Linearizability)

Every operation appears to execute at some indivisible point in time (called linearization point) between the invocation and reply time events.

## Registers

Registers are simple object on which we can perform `read()` or `write(value)` operations.

### Register Types

Based on value:

- Binary: containt 1 bit (0 or 1)
- Multi-valued: contain any value from an infinite set (bounded or unbounded)

Based on the number of concurrent processes:

- Single reader, single writer - SRSW
- Multiple readers, single writer - MRSW
- Multiple readers, multiple writers - MRMW

Based on concurrency guarantees:

- Safe
- Regular
- Atomic

#### Safe register

Safety: A read that is not concurrent with a write returns the last written value. A safe register ensures safety. It only supports a single writer.

![Safe execution](images/safe-execution.png)

#### Regular register

Regularity: A read that is concurrent with a write returns the value written by that write or the value written by the last preceding write. A regular register ensures regularity and safety. It only supports a single writer.

Read-write inversion: when two consecutive (non-overlapping) reads are concurrent with a write, it is possible for a regular register to return the newely written value on the first read and the previously written value on the second read.

![Regular execution](images/regular-execution.png)

#### Atomic register

Atomicity: An atomic (linearizable) register is one that ensures linearizability. Such a register ensures the safety and regularity properties above, but in addition, prevents the situation of read-write inversion. The second read must succeed the first one in any linearization, and thus must return the same or a "newer" value.

![Atomic execution](images/atomic-execution.png)

## Register Reductions

### From (binary) SRSW safe register to (binary) MRSW safe register

We use an array of SRSW registers Reg[1...N], one per reader process.

```javascript
Read() {
    return (Reg[i].read());
}

Write(v) {
    for j in range(1, N)
        Reg[j].write(v);
}
```

Proof Assume first that base 1W1R registers are safe. It follows directly from the algorithm that a read of R (i.e., R. read() ) that is not concurrent with a R. write() operation returns the last value deposited in the register R. The obtained register R is consequently safe while being 1WMR.

Let us now suppose that the base registers are regular. We will argue that the high-level register R constructed by the algorithm is a 1WMR regular one. Since a regular register is safe, the argument above implies that R is safe.

Hence, we only need to show that a read operation R. read() that is concurrent with one or more write operations returns a concurrently written value or the last written value. Let pi be any process that reads some value from R. When pi reads the base regular register REG[i] pi returns (a) the value of a concurrent write on REG[i] (if any) or (b) the last value written to REG[i] before such concurrent write operations. If the concurrent write R.write(v) managed to call Reg[i].write(v), then the concurrent read Reg[i].read() will return either the new value or the last written value. Otherwise, if the Reg[i].read() and Reg[i].write(v) aren't concurrent, due to the safety property, the Reg[i].read() will return the last written value. Therefore the register is regular.

- Works for building MRSW safe register from SRSW safe register.
- Works for building MRSW regular register from SRSW regular register.
- Does not work for atomic register.

### From binary MRSW safe to binary MRSW regular

We use one MRSW safe register

```javascript
Read() {
    return Reg.read();
}

Write(v) {
    if old != v {
        Reg.write(v);
        old = v;
    }
}
```

Since the underlying base register is safe, a read that is not concurrent with any write returns the last written value.

Now consider a read operation r that overlaps with one or more write operations. If none of these operations change the value of the register, i.e. write to the underlying base safe register `Reg`, we are back to the previous case, as the read of `Reg` performed by r does not overlap with any write on `Reg`.

Now suppose that a concurrent operation changes the value of `Reg`. Thus, the value written by the last write that precedes r is different from the value written by the concurrent write. BUt the range of these values is {0, 1}. SInce the read on the underlying base register returns a value in the range to any read, any of these values are accepted by the regularity conditions. Therefore the high-level register is regular.

- Works for single reader registers
- Doesn't work for multi-valued registers
- Doesn't work for atomic registers

### From binary to M-valued MRSW regular

We use an array of MRSW Registers Reg[0 ... M] initialized to [1,0,...,0].

- The value `v` is represented by 0s in registers `1` to `v - 1` and then `1` in register at position `v`.

```javascript
Read() {
    for j in range(0, M) {
        if Reg[j].read() == 1
            return j;
    }
}

Write(v) {
    Reg[v].write(1);
    for j in range(v - 1, 0) {
        Reg[j].write(0);
    }
}
```

Proof A R. write(v) operation trivially terminates in a finite number of its own steps: the for loop only goes through v iteration.

To see that a R. read() operation terminates in at most v iterations of the while loop, observe that whenever the writer changes sets REG[x] from 1 to 0, it has previously set to 1 another entry REG[y] such hat x < y ≤ b. Therefore, if a reader reads REG[x] and returns the new value 0, then a higher entry of the array is set to 1. As the running index of the while loop starts at 1 and is incremented each time the loop body is executed, it follows that the loop always terminates, and the value j it returns is such that 1 ≤ j ≤ b.

Proof Consider first a read operation that is not concurrent with any write, and let v be the last written value. By the write algorithm, when the corresponding R. write(v) terminates, the first entry of the array that equals 1 is REG[v] (i.e., REG[x] = 0 for 1 ≤ x ≤ v − 1). Because a read traverses the array starting from REG[1], then REG[2], etc., it necessarily reads until REG[v] and returns the value v.

Let us now consider a read operation R. read() that is concurrent with one or more write operations R. write(v1), . . ., R. write(vm) (as depicted in Figure 4.7). Let v0 be the value written by the last write operation that terminated before the operation R. read() starts. For simplicity we assume that each execution begins with a write operation that sets the value of R to an initial value. As a read operation always terminates (Lemma 2), the number of writes concurrent with the R. read() operation is finite. By the algorithm, the read operation finds 0 in REG[1] up to REG[v −1], 1 in REG[v], and then returns v. We are going to show by induction that each of these base-object reads returns a value previously or concurrently written by a write operation in R. write(v0), R. write(v1), . . ., R. write(vm). Since R. write(v0) sets REG[v0] to 1 and REG[v0 − 1] down to REG[1] to 0, the first base-object read performed by the R. read() operation returns the value written by R. write(v0) or a concurrent write. Now suppose that the read on REG[j], for some j = 1, . . . , v − 1, returned 0 written by the latest preceding or a concurrent write operation R. write(vk) (k = 1, . . . , m). Notice that vk > j: otherwise, R. write(vk) would not touch REG[j]. By the algorithm, R. write(vk) has previously set REG[vk] to 1 and REG[vk − 1] down to REG[j + 1] to 0. Thus, since the base registers are regular, the subsequent read of REG[j + 1] performed within the R. read() operation can only return the value written by R. write(vk) or a subsequent write operation that is concurrent with R. read(). By induction, we derive that the read of REG[v] performed within R. read() returns a value written by the latest preceding or a concurrent write.

- Doesn't work for atomic registers.
  Consider that the register had a value 10, and then the writer did 2 writes w(1) and then w(9). The first read r1 is concurrent with both writes, it missed the first one so it continues to read, but very slowly. Then w(1) completes and the second write w(9) starts and writes a 1 at 9 and starts clearing. The read r1 now manages to find the 1 at 9 and then returns 9. The read r2 starts now and finds a 1 at 1 from w(1) and returns 1. This is read write inversion.

### From SRSW regular to SRSW atomic

For this, we need an "unbounded" sequence number. This is not very realistic, however, there are techniques to recycle the timestamps of bounded sequence numbers, so that they appear unbounded.

Generally, each register will contain, along the data, a sequence number or a timestamp.

```javascript
Read() {
    (timestamp, value) = Reg.read();
    if timestamp > last_timestmap {
        last_timestamp = timestamp;
        last_value = value;
    }

    return last_value;
}

Write(value) {
    timestamp++;
    Reg.write(value, timestamp);
}
```

Safety: trivial.
By memorizing the `last_timestamp` and `last_value` in the reader, we can prevent a read inversion, as the first read will update the `last_timestamp` and `last_value`, therefore, when the second read happens, it will read a lower `timestamp` and will just return the `last_value`.

Doesn't work for multiple readers, because the second reader doesn't have the updated `last_timestamp` and `last_value`, therefore, a read inversion could still happen.

### From SRSW atomic to MRSW atomic

If we tried the simple transformation with N SRSW atomic registers, one for each reader:

```javascript
Read() {
    (timestamp, value) = Reg.read();
    if timestamp > last_timestmap {
        last_timestamp = timestamp;
        last_value = value;
    }

    return last_value;
}

Write(value) {
    timestamp++;
    for j in range(1,N) {
        Reg[j].write(value, timestamp);
    }
}
```

This will not be atomic. Consider 3 processes, pw - writer process, p1 - reader process and p10 - reader process. The writer starts writing a value `x` to the register and overwrites the `Reg[1]`. Concurrent to the write, p1 reads and returns the new value `x`, but the writer still hasn't managed to overwrite the `Reg[10]`, so when the p10 reads, it will return the old value. This unfortunately violates atomicity as `Reg[10]` would have to return the new value `x` as well.

In order to make this atomic, we will need to have communication between each two readers, by using the atomic SRSW registers. Thus, we would need N<sup>2</sup> registers. In `ReadReg[i][j]`, the reader is p<sub>i</sub> and the writer is p<sub>j</sub>.

```javascript
Read() {
    for j in range(1, N) {
        (timestamp[j], value[j]) = ReadReg[i][j].read();
    }

    (timestamp[0], value[0]) = WriteReg[i].read();
    (timestmap, value) = (timestamp[k], value[k]) where timestamp[k] = max(timestamp);

    for j in range(1,N) {
        ReadReg[j][i].write(value, timestamp);
    }

    return value;
}


Write(value) {
    timestamp := timestamp + 1;
    for j in range(1,N) {
        WriteReg[j].write(value, timestamp);
    }
}
```

It would not work for multiple writers, as they compute timestamp locally. For example, let's say that writer p1 wrote 5 times, eat means it's current timestamp is 5. Now, let's say that p2 wrote, it's timestamp would now be 1. How would the reader now which timestamp is correct? If it returns the maximum timestamp it would incorrectly return old value (violates safety).

### From MRSW atomic to MRMW atomic

Following the intuition from the previous example, we need to have communication between the writers as well.
We use N MRSW atomic registers, the writer of `Reg[i]` is p<sub>i</sub>.

```javascript
Read() {
    for j in range(1,N) {
        (timestamp[j], value[j]) = Reg[j].read();
    }
    (timestamp, value) = (timestamp[k], value[k]) where timestamp[k] = max(timestamp) and k is max;

    return value;
}

Write() {
    for j in range(1,N) {
        (timestamp[j],value[j]) = Reg[j].read();
    }

    (timestamp, value) = (timestamp[k], value[k]) where timestamp[k] = max(timestamp);


    timestamp = timestamp + 1;
    Reg[i].write(timestamp, value);
}
```

We need to choose the maximum (or minimum) such k, so that two concurrent write operations don't choose the same sequence number. For example, assume we have two processes which write, p<sub>1</sub> and p<sub>2</sub>. They write concurrently the values `1` and `2` respectively. Because the neither one completes the write operation before the other one reads, the resulting registers look like this: `Reg = [(timestamp: 1, value: 1), (timestamp: 1, value: 2)]`. Now, we have 2 reads which happen sequentially one after another. If we don't impose the ordering, the first read could read the value 1, the second value 2. This would violate safety, as the reads which are not concurrent with a write would have to return the last written value (which should be the same).

With the ordering, it is atomic, because the only case when we can possibly return different values on reads are when maximum timestamp is not unique. However, the ordering property will always force us to pick the same timestamp in this situation, thus we will always return the same value. Therefore, a read write inversion is not possible.

Safety and regularity are trivially satisfied.
