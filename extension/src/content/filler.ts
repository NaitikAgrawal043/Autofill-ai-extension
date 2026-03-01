// ============================================================
// AutoFill AI — Content Script: Form Field Filler
// ============================================================

import type { FieldMapping, FillResult } from '../shared/types';

/**
 * Fill multiple form fields with the provided mappings.
 */
export function fillFields(mappings: FieldMapping[]): FillResult[] {
    const results: FillResult[] = [];

    for (const mapping of mappings) {
        try {
            const element = document.querySelector(mapping.selector);
            if (!element) {
                results.push({ selector: mapping.selector, success: false, error: 'Element not found' });
                continue;
            }

            fillSingleField(element as HTMLElement, mapping);
            results.push({ selector: mapping.selector, success: true });

            // Briefly highlight the filled field
            highlightFieldSuccess(element as HTMLElement);
        } catch (error) {
            results.push({
                selector: mapping.selector,
                success: false,
                error: (error as Error).message,
            });
        }
    }

    return results;
}

/**
 * Fill a single form field based on its type.
 */
function fillSingleField(element: HTMLElement, mapping: FieldMapping): void {
    const { value, type } = mapping;

    switch (type) {
        case 'select':
            fillSelect(element as HTMLSelectElement, value);
            break;
        case 'radio':
            fillRadio(element as HTMLInputElement, value);
            break;
        case 'checkbox':
            fillCheckbox(element as HTMLInputElement, value);
            break;
        case 'date':
            fillDate(element as HTMLInputElement, value);
            break;
        case 'file':
            // Cannot programmatically set file inputs (browser security)
            highlightFieldManual(element, 'Please manually upload your file');
            break;
        case 'textarea':
            fillTextInput(element as HTMLTextAreaElement, value);
            break;
        default:
            fillTextInput(element as HTMLInputElement | HTMLTextAreaElement, value);
    }
}

/**
 * Fill a text input or textarea using native property setters
 * to bypass React/Angular's synthetic event systems.
 */
function fillTextInput(
    element: HTMLInputElement | HTMLTextAreaElement,
    value: string
): void {
    // Focus the element first
    element.focus();

    // Use native setter to bypass framework-level value tracking
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
    )?.set;

    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
    )?.set;

    const setter = element instanceof HTMLTextAreaElement
        ? nativeTextAreaValueSetter
        : nativeInputValueSetter;

    if (setter) {
        setter.call(element, value);
    } else {
        element.value = value;
    }

    // Trigger all events that frameworks might listen to
    triggerEvents(element);
}

/**
 * Fill a <select> dropdown by finding the best matching option.
 */
function fillSelect(element: HTMLSelectElement, value: string): void {
    const options = Array.from(element.options);
    const lowerValue = value.toLowerCase().trim();

    // Try exact match on value or text
    let match = options.find(o =>
        o.value.toLowerCase().trim() === lowerValue ||
        o.text.toLowerCase().trim() === lowerValue
    );

    // Try partial/contains match
    if (!match) {
        match = options.find(o =>
            o.text.toLowerCase().includes(lowerValue) ||
            lowerValue.includes(o.text.toLowerCase().trim())
        );
    }

    // Try word-level match
    if (!match) {
        const valueWords = lowerValue.split(/\s+/);
        match = options.find(o => {
            const optText = o.text.toLowerCase();
            return valueWords.some(word => word.length > 2 && optText.includes(word));
        });
    }

    if (match) {
        element.value = match.value;
        triggerEvents(element);
    }
}

/**
 * Fill a radio button group by selecting the matching option.
 */
function fillRadio(element: HTMLInputElement, value: string): void {
    const name = element.name;
    if (!name) return;

    const radios = document.querySelectorAll<HTMLInputElement>(
        `input[type="radio"][name="${CSS.escape(name)}"]`
    );

    const lowerValue = value.toLowerCase().trim();

    for (const radio of radios) {
        const label = getRadioLabel(radio).toLowerCase().trim();
        const radioValue = radio.value.toLowerCase().trim();

        if (label === lowerValue || radioValue === lowerValue ||
            label.includes(lowerValue) || lowerValue.includes(label)) {
            radio.checked = true;
            radio.focus();
            triggerEvents(radio);
            break;
        }
    }
}

/**
 * Fill a checkbox based on boolean-like value.
 */
function fillCheckbox(element: HTMLInputElement, value: string): void {
    const shouldCheck = ['true', 'yes', '1', 'on', 'checked'].includes(
        value.toLowerCase().trim()
    );
    if (element.checked !== shouldCheck) {
        element.click(); // Click triggers proper events
    }
}

/**
 * Fill a date input.
 */
function fillDate(element: HTMLInputElement, value: string): void {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
        const formatted = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
        )?.set;
        if (nativeSetter) {
            nativeSetter.call(element, formatted);
        } else {
            element.value = formatted;
        }
        triggerEvents(element);
    }
}

/**
 * Trigger all events that web frameworks might listen to.
 */
function triggerEvents(element: HTMLElement): void {
    // Standard events in the expected lifecycle order
    element.dispatchEvent(new Event('focus', { bubbles: true }));
    element.dispatchEvent(new Event('focusin', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    element.dispatchEvent(new Event('focusout', { bubbles: true }));

    // Keyboard events (some forms validate via keyup)
    element.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
}

/**
 * Get the text label of a radio button.
 */
function getRadioLabel(radio: HTMLInputElement): string {
    if (radio.id) {
        const label = document.querySelector(`label[for="${CSS.escape(radio.id)}"]`);
        if (label?.textContent?.trim()) return label.textContent.trim();
    }
    const parent = radio.closest('label');
    if (parent) {
        const clone = parent.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('input').forEach(el => el.remove());
        return clone.textContent?.trim() || radio.value;
    }
    const next = radio.nextSibling;
    if (next?.textContent?.trim()) return next.textContent.trim();
    return radio.value;
}

/**
 * Highlight a successfully filled field with a brief green outline.
 */
function highlightFieldSuccess(element: HTMLElement): void {
    const original = element.style.cssText;
    element.style.outline = '2px solid #10B981';
    element.style.outlineOffset = '2px';
    element.style.transition = 'outline-color 0.3s ease';

    setTimeout(() => {
        element.style.cssText = original;
    }, 2000);
}

/**
 * Highlight a field that needs manual intervention.
 */
function highlightFieldManual(element: HTMLElement, message: string): void {
    element.style.outline = '3px solid #F59E0B';
    element.style.outlineOffset = '2px';
    element.title = `AutoFill AI: ${message}`;
}

/**
 * Highlight unmatched fields that the user needs to fill manually.
 */
export function highlightUnmatchedFields(selectors: string[]): void {
    for (const selector of selectors) {
        try {
            const element = document.querySelector(selector) as HTMLElement;
            if (element) {
                element.style.outline = '3px dashed #EF4444';
                element.style.outlineOffset = '2px';
                element.title = 'AutoFill AI: Could not auto-fill this field. Please fill manually.';
            }
        } catch {
            // Skip invalid selectors
        }
    }
}
