# Obsidian `@People`

Obsidian plugin to add that familiar @-to-tag-someone syntax:

![](./example.png)

When you hit enter on a suggestion, it'll create a link that looks like this:

```
The author was [[@Rich Hickey]]
```

and leave the cursor at the end.

## Options

There's not a lot to configure here, but they are important:

### 1. Where are the people files?

You probably want to group the people files in a folder.

I usually do something like this:

```
People/
	@Rich Hickey.md
	@Rich Harris.md
```

You can configure that in settings to point to somewhere else, like `Reference/People/` or whatever makes sense.

### 2. Explicit link structure?

By default, the plugin will insert the simple version:

```
[[@Rich Hickey]]
```

But you might rather make that explicit, in which case you can enable "explicit links" and they'll look like this instead:

```
[[People/@Rich Hickey.md|@Rich Hickey]]
```

### 3. Folder Mode

You can store the people in three different ways using the dropdown.

#### Default

This setting is the default. It creates a single file per person.

Example:

```
People/
	@Rich Hickey.md
	@Rich Harris.md
```

And then the inserted link would look like:

```
[[People/@Rich Hickey.md|@Rich Hickey]]
or if explicit link is disabled
[[@Rich Hickey.md|@Rich Hickey]]
```

#### Per Person

This setting will create a directory per person. You can use it to store multiple notes related to the same person. It requires "Explicit link" to be enabled.

Example:

```
People/
	@Rich Hickey/
		@Rich Hickey.md
		more-files.md
	@Rich Harris
		@Rich Harris.md
		more-files.md
```

And then the inserted link would look like:

```
[[People/@Rich Hickey.md/@Rich Hickey.md|@Rich Hickey]]
```

#### Per Lastname

This setting will create a directory per lastname and a single file for the person itself. You can e.g. use it if you have many people sharing the same lastname. It requires "Explicit link" to be enabled.

Example:

```
People/
	Hickey/
		@Rich Hickey.md
	Harris/
		@Rich Harris.md
```

And then the inserted link would look like:

```
[[People/Hickey/@Rich Hickey.md|@Rich Hickey]]
```

> Note: figuring out what the "last name" is (or if it even has one) is really complicated! This plugin takes a very simply approach: if you split a name by the space character, it'll just pick the last "word". So for example "Charles Le Fabre" would be "Fabre" and *not* "Le Fabre".
>
> I'm open to better implementations that don't add a lot of complexity, just start a discussion.

## Conflicts

Several plugins have conflicts with using the `@` symbol, please look at the [Github issues for plugin conflicts](https://github.com/saibotsivad/obsidian-at-people/issues?q=is%3Aissue+conflict+) to see if yours has been resolved.

## License

Published and made available freely under the [Very Open License](http://veryopenlicense.com/).