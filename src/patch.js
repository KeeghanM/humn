/**
 * @file This file contains the patching algorithm for the virtual DOM.
 * @module patch
 */

/**
 * Creates a DOM element from a virtual node.
 * @param {import("./h").VNode | string | number} vNode - The virtual node.
 * @returns {Text | HTMLElement} The created DOM element.
 */
function createElement(vNode) {
  if (typeof vNode === "string" || typeof vNode === "number") {
    return document.createTextNode(vNode);
  }

  const el = document.createElement(vNode.tag);
  vNode.el = el;

  patchProps(el, vNode.props);

  vNode.children.forEach((child) => {
    el.appendChild(createElement(child));
  });

  return el;
}

/**
 * Diffs and patches the properties of a DOM element.
 * @param {HTMLElement} el - The DOM element.
 * @param {object} newProps - The new properties.
 * @param {object} oldProps - The old properties.
 */
function patchProps(el, newProps = {}, oldProps = {}) {
  if (!el) return;

  const allProps = { ...oldProps, ...newProps };

  for (const key in allProps) {
    const oldValue = oldProps[key];
    const newValue = newProps[key];

    // Handle removed props
    if (newValue === undefined || newValue === null) {
      el.removeAttribute(key);
      continue;
    }

    if (key === 'value' || key === 'checked') {
      // For inputs, we check the LIVE DOM value, not the old props.
      if (el[key] !== newValue) {
        el[key] = newValue;
      }
      continue; 
    }

    // If nothing changed, skip
    if (oldValue === newValue) continue;

    // Handle Events
    if (key.startsWith("on")) {
      const eventName = key.slice(2).toLowerCase();
      // TODO: Handle multiple listeners per type
      if (oldValue) el.removeEventListener(eventName, oldValue);
      el.addEventListener(eventName, newValue);
    }

    // Handle standard attributes
    else {
      el.setAttribute(key, newValue);
    }
  }
}

/**
 * Diffs and patches the virtual DOM against the real DOM.
 * @param {HTMLElement} parent - The parent DOM element.
 * @param {import("./h").VNode} newVNode - The new virtual node.
 * @param {import("./h").VNode} oldVNode - The old virtual node.
 * @param {number} [index=0] - The index of the child node.
 */
export function patch(parent, newVNode, oldVNode, index = 0) {
  // CASE A: Start - No old node? Create new.
  if (oldVNode === undefined || oldVNode === null) {
    parent.appendChild(createElement(newVNode));
    return;
  }

  // CASE B: Removal - No new node? Remove old.
  if (newVNode === undefined || newVNode === null) {
    const el = parent.childNodes[index];
    if (el) parent.removeChild(el);
    return;
  }

  // CASE C: Changed Type - (e.g. <div> becomes <span>) -> Replace whole node
  if (
    typeof newVNode !== typeof oldVNode ||
    (typeof newVNode !== "string" && newVNode.tag !== oldVNode.tag)
  ) {
    const el = parent.childNodes[index];
    parent.replaceChild(createElement(newVNode), el);
    return;
  }

  // CASE D: Text Update
if (typeof newVNode === "string" || typeof newVNode === "number") {
  if (newVNode !== oldVNode) {
    const el = parent.childNodes[index];
    if (el) {
      el.nodeValue = newVNode;
    } else {
      // Self healing, if it didn't exist we can create it
      parent.appendChild(document.createTextNode(newVNode));
    }
  }
  return;
}

  // CASE E: Same Tag - Update Props & Children
  const el = oldVNode.el || parent.childNodes[index];

  if (!el) return;

  newVNode.el = el;

  patchProps(el, newVNode.props, oldVNode.props);

  const maxLen = Math.max(newVNode.children.length, oldVNode.children.length);

  for (let i = 0; i < maxLen; i++) {
    patch(el, newVNode.children[i], oldVNode.children[i], i);
  }
}
