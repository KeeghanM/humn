# Scoped CSS

Humn provides a `css` template literal tag that allows you to write scoped CSS for your components. It generates a unique class name for your styles, preventing them from leaking out and affecting other components.

Here's an example of how to use the `css` tag:

```javascript
import { css, h } from 'humn'

const myComponentStyles = css`
  color: blue;
  font-size: 20px;
`

const MyComponent = () => {
  return h(
    'p',
    { class: myComponentStyles },
    'This component has scoped styles.',
  )
}
```
