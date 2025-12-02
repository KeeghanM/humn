/**
 * @typedef {object} VNode
 * @property {string} tag
 * @property {object} props
 * @property {VNode[]} children
 */

/**
 * Creates a virtual DOM node.
 * This is a hyperscript-like function.
 *
 * @param {string} tag - The tag name of the element.
 * @param {object} props - The properties of the element.
 * @param {VNode[]|VNode} children - The children of the element.
 * @returns {VNode} The virtual DOM node.
 */
export const h = (tag, props = {}, children = []) => {
  const childArray = Array.isArray(children) ? children : [children]

  // Filter out null/false so we don't have "ghost" nodes
  const cleanChildren = childArray
    .flat()
    .filter((c) => c !== null && c !== undefined && c !== false && c !== '')

  return {
    tag,
    props,
    children: cleanChildren,
  }
}
