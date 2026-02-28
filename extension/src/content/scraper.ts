// ============================================================
// AutoFill AI — Content Script: DOM Field Scraper
// ============================================================

import { FormField } from '../shared/types';

/**
 * Scrape all interactive form fields from the current page DOM.
 */
export function scrapeFormFields(): FormField[] {
    const fields: FormField[] = [];
    const processedElements = new Set<HTMLElement>();

    // Query all interactive form elements
    const inputs = document.querySelectorAll<HTMLInputElement>(
        'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"])'
    );
    const textareas = document.querySelectorAll<HTMLTextAreaElement>('textarea');
    const selects = document.querySelectorAll<HTMLSelectElement>('select');

    // Process inputs (handle radio groups)
    const radioGroups = new Map<string, HTMLInputElement[]>();

    inputs.forEach((input) => {
        if (input.type === 'radio') {
            const name = input.name || input.id;
            if (!radioGroups.has(name)) {
                radioGroups.set(name, []);
            }
            radioGroups.get(name)!.push(input);
            return;
        }

        if (processedElements.has(input)) return;
        processedElements.add(input);

        const field = extractFieldInfo(input);
        if (field) fields.push(field);
    });

    // Process radio groups
    radioGroups.forEach((radios, _name) => {
        const firstRadio = radios[0];
        const label = getLabel(firstRadio) || getRadioGroupLabel(radios);
        if (!label) return;

        const options = radios.map((r) => {
            const radioLabel = getRadioLabel(r);
            return radioLabel || r.value;
        }).filter(Boolean);

        fields.push({
            selector: generateUniqueSelector(firstRadio),
            label,
            type: 'radio',
            options,
            currentValue: radios.find(r => r.checked)?.value || '',
            required: firstRadio.required,
            context: getFieldContext(firstRadio),
        });
    });

    // Process textareas
    textareas.forEach((textarea) => {
        if (processedElements.has(textarea)) return;
        processedElements.add(textarea);

        const field = extractFieldInfo(textarea);
        if (field) {
            field.type = 'textarea';
            fields.push(field);
        }
    });

    // Process selects
    selects.forEach((select) => {
        if (processedElements.has(select)) return;
        processedElements.add(select);

        const field = extractFieldInfo(select);
        if (field) {
            field.type = 'select';
            field.options = Array.from(select.options)
                .map(o => o.text.trim())
                .filter(text => text && text !== '' && text !== '--Select--' && text !== 'Select');
            fields.push(field);
        }
    });

    return fields;
}

/**
 * Extract information about a single form element.
 */
function extractFieldInfo(
    element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): FormField | null {
    const label = getLabel(element);
    // If we can't find any label, skip — the field is not useful for matching
    if (!label) return null;

    // Skip invisible fields
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return null;
    }

    return {
        selector: generateUniqueSelector(element),
        label,
        type: (element instanceof HTMLSelectElement
            ? 'select'
            : (element as HTMLInputElement).type as FormField['type']) || 'text',
        currentValue: element.value,
        required: element.required || element.getAttribute('aria-required') === 'true',
        placeholder: (element as HTMLInputElement).placeholder || undefined,
        context: getFieldContext(element),
    };
}

/**
 * Try multiple strategies to find a label for a form element.
 */
export function getLabel(element: HTMLElement): string {
    // Strategy 1: Associated <label> element via `for` attribute
    const id = element.id;
    if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (label?.textContent?.trim()) return cleanLabel(label.textContent);
    }

    // Strategy 2: aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel?.trim()) return ariaLabel.trim();

    // Strategy 3: aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
        const refEl = document.getElementById(labelledBy);
        if (refEl?.textContent?.trim()) return cleanLabel(refEl.textContent);
    }

    // Strategy 4: Wrapping <label>
    const parentLabel = element.closest('label');
    if (parentLabel) {
        // Get label text without the input's own text
        const clone = parentLabel.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('input, select, textarea').forEach(el => el.remove());
        const text = clone.textContent?.trim();
        if (text) return cleanLabel(text);
    }

    // Strategy 5: Placeholder text
    if ((element as HTMLInputElement).placeholder) {
        return (element as HTMLInputElement).placeholder.trim();
    }

    // Strategy 6: Previous sibling label-like text
    let prevSibling = element.previousElementSibling;
    while (prevSibling) {
        if (prevSibling.tagName === 'LABEL' || prevSibling.classList.contains('label')) {
            const text = prevSibling.textContent?.trim();
            if (text) return cleanLabel(text);
        }
        if (prevSibling.tagName === 'SPAN' || prevSibling.tagName === 'DIV' || prevSibling.tagName === 'P') {
            const text = prevSibling.textContent?.trim();
            if (text && text.length < 100) return cleanLabel(text);
        }
        prevSibling = prevSibling.previousElementSibling;
    }

    // Strategy 7: Name attribute (humanized)
    const name = element.getAttribute('name');
    if (name) {
        return name
            .replace(/[\[\]]/g, ' ')
            .replace(/[_\-\.]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .trim();
    }

    // Strategy 8: title attribute
    const title = element.getAttribute('title');
    if (title?.trim()) return title.trim();

    return '';
}

