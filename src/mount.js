/**
 * @file Mounts the application to the DOM.
 * @module mount
 */
import { setObserver } from "./observer.js";
import { patch } from "./patch.js";

/**
 * Mounts a component to a target DOM element.
 * @param {HTMLElement} target - The DOM element to mount to.
 * @param {function} Component - The root component function.
 */
export const mount = (target, Component) => {
  let prevVNode = null;

  const lifecycle = () => {
    setObserver(lifecycle);

    const nextVNode = {
      tag: Component,
      props: {},
      children: [],
    };

    patch(target, nextVNode, prevVNode);
    setObserver(null);
    prevVNode = nextVNode;
  };

  lifecycle();
};
