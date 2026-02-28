// ============================================================
// AutoFill AI — Content Script: Dynamic Form Detector
// ============================================================

/**
 * Watch for dynamically added forms in SPA-based career portals.
 * Many portals (Greenhouse, Lever, Workday) load forms asynchronously.
 */
export function observeFormChanges(callback: () => void): MutationObserver {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new MutationObserver((mutations) => {
        const hasNewFormElements = mutations.some(mutation => {
            return Array.from(mutation.addedNodes).some(node => {
                if (node instanceof HTMLElement) {
                    // Check if the added node is a form element or contains form elements
                    return (
                        node.matches?.('form, input, select, textarea') ||
                        node.querySelector?.('form, input, select, textarea') !== null
                    );
                }
                return false;
            });
        });

        if (hasNewFormElements) {
            // Debounce: wait for DOM to settle before notifying
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(callback, 800);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    return observer;
}

/**
 * Check if the current page has any form-like elements.
 */
export function pageHasFormFields(): boolean {
    const formElements = document.querySelectorAll(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
    );
    return formElements.length > 0;
}
