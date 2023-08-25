---
title: "Go Is Too Simple"
date: 2023-08-30T18:50:08+02:00
draft: false
summary: "Go is a very simple language, in fact, it's so simple that it's possible to pick it up in a week. This, alongside it's concurrency model, is, arguably, one of Go's greatest strengths. However, this simplicity comes at the cost of ergonomics."
---
Go is a very simple language, in fact, it's so simple that it's possible to pick it up in a week. This, alongside it's concurrency model, is, arguably, one of Go's greatest strengths. However, this simplicity comes at the cost of ergonomics.

I have used Go to make a decentralized network of nodes who are able to reach a consensus on some value (in this case I used one of the simplest algorithms - [Paxos](https://en.wikipedia.org/wiki/Paxos_(computer_science))). This project is the prime example of Go's intended use case, with a lot of need for multi-threading (to process multiple messages coming from different nodes at the same time) and the need for good performance (so that the huge amount of messages don't cause the node to slow down). While it was relatively easy to reason about concurrency, thanks to Go's intuitive concurrency model, it always felt like the language was not quite up there. There were a lot of things which seemed unnecesarily tedious to do.

## Error Handling

I would consider myself a big advocate of "errors as values" type of handling and I think it makes a lot of sense to discern between recoverable and unrecoverable errors. Compared to exceptions, which can crash your program unless you have some global `try-catch` block to handle it, the compiler also forces you to handle at the callsite and reason about error handling. As a consequence, you are going to write more robust code and there's a lower chance of missing to handle the error.

Considering this, it is good that Go let's you return errors from functions, instead of throwing an exception, but the current way of doing error handling could be improved. In my experience, a lot of error handling can be boiled down to this block of code:

```go
func printSum(a, b string) error {
	x, err := strconv.Atoi(a)
	if err != nil {
		return err
	}
	y, err := strconv.Atoi(b)
	if err != nil {
		return err
	}
	fmt.Println("result:", x + y)
	return nil
}
```


A lot of times you are just going to check if an error is returned from a function call (in other words if it's null) and just return it. It is unnecessary repetition and makes the code harder to read. There are currently some proposals how to improve this, one of which is the [`handle-check` construct](https://github.com/golang/proposal/blob/master/design/go2draft-error-handling.md) which simplifies one of the frequent cases of error handling:

```go
func printSum(a, b string) error {
	x := check strconv.Atoi(a)
	y := check strconv.Atoi(b)
	fmt.Println("result:", x + y)
	return nil
}
```
I like this proposal, but only for the default case where we just return the error again, otherwise, if there's a need for some special error handling code, we should use explicit error handling. This makes the code a bit tidier and easier to read.

## Null References, The Billion Dollar Mistake

There's a famous talk about `null` references [here](https://www.infoq.com/presentations/Null-References-The-Billion-Dollar-Mistake-Tony-Hoare/). Most popular languages today have `null`, including JavaScript, Java, C#, C++ and Go. Lately, a lot of languages have started moving away from `null`, for example, C# has introduced nullable reference types (enabled by default in .NET 6) in order to minimize the amount of `null` dereference errors. The compiler checks whether the variable has been assigned a value that isn't `null` or if it has been checked against `null`. It then warns you if you have a possible null dereference error. Unfortunately, not all libraries have been updated to work with nullable reference types, so it's a bit painful to use until everything catches up. Unfortunately, Go doesn't prevent you from dereferencing a `null` (`nil`) pointer, which can lead to runtime errors. Usually, if you follow best practices (like returning `nil` only if you have an error) this shoouldn't happen frequently, however, they are easy to miss and can cause a lot of carnage when they occur. I'm still puzzled why they have included `nil` in the language, because it doesn't seem like it would be hard to at least introduce some static analysis checks to prevent null reference errors.

## The cost of ergonomics

One benefit of a simple programming language is that the compiler is simple to, so it can perform it's task very quickly. In fact, Go is usually praised for fast compilation times, which significantly improve the speed of development iterations. There are languages which have addressed the issues discussed in this article, one of them being Rust. Rust is quite a complex language to learn, with lots of features that make developers' lives easier, however, this comes at the cost of slow compilation times. While the `Option<T>` type (used for indicating "nullable" values) and `Result<T,E>` type (used for returning errors) may not be the main contributors to Rust slow compilation, they certainly contribute. At Google's scale, this means that developers spend more time doing nothing (waiting for the compiler) and more resources are used for compiling programs, which drives development costs. At the end of the day, they made Go for their internal purposes first and somebody certainly did the math to calculate the wasted costs. It's just a shame that the features mentioned in this article (and some others) were left out, because they would certainly make Go a lot better than it is today (not to say that it's bad).