import { describe, expect, it } from "vitest";
import { boundaryDraftReducer as reduce } from "./boundary-draft";
const a = { latitude: 48, longitude: 16, accuracy: 5, timestamp: 10000 };
const b = { ...a, longitude: 16.00001, timestamp: 11000 };
const empty = { samples: [], history: [] };
describe("Grenzentwurf bearbeiten", () => {
  it("unterscheidet bewusstes Punktsetzen von automatischer Mindeststrecke", () => {
    const state = reduce(empty, { type: "add", sample: a });
    expect(reduce(state, { type: "add", sample: b, automatic: true })).toBe(
      state,
    );
    expect(reduce(state, { type: "add", sample: b }).samples).toEqual([a, b]);
    expect(reduce(state, { type: "add", sample: a })).toBe(state);
    expect(reduce(state, { type: "add", sample: { ...b, accuracy: 26 } })).toBe(
      state,
    );
  });
  it("stellt nach Verschieben, Entfernen und Verwerfen exakt den letzten Stand wieder her", () => {
    let state = reduce(reduce(empty, { type: "add", sample: a }), {
      type: "add",
      sample: b,
    });
    const original = state.samples;
    state = reduce(state, {
      type: "move",
      index: 0,
      sample: { ...a, latitude: 48.0002 },
    });
    expect(reduce(state, { type: "undo" }).samples).toEqual(original);
    const moved = state.samples;
    state = reduce(state, { type: "remove", index: 1 });
    expect(reduce(state, { type: "undo" }).samples).toEqual(moved);
    state = reduce(state, { type: "clear" });
    expect(reduce(state, { type: "undo" }).samples).toEqual([moved[0]]);
    expect(reduce(state, { type: "move", index: 3, sample: a })).toBe(state);
  });
  it("isoliert geladene Entwürfe vom Verlauf des vorherigen Reviers", () => {
    const state = reduce(reduce(empty, { type: "add", sample: a }), {
      type: "load",
      samples: [b],
    });
    expect(state.history).toEqual([]);
    expect(reduce(state, { type: "undo" }).samples).toEqual([b]);
  });
});
