import { setObserver } from "./observer.js";
import { patch } from "./patch.js";

/**
 * Mounts a component to a target element.
 * @param {HTMLElement} target - The target element to mount the component to.
 * @param {function(): import("./h").VNode} Component - The component to mount.
 */
export const mount = (target, Component) => {
  let prevVDom = null;

  const lifecycle = () => {
    setObserver(lifecycle);
    const nextVDom = Component();
    setObserver(null);

    patch(target, nextVDom, prevVDom);

    prevVDom = nextVDom;
  };

  lifecycle();
};
