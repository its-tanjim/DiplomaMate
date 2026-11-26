import React, { useEffect, useRef } from 'react';

/**
 * Shared accessible modal (dialog) wrapper.
 *
 * Every modal-like overlay in the app renders through this component so the
 * dialog semantics and keyboard behaviour live in exactly one place:
 *
 * - `role="dialog"` + `aria-modal="true"`, labelled by the modal heading
 *   (`labelledBy`, the heading's id) or by `label` when the modal has no
 *   heading to point at.
 * - Focus trap: Tab / Shift+Tab cycle inside the panel; focus can never
 *   leave for the page behind the modal.
 * - Escape closes the modal (via `onClose`).
 * - Initial focus lands on the first focusable element inside the panel
 *   (skipping the built-in close button, so form modals land in their
 *   first field), falling back to the built-in close button, then the panel.
 * - Focus returns to the element that opened the modal when it closes.
 * - Body scroll is locked while any modal is open (ref-counted, so stacked
 *   modals unlock only when the last one closes).
 *
 * The panel can be rendered as a `<form>` (`panelAsForm` + `onSubmit`) for
 * submit-on-Enter modals. Visual styling is unchanged: callers pass the
 * exact overlay / panel classes the old hand-rolled overlay used.
 *
 * `showCloseButton` renders a built-in top-right close button
 * (`aria-label="Close"`). Set it to `false` for modals that already have
 * their own (named) close button, so the user never sees two.
 */

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Stack of open modal panels (topmost last). Only the topmost modal traps
// Tab and handles Escape, so stacked modals behave correctly.
const openPanels: HTMLElement[] = [];
let scrollLockCount = 0;
let savedBodyOverflow = '';

export interface ModalProps {
  /** Called to close the modal (Escape key and the built-in close button). */
  onClose: () => void;
  /** id of the heading element inside the modal (aria-labelledby). Prefer this when the modal has a heading. */
  labelledBy?: string;
  /** Accessible name when the modal has no heading to point at (aria-label). */
  label?: string;
  /** Classes for the centred panel. Defaults to the standard panel style. */
  panelClassName?: string;
  /** Classes for the backdrop overlay. Defaults to the standard overlay style. */
  overlayClassName?: string;
  /** Render the panel as a <form> instead of a <div> (submit-on-Enter modals). */
  panelAsForm?: boolean;
  /** Submit handler when panelAsForm is set. */
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  /** Show the built-in close button (top-right). Defaults to true; set false when the modal already has its own close button. */
  showCloseButton?: boolean;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  onClose,
  labelledBy,
  label,
  children,
  panelClassName = 'bg-surface rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150',
  overlayClassName = 'fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4',
  panelAsForm = false,
  onSubmit,
  showCloseButton = true,
}) => {
  const panelRef = useRef<HTMLElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<Element | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    previouslyFocusedRef.current = document.activeElement;
    openPanels.push(panel);
    if (scrollLockCount === 0) {
      savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    scrollLockCount += 1;

    // Initial focus: first focusable element inside the panel, skipping the
    // built-in close button so form modals land in their first field.
    // Falls back to the close button, then the panel itself.
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (el) => el !== closeButtonRef.current,
    );
    const target = focusables[0] ?? closeButtonRef.current ?? panel;
    target.focus();

    return () => {
      const index = openPanels.indexOf(panel);
      if (index !== -1) openPanels.splice(index, 1);
      scrollLockCount -= 1;
      if (scrollLockCount === 0) {
        document.body.style.overflow = savedBodyOverflow;
      }
      const previouslyFocused = previouslyFocusedRef.current;
      if (previouslyFocused instanceof HTMLElement && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
    // Mount/unmount only: the caller renders <Modal> conditionally, so one
    // mount corresponds to one open modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const panel = panelRef.current;
    if (!panel) return;
    // Only the topmost open modal handles keys (stacked modals).
    if (openPanels[openPanels.length - 1] !== panel) return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusables.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // Block-bodied callback ref: a returned value would be treated as a
  // cleanup function by React 19.
  const setPanelRef = (element: HTMLElement | null) => {
    panelRef.current = element;
  };

  const dialogProps = {
    role: 'dialog' as const,
    'aria-modal': true as const,
    ...(labelledBy ? { 'aria-labelledby': labelledBy } : {}),
    ...(!labelledBy && label ? { 'aria-label': label } : {}),
    tabIndex: -1,
    onKeyDown: handleKeyDown,
  };

  // `relative` anchors the built-in close button; it changes no layout.
  const panelClasses = `relative ${panelClassName}`;

  const closeButton = showCloseButton ? (
    <button
      type="button"
      ref={closeButtonRef}
      onClick={onClose}
      aria-label="Close"
      className="absolute right-3 top-3 z-10 rounded-lg bg-surface p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
    >
      ✕
    </button>
  ) : null;

  if (panelAsForm) {
    return (
      <div className={overlayClassName}>
        <form
          ref={setPanelRef as React.Ref<HTMLFormElement>}
          onSubmit={onSubmit}
          className={panelClasses}
          {...dialogProps}
        >
          {closeButton}
          {children}
        </form>
      </div>
    );
  }

  return (
    <div className={overlayClassName}>
      <div ref={setPanelRef as React.Ref<HTMLDivElement>} className={panelClasses} {...dialogProps}>
        {closeButton}
        {children}
      </div>
    </div>
  );
};
