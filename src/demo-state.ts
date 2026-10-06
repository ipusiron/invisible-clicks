export const MODES = ["overlay", "frame", "off"] as const;
export type Mode = typeof MODES[number];
export type Activation = "pointer" | "keyboard";
export type Source = "overlay" | "frame" | "direct";
export const DELAY_MS = 300;
export const MAX_LOG_ENTRIES = 100;
export const MAX_PENDING = 100;

export function activationFor(detail: number, pointerType = ""): Activation {
  // タッチではdetailが0のclickも届くため、PointerEventの入力種別も確認する。
  return detail > 0 || ["mouse", "touch", "pen"].includes(pointerType) ? "pointer" : "keyboard";
}

export type DemoEvent =
  | { type: "mode"; mode: Mode }
  | { type: "normal"; activation: Activation }
  | { type: "queued"; source: Source }
  | { type: "danger"; source: Source };

type Options = {
  schedule: (callback: () => void, delay: number) => unknown;
  cancel: (handle: unknown) => void;
  emit: (event: DemoEvent) => void;
};

/** DOMに依存しない模式デモの状態。実データや外部ページは操作しない。 */
export function createDemoState({ schedule, cancel, emit }: Options) {
  let mode: Mode = "overlay";
  let active = false;
  let generation = 0;
  const pending = new Set<unknown>();

  function cancelPending() {
    generation += 1;
    for (const handle of pending) cancel(handle);
    pending.clear();
  }

  function queue(source: Source) {
    if (pending.size >= MAX_PENDING) return false;
    const ticket = generation;
    const selectedMode = mode;
    emit({ type: "queued", source });
    const handle = schedule(() => {
      pending.delete(handle);
      // タイマーの取り消し後にコールバックが届いた場合も古い結果を出さない。
      if (!active || generation !== ticket || mode !== selectedMode) return;
      emit({ type: "danger", source });
    }, DELAY_MS);
    pending.add(handle);
    return true;
  }

  return {
    snapshot() {
      return { mode, active, pendingCount: pending.size };
    },
    setMode(next: Mode) {
      if (!MODES.includes(next)) throw new TypeError("Unknown demo mode");
      if (mode === next) return;
      cancelPending();
      mode = next;
      if (active) emit({ type: "mode", mode });
    },
    setActive(next: boolean) {
      if (active === next) return;
      cancelPending();
      active = next;
      if (active) emit({ type: "mode", mode });
    },
    like(activation: Activation) {
      if (!active || mode === "off") return false;
      if (mode === "frame" && activation === "pointer") return queue("frame");
      emit({ type: "normal", activation });
      return true;
    },
    overlay(activation: Activation) {
      if (!active || mode !== "overlay" || activation !== "pointer") return false;
      return queue("overlay");
    },
    danger(source: "direct" | "frame") {
      if (!active || (source === "frame" && mode !== "frame")) return false;
      emit({ type: "danger", source });
      return true;
    },
    cancelPending,
  };
}
