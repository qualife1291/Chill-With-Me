type Owner = "chat" | "loto";
type Entry = {
  owner: Owner;
  utterance: SpeechSynthesisUtterance;
  finish: (event?: SpeechSynthesisEvent) => void;
  detach: () => void;
};
/** Web Speech cancel() is global. Only this broker owns the browser queue. */
export class SpeechBus {
  private active?: Entry;
  private waiting?: Entry;
  constructor(
    private engine: () => Pick<SpeechSynthesis, "speak" | "cancel">,
  ) {}
  private begin(entry: Entry) {
    this.active = entry;
    try {
      this.engine().speak(entry.utterance);
    } catch {
      entry.utterance.onerror?.call(
        entry.utterance,
        new Event("error") as SpeechSynthesisErrorEvent,
      );
    }
  }
  speak(owner: Owner, utterance: SpeechSynthesisUtterance) {
    const start = utterance.onstart,
      end = utterance.onend,
      error = utterance.onerror;
    const entry: Entry = {
      owner,
      utterance,
      finish: (event) =>
        end?.call(
          utterance,
          event || (new Event("end") as SpeechSynthesisEvent),
        ),
      detach: () => {
        utterance.onstart = null;
        utterance.onend = null;
        utterance.onerror = null;
      },
    };
    const complete = (
      event: SpeechSynthesisEvent | SpeechSynthesisErrorEvent,
      failed = false,
    ) => {
      if (this.active !== entry) return;
      this.active = undefined;
      entry.detach();
      if (failed) error?.call(utterance, event as SpeechSynthesisErrorEvent);
      else entry.finish(event);
      if (!this.active && this.waiting) {
        const next = this.waiting;
        this.waiting = undefined;
        this.begin(next);
      }
    };
    utterance.onstart = (event) => {
      if (this.active === entry) start?.call(utterance, event);
    };
    utterance.onend = (event) => complete(event);
    utterance.onerror = (event) => complete(event, true);
    if (owner === "chat" && this.active?.owner === "loto") {
      // Chat's own bounded queue submits one at a time. Keep at most one deferred item.
      const old = this.waiting;
      this.waiting = entry;
      old?.detach();
      old?.finish();
      return;
    }
    const previous = this.active;
    if (previous) {
      previous.detach();
      this.active = undefined;
      this.engine().cancel();
    }
    this.begin(entry);
    // Start the high-priority call before chat's completion submits its next item.
    previous?.finish();
  }
  cancel(owner: Owner) {
    if (this.waiting?.owner === owner) {
      this.waiting.detach();
      this.waiting = undefined;
    }
    if (this.active?.owner !== owner) return;
    this.active.detach();
    this.active = undefined;
    this.engine().cancel();
    if (this.waiting) {
      const next = this.waiting;
      this.waiting = undefined;
      this.begin(next);
    }
  }
}
export const speechBus = new SpeechBus(() => window.speechSynthesis);
