# Meteor Vue

## How it works in Rollup

### The goal

Let's consider that we want to transform a Vue app into something that a browser 
can understand. The SFC format with its template, script and style tags need to 
be transformed into plain Javascript so the browser can execute it.

Here's a basic Vue SFC example in a file called `src/HelloWorld.vue`:

```vue
<script>
export default {
  props: ['name'],
}
</script>

<template>
  <div>Hello {{ name }}!</div>
</template>
```

The above file has 2 so-called "blocks". These 2 blocks somehow need to be transformed into 
a plain javascript representation. The Vue guide actually explains how a plain js Vue component 
looks like. 

```js
import { h } from "vue"

export default {
  // Here's the script part
  props: ['name'],
  // Which is combined with the template that is now a plain javascript
  // render function. I'm not going into detail on how exactly this function 
  // works. I did not yet do that research and our goal is to figure out how 
  // to build Vue using a build tool like Meteor, Rollup or Webpack.
  // The vue library does the heavy lifting for us
  render() {
    // "h" is a helper function to create vnodes. Documented here: 
    // https://v3.vuejs.org/guide/render-function.html#h-arguments
    return h( 
      'div', // tag name
      {}, // props or tag attributes
      // Either children (this.$slots) or the actual content like in this example
      `Hello ${this.name}` 
    )
  }
}
```

### Recursive file processing

1. Load a file (either the start file or based on an import statement)
2. Transform the file if a plugin for transformation exists for that extension
3. Detect import statements from resulting js file
4. Start from step one for each import statement

In other words for Vue:

1. Read .vue file
2. Transform Vue template, script and style to import statements
   1. This means 3 separate imports for this 1 .vue file
   2. Each import statement contains additional information on how to handle the file
3. Start from step 1 with the files of these 3 import statements 

### Step 1: Build tool detects .vue SFC file

On the first step the contents of the .vue file (Single File Component) are being transformed 
into a normal javascript with imports. Each import represents the Vue SFC tags:

The `<script>` will become:

```js
import script from "/src/HelloWorld.vue?vue&type=script&lang.js"
export * from "/src/HelloWorld.vue?vue&type=script&lang.js"
```

The `<template>` tag will become

```js
import { render } from "/src/HelloWorld.vue?vue&type=template&id=671062ce&lang.js"
```

The `<style>` tag will become

```js
import "/src/HelloWorld.vue?vue&type=style&index=0&id=671062ce&scoped=true&lang.css"
```

Any tag properties will be added to the query string of the import. For example on the 
above style tag, having the property `scoped` would add `scoped=true` to the query string.

It will then compose the results of these imports into a plain JS Vue object. 
Below is the full result:

```js
import script from "/src/HelloWorld.vue?vue&type=script&lang.js"
export * from "/src/HelloWorld.vue?vue&type=script&lang.js"
import { render } from "/src/HelloWorld.vue?vue&type=template&id=671062ce&lang.js"

// Note that this is a CSS import. To support this, there must be a CSS loader configured in the 
// build tool. If not, this would cause an error.
import "/src/HelloWorld.vue?vue&type=style&index=0&id=671062ce&scoped=true&lang.css"

script.render = render
// Some meta info on the Vue object
script.__scopeId = "data-v-671062ce"
script.__file = "src/HelloWorld.vue"
export default script
```

**>> So why not just transpile all the blocks directly and put 
them in this file as one component?**

The main reason is that you could potentially have blocks that simply 
refer to an external js or css file like this:

```vue
<!-- my-component.vue -->
<template>
  <div>This will be pre-compiled</div>
</template>
<script src="./my-component.js"></script>
<style src="./my-component.css"></style>
```

This means that there already needs to be a way to handle these 
setups. So instead of creating 2 different ways of handling a SFC, 
it's done like the above. But there is another reason...

To speed up development reloads, splitting into different imports allows for 
efficient usage of Hot Module Reloading (HMR) in combination with caching. 
Each imported file in Nodejs is considered a "module". When a developer makes a 
change in one of these modules, only that module will be replaced on both server 
and browser without requiring to reload the entire application. The Vue Rollup 
plugin pulls a smart trick by splitting up the SFC blocks in their own module 
with import statement. Now when a developer changes something in for example 
the `template` block, only that block will be reloaded, but not the style or 
script part.
    
### Step 2: Build tool detects import statements

The import statements that were created based on the .vue file from step 1 
are now being recognized by the build tool. The tool will now try to load these 
import statements just like was done initially with the .vue file. But now, 
we've given it instructions via the query parameters, so it knows what 
block it needs to parse and what methods it should apply to it to represent that 
as a module.

If you leave out exactly 'how' the template or style block is transformed. It's 
actually quite straight forward. 

Here's the snippet from the Vue Rollup plugin:

```ts
if (query.type === 'template') {
 debug(`transform template (${id})`)
 return transformTemplate(code, id, options, query, this)
} else if (query.type === 'style') {
 debug(`transform style (${id})`)

 return transformStyle(code, id, options, query, isProduction, this)
}
```

Obviously the script block does not require transforming, because that's already javascript.
