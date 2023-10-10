---
title: "Static Site Generators"
date: 2023-08-29T19:25:37+02:00
draft: false
summary: "This blog was built with Hugo, which is a static site generator. If you aren't familiar with the term, I'll try to briefly explain it in this article and give some pros and cons of various ways to build a blog."
---

This blog was built with Hugo, which is a static site generator. If you aren't familiar with the term, I'll try to briefly explain it in this article and give some pros and cons of various ways to build a blog.

## Static vs Dynamic websites
There are really only exists 2 kinds of websites, static and dynamic. Static sites are built of HTML files that don't change unless their creator changes them on the server where they are hosted. With each load, we will always get the same HTML file which our browser renders. On the other hand, the HTML file for dynamic websites is built on the fly, meaning that when we load a page, the server will run some piece of code that builts an HTML file (or the browser can do it, by asking the server just for the data, isntead of the whole HTML). This means that we don't need access to the server in order to change the actual HTML that is shown, but that it will be generated programatically. 

## Dynamic websites

Generally, writting HTML can get tedious, especially if you have to write a lot of pages that look the same, but just have different content. It's not as readable, because the tags obscure the content, but also, if you want to change something, you would have to go through all the HTML files and change it. The more posts you have, the more likely it will be to make an error like this. Take a look at this simplified example of an HTML page from this blog:

```HTML
<!DOCTYPE html>
<html lang="en">

<head>

    <link rel="stylesheet" href="/css/main.min.css">

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Hello World</title>
</head>

<body>
    <header>
        <nav>
            <ul>
                <li>
                    <a href="/#">Home</a>
                </li>
                <li>
                    <a href="/#about">About</a>
                </li>
                <li>
                    <a href="/#projects">Projects</a>
                </li>
                <li>
                    <a href="/#posts">Blog</a>
                </li>
            </ul>
        </nav>
    </header>

    <main class="container">
        <section class="post-page">
            <div class="post-page-header">
                <div class="post-page-title">
                    <h1>Hello World</h1>
                    <h4>2min</h4>
                </div>

                <h4>April 20, 2069</h4>

            </div>
            <h3 id="title">Title</h3>
            <p>One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a
                horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his
                brown belly, slightly domed and divided by arches into stiff sections.</p>
        </section>


    </main>
    <footer>
        <h4>Andrija Jelenkovic © 2023 All rights reserved</h4>
    </footer>
</body>

</html>
```
There's 50ish lines of code here, but only the content inside `<h1>`, `<h3 id="title">` and `<p>` is actually important to the post. Everything else is just boiler plate. Also, if you need to change the navigation - `<nav>`, you would have to change it on every single page, which is error prone as I mentioned.

Some smart people have figured this out a long time ago, and that is how WordPress was made. It is a dynamic website (a web application) with which you can actually differentiate between the look of your site (theme) and the actual conent of your pages. You have some special admin pages where you can influence what HTML the WordPress will generate when it gets a request for a page. You pay a price in load times, because now the server has to dynamically generate HTML, but you solve both problems, which is great, right? 

Well, the problem with wordpress is that most website don't really require the ability for the user to be able to influence what is shown (HTML), just the website owners. If the content doesn't change frequently, it means that our page load is unnecesairly slow and resource-consuming, as the server will have to run some code to generate the HTML. As a consequence, it costs more to run this kind of website compared to static ones. Also, if you have the need for global presence, it's a lot harder to host dynamic websites on multiple servers around the globe, so that each user will access the closest server. The static websites can just be copy/pasted everywhere (this is basically what Content Deliver Networks do - CDNs). There's a lot of knowledge required to run a popular web application, and it gets more complicated the more users you have.

## Static Site Generators

What if we could have the best of both worlds? Running costs and speed of static websites with the abilities of dynamic ones. Enter static site generators, tools which can programatically generate HTML (like the dynamic websites), but instead of doing it on every request, you run a static site generator only when you change it's content. Then, you take the generated HTML and just copy/paste it everywhere you need. 

Take a look at the previous example, with a static site generator, we would have two files. One for defining the actual HTML template:

```html
<!DOCTYPE html>
<html lang="en">

<head>

    <link rel="stylesheet" href="/css/main.min.css">

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>{{ Page.Title }}</title>
</head>

<body>
    <header>
        <nav>
            <ul>
                <li>
                    <a href="/#">Home</a>
                </li>
                <li>
                    <a href="/#about">About</a>
                </li>
                <li>
                    <a href="/#projects">Projects</a>
                </li>
                <li>
                    <a href="/#posts">Blog</a>
                </li>
            </ul>
        </nav>
    </header>

    <main class="container">
        <section class="post-page">
            <div class="post-page-header">
                <div class="post-page-title">
                    <h1>{{ Page.Metadata.Title }}</h1>
                    <h4>{{ Page.ReadingTime() }}</h4>
                </div>

                <h4>{{ Page.Metadata.Date }}</h4>

            </div>
            {{ Page.Content }}
        </section>


    </main>
    <footer>
        <h4>Andrija Jelenkovic © 2023 All rights reserved</h4>
    </footer>
</body>

</html>
```
The double curly braces `{{ ... }}` is special syntax for defining which parts of the HTML should be populated programatically. Then, we can define our content in a separate file, for example, a Markdown (`.md`) file, but depending on your static site generator, you can choose different file formats:

```markdown
---
Title: "Hello World"
Date: 2069-04-20T15:22:01+02:00
---

### Title
One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections.
```

The first part between the three dashes (`---`) is some metadata for the page, such as the title and date. Here, you can define your own metadata fields. Followed by the actual markdown content that is going to be used for generating the page. The end result should be the same as the first static HTML example. With markdown, it will match markdown elements to the HTML elements, for example `### Title` will be converted to `<h3>Title</h3>` and put where the `{{ Page.Content }}` block is.
You can even invoke functions, such as `{{ Page.ReadingTime() }}`, which will calculate the reading time of the post based on it's content.

## Conclusion

There are many pros to using static site generators instead of established solutions like WordPress and other content management systems. If you have the technical know-how to set up a statically generated site, it can be a lot better experience for your users and yourself, it's cheaper (you can even host it for free), and you get to flex the lighthouse report on Wordpress plebs (/s).

![Lighthouse Report](lighthouse.png)