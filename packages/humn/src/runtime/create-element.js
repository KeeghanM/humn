import { mountComponent } from './patch.js'
import { patchProps } from './patch-props.js'

const SVG_NS = 'http://www.w3.org/2000/svg'
const MATH_NS = 'http://www.w3.org/1998/Math/MathML'

export function getNamespace(parent) {
  if (parent.namespaceURI === SVG_NS && parent.tagName !== 'foreignObject') {
    return SVG_NS
  }
  if (parent.namespaceURI === MATH_NS) {
    return MATH_NS
  }
  return null
}

export function createElement(vNode, namespace, parent = null, index = 0) {
  if (typeof vNode === 'string' || typeof vNode === 'number') {
    return document.createTextNode(String(vNode))
  }

  if (typeof vNode.tag === 'function')
    return createComponentElement({ index, namespace, parent, vNode })

  const tag = vNode.tag
  const elementNamespace = getElementNamespace(tag, namespace)
  const element = elementNamespace
    ? document.createElementNS(elementNamespace, tag)
    : document.createElement(tag)

  vNode.el = element
  patchProps(element, vNode.props)
  appendChildren({ element, namespace: elementNamespace, tag, vNode })
  return element
}

function createComponentElement({ index, namespace, parent, vNode }) {
  if (parent) {
    mountComponent({ index, newVNode: vNode, oldVNode: null, parent })
    return vNode.el
  }

  const fragment = document.createDocumentFragment()
  mountComponent({
    index: 0,
    newVNode: vNode,
    oldVNode: null,
    parent: fragment,
  })
  return vNode.el || fragment.firstChild
}

function appendChildren({ element, namespace, tag, vNode }) {
  // Children of SVG foreignObject must return to the HTML namespace.
  const childNamespace = tag === 'foreignObject' ? null : namespace

  vNode.children.forEach((child) => {
    const childElement = createElement(
      child,
      childNamespace,
      element,
      element.childNodes.length,
    )
    if (childElement.parentNode !== element) element.appendChild(childElement)
  })
}

function getElementNamespace(tag, namespace) {
  // A nested <svg> or <math> starts a fresh namespace regardless of its parent.
  if (tag === 'svg') return SVG_NS
  if (tag === 'math') return MATH_NS

  // createElementNS is slower than createElement, so only use it when needed.
  return namespace
}
