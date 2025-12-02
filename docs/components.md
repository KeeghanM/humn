# Components

Components in Humn are just plain JavaScript functions that return a virtual DOM node. You can create components using the `h` function.

The `h` function takes a tag name, a props object, and an array of children.

```javascript
import { h } from 'humn'

const MyComponent = (props) => {
  return h('div', { class: 'my-component' }, [
    h('h1', {}, `Hello, ${props.name}!`),
    h('p', {}, 'This is a simple component.'),
  ])
}
```

You can then use your component in another component:

```javascript
const App = () => {
  return h('div', {}, [
    h(MyComponent, { name: 'John' }),
    h(MyComponent, { name: 'Jane' }),
  ])
}
```
