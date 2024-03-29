---
title: "Visitor pattern in Rust serde crate"
date: 2024-01-17T01:10:12+02:00
draft: false
summary: "Have you ever wondered why does Rust serde crate use the visitor for deserialization? On the first glance, this may seem needlessly complicated..."
---

The serde crate uses the visitor pattern for deserialization, requiring that you implement both the `Deserialize` trait and the custom `Visitor` for your type. Most of the time, you can use the `derive` macro to generate this boilerplate code for you. However, if you have ever had to code a `Deserialize` implementation for a type, you would probably wonder why you even needed a visitor. Hopefully, you will understand this by the end of this post.

Currently, your are working in a startup which specializes in running blazingly fast™ computations on 2D points. In order to achieve performance targets you've chosen to use Rust (and you've needed an excuse to use it for some time). The management wants to store every point the software ever processes in order to run some data analysis once the company receives more funding and can afford to hire a data scientist. Somewhere in code you have defined a struct `Point`:

```rust
struct Point {
    x: i32,
    y: i32,
}
```

You go online to find a solution to your problem and a lot of redditors suggest the serde crate. After carefully reading the docs for 2 minutes, you realize that serde seems very complex, there are multiple serialization formats and all seem a bit overkill for your use case. You just want to write the point to a file in the format `x,y` and to be able to later deserialize from this format. Serde forces you to to then implement a serializer, a deserializer, then a serialize, deserialize and visitor trait implementations for the type. You begin to wonder why you would need a visitor in the first place for deserialiation, you see this code snippet:

```rust
impl<'de> Deserialize<'de> for Point {
    fn deserialize<D>(deserializer: D) -> Result<Point, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_struct(PointVisitor)
    }
}

struct PointVisitor;

impl<'de> Visitor<'de> for PointVisitor {
    type Value = Point;

    fn visit_map<V>(self, mut map: V) -> Result<Point, V::Error>
    where
        V: MapAccess<'de>,
    {
        let x;
        let y;

        // Extract x and y from the map
        // ...

        Ok(Point::new(x, y))
    }
}
```

This seems way too complicated with multiple levels of indirection just to deserialize a struct. Plus, the `deserialize` call isn't actually doing anything, it is the visitor with all the implementation details. You are sure that there is a simpler way to do this, by moving the visitor implementation into the `deserialize` method. So you decide to roll your own `Deserialize` trait:

```rust
trait Deserialize<D>: Sized {
    type Error;

    fn deserialize(input: D) -> Result<Self, Self::Error>;
}
```

The `Deserialize` trait is generic so that you can actually implement deserialization from multiple input types. Currently, you just need to implement deserialization for the format `x,y`. For example, a string `"3,4"` would deserialize into a `Point{x: 3, y: 4}`. The next code snippet does just that:

```rust
#[derive(Debug)]
struct PointDeserializationError;

impl Deserialize<&str> for Point {
    type Error = PointDeserializationError;

    fn deserialize(input: &str) -> Result<Self, Self::Error> {
        let split = input.split(",").collect::<Vec<_>>();

        // error handling ommitted for brevity

        Ok(Point {
            x: split[0].parse().map_err(|_| PointDeserializationError)?,
            y: split[1].parse().map_err(|_| PointDeserializationError)?,
        })
    }
}
```

Okay, this was easy. Some time goes by, life's good and you are churning out code like never before. At some point (pun intended), the management starts complaining about the storage costs. You go to take a look and realize that maybe storing strings wasn't such a good idea in the first place. The `x` and `y` values are large and occupy a lot of space (up 21 bytes per point). You go back to the drawing board to think of a solution to this problem.

After some thinkering, you realize that you can store a `Point` in a single 64 bit unsigned integer. The first 32 bits are occupied by the value of `x` and the last 32 bits are occupied by the value of `y`. You quickly go to implement deserialization in such a format:

```rust
impl Deserialize<u64> for Point {
    type Error = PointDeserializationError;

    fn deserialize(input: u64) -> Result<Self, Self::Error> {
        let y = input as i32;
        let x = (input >> 32) as i32;

        Ok(Point {
            x,
            y,
        })
    }
}
```

You run some benchmarks, and, as it turns out, this format uses 69% less storage space (nicee, completely made up). The management is happy for this huge optimisation and they decide to give you a bonus. You are happy to spend this money on a trip to Hawaii and you are proud of yourself, thinking that Harvard should call you to give a lecture.

