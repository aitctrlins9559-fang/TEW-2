import { useEffect } from 'react';

let activeModalCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';
let originalBodyTouchAction = '';
let originalScrollY = 0;

export function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  activeModalCount++;
  if (activeModalCount === 1) {
    originalScrollY = window.scrollY;
    originalBodyOverflow = document.body.style.overflow;
    originalHtmlOverflow = document.documentElement.style.overflow;
    originalBodyTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
  }
}

export function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  activeModalCount = Math.max(0, activeModalCount - 1);
  if (activeModalCount === 0) {
    document.body.style.overflow = originalBodyOverflow;
    document.documentElement.style.overflow = originalHtmlOverflow;
    document.body.style.touchAction = originalBodyTouchAction;
    document.body.classList.remove('modal-open');
    document.documentElement.classList.remove('modal-open');
    // Maintain scroll position cleanly
    if (window.scrollY !== originalScrollY) {
      window.scrollTo({ top: originalScrollY, behavior: 'instant' as ScrollBehavior });
    }
  }
}

export function useScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      return () => {
        unlockBodyScroll();
      };
    }
  }, [isOpen]);
}