/**
 * Get label for a specific radio button.
 */
function getRadioLabel(radio: HTMLInputElement): string {
    // Check for <label for="">
    if (radio.id) {
        const label = document.querySelector(`label[for="${CSS.escape(radio.id)}"]`);
        if (label?.textContent?.trim()) return cleanLabel(label.textContent);
    }

    // Check wrapping label
    const parent = radio.closest('label');
    if (parent) {
        const clone = parent.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('input').forEach(el => el.remove());
        const text = clone.textContent?.trim();
        if (text) return cleanLabel(text);
    }

    // Next sibling text
    const next = radio.nextSibling;
    if (next?.textContent?.trim()) return cleanLabel(next.textContent!);

    return radio.value;
}

/**
 * Get label for an entire radio group from context.
 */
function getRadioGroupLabel(radios: HTMLInputElement[]): string {
    const firstRadio = radios[0];

    // Look for a fieldset legend
    const fieldset = firstRadio.closest('fieldset');
    if (fieldset) {
        const legend = fieldset.querySelector('legend');
        if (legend?.textContent?.trim()) return cleanLabel(legend.textContent);
    }

    // Look for a heading above the group
    const container = firstRadio.closest('.form-group, .field-group, [role="radiogroup"]');
    if (container) {
        const heading = container.querySelector('label, .label, h3, h4, h5, p');
        if (heading?.textContent?.trim()) return cleanLabel(heading.textContent);
    }

    return '';
}

/**
 * Get contextual information about the field (section, heading, etc.)
 */
function getFieldContext(element: HTMLElement): string {
    const parts: string[] = [];

    // Get fieldset legend
    const fieldset = element.closest('fieldset');
    const legend = fieldset?.querySelector('legend');
    if (legend?.textContent?.trim()) {
        parts.push(`Section: ${legend.textContent.trim()}`);
    }

    // Get nearest section heading
    const section = element.closest('section, [role="group"], .form-section, .section, .card, .panel');
    if (section) {
        const heading = section.querySelector('h1, h2, h3, h4, h5, h6, .section-title, .card-title');
        if (heading?.textContent?.trim()) {
            parts.push(`Heading: ${heading.textContent.trim()}`);
        }
    }

    return parts.join(' | ');
}

/**
 * Generate a unique CSS selector to re-find an element.
 */
export function generateUniqueSelector(element: HTMLElement): string {
    // Priority 1: id
    if (element.id) return `#${CSS.escape(element.id)}`;

    // Priority 2: name + tag
    const name = element.getAttribute('name');
    const tag = element.tagName.toLowerCase();
    if (name) {
        const sel = `${tag}[name="${CSS.escape(name)}"]`;
        if (document.querySelectorAll(sel).length === 1) return sel;
    }

    // Priority 3: data-testid
    const testId = element.getAttribute('data-testid');
    if (testId) {
        const sel = `[data-testid="${CSS.escape(testId)}"]`;
        if (document.querySelectorAll(sel).length === 1) return sel;
    }

    // Priority 4: aria-label + tag
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
        const sel = `${tag}[aria-label="${CSS.escape(ariaLabel)}"]`;
        if (document.querySelectorAll(sel).length === 1) return sel;
    }

    // Fallback: build a path-based selector
    return buildPathSelector(element);
}

/**
 * Build a DOM-path CSS selector as a last resort.
 */
function buildPathSelector(element: HTMLElement): string {
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
            selector = `#${CSS.escape(current.id)}`;
            path.unshift(selector);
            break;
        }
        const parent = current.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children).filter(
                c => c.tagName === current!.tagName
            );
            if (siblings.length > 1) {
                const index = siblings.indexOf(current) + 1;
                selector += `:nth-of-type(${index})`;
            }
        }
        path.unshift(selector);
        current = current.parentElement;
    }

    return path.join(' > ');
}

/**
 * Clean up extracted label text.
 */
function cleanLabel(text: string): string {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\*$/, '')    // Remove trailing asterisk (required marker)
        .replace(/^\*/, '')    // Remove leading asterisk
        .replace(/:$/, '')     // Remove trailing colon
        .trim();
}