Some much more time goes by. The startup you are working for has turned out successful and you are drowning in that sweet stock money. The management decides that it is time to refresh the user experience of your software. Their vision is to build a web application which will ease the process of submitting points for computation. They hire a couple of frontend engineers which start working on the app. You make an agreement that the client will send JSON objects to the backend, thinking that it should be pretty straightforward to deserialize this JSON to a `Point`. Considering that they need quite some time to get to the point where they integrate with the backend and that you have a lot of new features that need to be implemented you left it at that.

Fast forward to today, it is time to implement deserialization from JSON for `Point`. You haven't touched this code in a long time and you don't quite remember how you did it. You go to take a look and realize that you've just played yourself:

```rust
impl Deserialize<&str> for Point {
    type Error = PointDeserializationError;

    fn deserialize(input: &str) -> Result<Self, Self::Error> {
        // ...
    }
}
```

There already exists an implementation for deserializing from string data. Since this wasn't used in a long time, you completely forgot about it. You cannot delete it as you have to keep the backwards compatibility, plus deleting it won't really solve the problem that you have. What if a feature comes up that you may need to deserialize from another format represented as a string (such as toml, csv etc.). You could possibly define something like this:

```rust
struct Json(String)

impl Deserialize<Json> for Point {
    type Error = PointDeserializationError;

    fn deserialize(input: Json) -> Result<Self, Self::Error> {
        // ...
    }
}
```

It is a bit hacky, but this could work. You'd just have to define new types for each format. Soon, you realize that this isn't a solution to the problem either. If in the future there is another struct that needs to be deserialized from JSON, you'd have to implement JSON parsing twice or move the parsing of JSON to another type and then that type produces a map which you could use. If you really think about it, structs are just maps, deserializing a struct just means that you get key-value pairs from the map and set the appropriate struct fields. You could invision something like this:

```rust
struct Json(String)

impl Json {
    fn get_map<K, V>() -> HashMap<K, V> {
        //...
    }
}

impl Deserialize<HashMap<K, V>> for Point {
    type Error = PointDeserializationError;

    fn deserialize(input: HashMap<K, V>) -> Result<Self, Self::Error> {
        // ...
    }
}
```

In order to deserialize, you'd first need to create a `HashMap` from Json and then deserialize from this. This will require that the types of the structs members (in this case `Point`) also implement deserialize from type `V`, otherwise, this won't work as they are possibly not the same type. You've been backed to a corner, it doesn't seem like any solution you think will work. However, this last example looks an awfully lot like something you've already seen, and, in a last ray of hope, you decide to ask ChatGPT. It spews out this:

```rust
impl<'de> Deserialize<'de> for Point {
    fn deserialize<D>(deserializer: D) -> Result<Point, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_struct(PointVisitor)
    }
}

struct PointVisitor;

impl<'de> Visitor<'de> for PointVisitor {
    type Value = Point;

    fn visit_map<M>(self, mut map: M) -> Result<Point, M::Error>
    where
        M: MapAccess<'de>,
    {
        let x;
        let y;

        // Extract x and y from the map
        // ...

        Ok(Point::new(x, y))
    }
}
```

Then, it hits you. Your `Deserialize` implementation is tightly coupled to the input format. If you have 1 format, this is perfectly fine and you wouldn't run into issues described above. However, the moment that you decide to implement deserialization for multiple formats you'll run into issues. The solution to this problem would be a format represented as a Rust API. Then, for each format you would need to implement deserialization from the input into this "Rust API format" - let's call it an intermediate format. Then, a defined type only has to implement deserialization from this intermediate format. This is precisely what the serde crate does.

First, the `deserialize` method takes in a `Deserializer`, which is responsible for converting the input into some kind of generalized object. In this case this would be an object which implements `MapAccess`. It needs this intermediate form, because a generic `Deserializer` cannot possibly know to instantiate every struct type. It takes a visitor which implements deserialization from the intermediate format into the type and calls an appropriate method for this visitor, passing in a value of the "intermediate" object. Something like this:

```rust
trait Visitor {
    type Value;
    fn visit_map<M>(self, mut map: M) -> Result<Self::Value, M:: Error>
    where
        M: MapAccess;
}

trait Deserializer {
    type Error;
    fn deserialize_struct<V>(self, visitor: V) -> Result<V::Value, Self::Error>
    where
        V: Visitor;
}

struct JsonDeserializer {
    //...
}

struct JsonError;

impl Deserializer for JsonDeserializer {
    type Error = JsonError;
    fn deserialize_struct<V>(self, visitor: V) -> Result<V::Value, Self::Error>
    where 
        V: Visitor
    {
        //imagine there is a method to get a map access object on the JsonDeserializer
        let map = self.parse_map().map_err(|_| JsonError)?;

        visitor.visit_map(map).map_err(|_| JsonError)
    }

}
```

