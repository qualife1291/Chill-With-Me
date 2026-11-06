import { useLayoutEffect, type RefObject } from "react";
const selector =
  'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,a[href],[tabindex]:not([tabindex="-1"])';
/** Contain focus and pointer access while a modal is mounted, then restore its opener. */
export function useModalFocus(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const opener = document.activeElement as HTMLElement | null;
    const isolated = new Map<HTMLElement, boolean>();
    let node: HTMLElement = el;
    while (node.parentElement && node !== document.body) {
      for (const sibling of node.parentElement.children)
        if (sibling !== node && sibling instanceof HTMLElement) {
          isolated.set(sibling, sibling.inert);
          sibling.inert = true;
        }
      node = node.parentElement;
    }
    const available = () =>
      Array.from(el.querySelectorAll<HTMLElement>(selector)).filter(
        (n) => n.getClientRects().length && !n.closest("[inert]"),
      );
    const focus = () => {
      (available()[0] || el).focus();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onEscape?.();
      }
      if (e.key === "Tab") {
        const nodes = available(),
          at = nodes.indexOf(document.activeElement as HTMLElement);
        e.preventDefault();
        (
          nodes[(at + (e.shiftKey ? -1 : 1) + nodes.length) % nodes.length] ||
          el
        ).focus();
      }
    };
    const contain = (e: FocusEvent) => {
      if (!el.contains(e.target as Node)) focus();
    };
    // Accept/reject can remove the focused row while the same dialog stays open.
    const observer = new MutationObserver(() => {
      if (!el.contains(document.activeElement)) focus();
    });
    observer.observe(el, { childList: true, subtree: true });
    document.addEventListener("keydown", key, true);
    document.addEventListener("focusin", contain);
    focus();
    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("focusin", contain);
      for (const [s, previous] of isolated) s.inert = previous;
      if (opener?.isConnected && !opener.closest("[inert]")) opener.focus();
      else document.querySelector<HTMLElement>(".scene")?.focus();
    };
  }, [ref, active, onEscape]);
}
