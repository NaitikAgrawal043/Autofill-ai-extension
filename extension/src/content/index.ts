// ============================================================
// AutoFill AI — Content Script: Entry Point
// ============================================================

import { MessageType } from '../shared/messages';
import { scrapeFormFields } from './scraper';
import { fillFields, highlightUnmatchedFields } from './filler';
import { observeFormChanges, pageHasFormFields } from './detector';

console.log('[AutoFill AI] Content script loaded on:', window.location.href);

// ---- Message Listener ----
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
        case MessageType.SCRAPE_FIELDS: {
            try {
                const fields = scrapeFormFields();
                console.log(`[AutoFill AI] Scraped ${fields.length} form fields`);
                sendResponse({ success: true, fields });
            } catch (error) {
                console.error('[AutoFill AI] Scrape error:', error);
                sendResponse({ success: false, error: (error as Error).message });
            }
            break;
        }

        case MessageType.SCRAPE_PAGE_TEXT: {
            try {
                // Scrape all text inside body, mostly article, main or standard divs
                const text = document.body.innerText || document.body.textContent || '';
                sendResponse({ success: true, text: text.substring(0, 50000) }); // Limit string size
            } catch (error) {
                console.error('[AutoFill AI] Scrape Page Text error:', error);
                sendResponse({ success: false, error: (error as Error).message });
            }
            break;
        }

        case MessageType.FILL_FIELDS: {
            try {
                const results = fillFields(message.data);
                const successCount = results.filter(r => r.success).length;
                console.log(`[AutoFill AI] Filled ${successCount}/${results.length} fields`);
                sendResponse({ success: true, results });
            } catch (error) {
                console.error('[AutoFill AI] Fill error:', error);
                sendResponse({ success: false, error: (error as Error).message });
            }
            break;
        }

        case MessageType.HIGHLIGHT_UNMATCHED: {
            try {
                const selectors = message.data.map((f: any) => f.selector);
                highlightUnmatchedFields(selectors);
                sendResponse({ success: true });
            } catch (error) {
                sendResponse({ success: false, error: (error as Error).message });
            }
            break;
        }

        default:
            sendResponse({ success: false, error: 'Unknown message type' });
    }

    return true; // Keep channel open for async response
});

// ---- Form Detection ----
// Notify the background script when forms appear on the page
if (pageHasFormFields()) {
    chrome.runtime.sendMessage({
        type: MessageType.FORM_DETECTED,
        data: { url: window.location.href, fieldCount: document.querySelectorAll('input, select, textarea').length },
    }).catch(() => {
        // Background script may not be ready yet — that's fine
    });
}

// Watch for dynamically loaded forms (SPAs like Workday, Greenhouse, etc.)
observeFormChanges(() => {
    if (pageHasFormFields()) {
        chrome.runtime.sendMessage({
            type: MessageType.FORM_DETECTED,
            data: { url: window.location.href, fieldCount: document.querySelectorAll('input, select, textarea').length },
        }).catch(() => { /* ignore */ });
    }
});
