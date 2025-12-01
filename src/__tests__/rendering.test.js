import { describe, expect, it } from "vitest";
import { Cortex, h, mount } from "../index";

describe("rendering", () => {
  // --- BASIC TESTS ---

  it("should initialize memory and synapses", () => {
    const store = new Cortex({
      memory: { count: 0 },
      synapses: (set) => ({
        increment: () => set((state) => ({ count: state.count + 1 })),
      }),
    });

    expect(store.memory.count).toBe(0);
    store.synapses.increment();
    expect(store.memory.count).toBe(1);
  });

  it("should render a simple component", () => {
    const App = () => h("div", {}, "Hello, World!");
    const target = document.createElement("div");
    mount(target, App);
    expect(target.innerHTML).toBe("<div>Hello, World!</div>");
  });

  it("should update text when cortex changes", () => {
    const user = new Cortex({
      memory: { name: "Keeghan" },
      synapses: (set) => ({
        changeName: (newName) => set({ name: newName }),
      }),
    });

    const App = () => h("div", {}, `Hello, ${user.memory.name}!`);
    const target = document.createElement("div");
    mount(target, App);

    expect(target.innerHTML).toBe("<div>Hello, Keeghan!</div>");
    user.synapses.changeName("McGarry");
    expect(target.innerHTML).toBe("<div>Hello, McGarry!</div>");
  });

  // --- EDGE CASE TESTS ---

  it("should handle conditional rendering (null/undefined checks)", () => {
    const ui = new Cortex({
      memory: { show: false },
      synapses: (set) => ({ toggle: () => set((s) => ({ show: !s.show })) }),
    });

    const App = () => {
      const { show } = ui.memory;
      return h("div", {}, [
        h("h1", {}, "Title"),
        show ? h("p", { id: "msg" }, "Visible") : null,
      ]);
    };

    const target = document.createElement("div");
    mount(target, App);

    // 1. Initial State (Hidden)
    expect(target.querySelector("#msg")).toBeNull();

    // 2. Toggle On (Creation - Case A)
    ui.synapses.toggle();
    expect(target.querySelector("#msg").innerHTML).toBe("Visible");

    // 3. Toggle Off (Removal - Case B)
    ui.synapses.toggle();
    expect(target.querySelector("#msg")).toBeNull();
  });

  it("should sync input values even if DOM is dirty", () => {
    const store = new Cortex({
      memory: { text: "" },
      synapses: (set) => ({
        reset: () => set({ text: "" }),
        type: (val) => set({ text: val }),
      }),
    });

    const App = () => {
      const { text } = store.memory;
      return h("input", { value: text, id: "my-input" });
    };

    const target = document.createElement("div");
    mount(target, App);
    const input = target.querySelector("input");

    // 1. Simulate user typing "Hello" into the DOM directly
    // The store still thinks text is "", but DOM is "Hello"
    input.value = "Hello";

    // 2. Trigger an update that should force it back to ""
    // If patchProps doesn't check el.value vs newValue, this will fail
    store.synapses.reset();

    expect(input.value).toBe("");
  });

  it("should handle deep nested updates", () => {
    const store = new Cortex({
      memory: {
        user: {
          profile: { theme: "light" },
        },
      },
      synapses: (set) => ({
        goDark: () =>
          set((state) => {
            // Direct mutation of nested property
            state.user.profile.theme = "dark";
          }),
      }),
    });

    const App = () => {
      const { user } = store.memory;
      return h("div", { class: user.profile.theme }, "Content");
    };

    const target = document.createElement("div");
    mount(target, App);

    expect(target.firstChild.className).toBe("light");

    store.synapses.goDark();

    expect(target.firstChild.className).toBe("dark");
  });

  it("should ignore falsy children in h()", () => {
    // This ensures we don't get "false" text nodes printed to screen
    const App = () => h("div", {}, ["A", null, undefined, false, "", "B"]);

    const target = document.createElement("div");
    mount(target, App);

    // Should only contain "AB", no "false" or "null" text
    expect(target.innerHTML).toBe("<div>AB</div>");
    expect(target.firstChild.childNodes.length).toBe(2); // "A" and "B"
  });

  it("should handle swapping element types", () => {
    // Testing Case C (div -> span)
    const store = new Cortex({
      memory: { isParagraph: true },
      synapses: (set) => ({
        toggle: () => set((s) => ({ isParagraph: !s.isParagraph })),
      }),
    });

    const App = () => {
      const { isParagraph } = store.memory;
      return isParagraph ? h("p", {}, "text") : h("h1", {}, "text");
    };

    const target = document.createElement("div");
    mount(target, App);

    expect(target.innerHTML).toBe("<p>text</p>");

    store.synapses.toggle();

    expect(target.innerHTML).toBe("<h1>text</h1>");
  });
});
