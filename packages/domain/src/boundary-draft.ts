import {
  acceptBoundarySample,
  validSample,
  type BoundarySample,
} from "./gps-boundary";

export interface BoundaryDraft {
  samples: BoundarySample[];
  history: BoundarySample[][];
}
export type BoundaryDraftAction =
  | { type: "load"; samples: BoundarySample[] }
  | { type: "add"; sample: BoundarySample; automatic?: boolean }
  | { type: "move"; index: number; sample: BoundarySample }
  | { type: "remove"; index: number }
  | { type: "undo" }
  | { type: "clear" };

/** Automatische Messung filtert Bewegung; bewusst gesetzte Punkte brauchen keine Mindeststrecke. */
export function boundaryDraftReducer(
  state: BoundaryDraft,
  action: BoundaryDraftAction,
): BoundaryDraft {
  if (action.type === "load") return { samples: action.samples, history: [] };
  if (action.type === "undo") {
    const samples = state.history.at(-1);
    return samples ? { samples, history: state.history.slice(0, -1) } : state;
  }
  let samples = state.samples;
  if (action.type === "add") {
    if (
      samples.length >= 2000 ||
      !validSample(action.sample) ||
      samples.some(
        (p) =>
          p.latitude === action.sample.latitude &&
          p.longitude === action.sample.longitude,
      ) ||
      (action.automatic && !acceptBoundarySample(samples, action.sample))
    )
      return state;
    samples = [...samples, action.sample];
  } else if (action.type === "move") {
    if (!samples[action.index] || !validSample(action.sample)) return state;
    samples = samples.map((sample, i) =>
      i === action.index ? action.sample : sample,
    );
  } else if (action.type === "remove") {
    if (!samples[action.index]) return state;
    samples = samples.filter((_, i) => i !== action.index);
  } else if (action.type === "clear") {
    if (!samples.length) return state;
    samples = [];
  }
  return { samples, history: [...state.history.slice(-49), state.samples] };
}