Now, you've completely decoupled the deserialization format from the type specific deserialization. This is achieved through double dispatch - `Point::deserialize` (defined by you) calls `JsonDeserializer::deserialize_struct` (defined by another module to deserialize JSON to the MapAccess object), which then calls `PointVisitor::visit_map` to finally deserialize the `MapAccess` object to `Point`. This way the `JsonDeserializer` type doesn't need to know how to instantiate the type being deserialized (here it's `Point`, which is trivial, but it could be possible that you have to run some additional code when instantiating an object). The `Point` type also doesn't need to know the specifics of the format it is deserialized from. It only has to know how to deserialize from the intermediate format (in this case the `MapAccess` object).

One could possibly envision that a `Deserializer::deserialize_struct()` could return an implementation of `MapAccess` instead of calling the visitor. There are multiple ways to do this, either by returning a `Box<dyn MapAccess>` or `impl MapAccess`. Unfortunately, in Rust you would have return `Box<dyn MapAccess>` on the `Deserializer` trait as the language currently doesn't support returning `impl MapAccess`. Because the `impl MapAccess` is just compile time syntactic sugar, it forces the `Deserializer::deserialize_struct()` function to always return the same implementation of `MapAccess`. Therefore, the deserializer wouldn't be able to decide at runtime which object to return. This would be a limitation of this approach.

On the other hand, it seems like the `Box<dyn MapAccess>` return type could be useful. However, consider this example where we want to deserialize an `i32`  (taken from [serde documentation](https://serde.rs/impl-deserialize.html)). Something like this:

```rust
trait Deserializer {
    type Error;
    fn deserialize_struct(self) -> Result<Box<dyn MapAccess>, Self::Error>;
}

struct JsonDeserializer {
    //...
}

struct JsonError;

impl Deserializer for JsonDeserializer {
    type Error = JsonError;
    fn deserialize_struct(self) -> Result<Box<dyn MapAccess>, Self::Error> {
        //imagine there is a method to get a map access object on the JsonDeserializer
        let map = self.parse_map().map_err(|_| JsonError)?;
        
        Ok(Box::new(map))
    }

}

impl Deserialize for Point {
    fn deserialize<D>(deserializer: D) -> Result<Point, D::Error>
    where
        D: Deserializer,
    {
        deserializer.deserialize_struct()

        //Code from the Visitor
        let x;
        let y;

        // Extract x and y from the map
        // ...

        Ok(Point::new(x, y))
    }
}
```

In this case, this is again fine, because there is only 1 way to deserialize a `Point`. However, imagine the next scenario: an input format which is sometimes and `i32` and sometimes an `i64`. If serde didn't use the visitor pattern, but rather just returned the deserialized type (or in the case of struct a `Box<dyn MapAccess>`), the deserializer would have to make a decision how to deserialize an `i32` from an `i64`. The most sane option is that it errors if the `i64` cannot fit in `i32`, but maybe we want to implement some other behaviour. This is why the visitor pattern is useful as we could define how to get our value from multiple different representations:

```rust
impl<'de> Deserialize<'de> for i32 {
    fn deserialize<D>(deserializer: D) -> Result<i32, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_any(I32Visitor)
    }
}

struct I32Visitor;

impl<'de> Visitor<'de> for I32Visitor {
    type Value = i32;

    fn visit_i32<E>(self, value: i32) -> Result<Self::Value, E>
    where
        E: de::Error,
    {
        Ok(value)
    }

    fn visit_i64<E>(self, value: i64) -> Result<Self::Value, E>
    where
        E: de::Error,
    {
        Ok(value as i64)
    }
}
```

The `deserialize_any` method will try to deserialize an `i32` based on the input value. The visitor could possibly define how to make a struct from a `u64`, as would be the case for the optimized `Point` representation, or from an object which implements the `SeqAccess` trait for sequential access, etc.

With the visitor pattern, we can let the deserializer decide how to deserialize some input into an "intermediate representation", and then the visitor could implement the deserialization from the "intermediate representation" into the actual data.

I remember thinking how useful design patterns were when I first learnt about them in the university. I tried to cram them everywhere, then I was disappointed when they didn't work and I lost some faith in most of them. I'm really glad that I took the time to understand how serde works and I gained some appreciation for the visitor pattern and it's usefulness.

I'm not the author of serde and I'm probably missing something, but I think this is a pretty good model of how deserialization works. If I am incorrect, feel free to call me out, but please give some feedback so I can improve :D.
