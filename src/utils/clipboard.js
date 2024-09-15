// src/utils/clipboard.js

/**
 * Copies the given text to the clipboard.
 * @param {string} text - The text to copy.
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text) {
    if (!navigator.clipboard) {
        // Fallback for browsers that do not support Clipboard API
        fallbackCopyTextToClipboard(text);
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        throw new Error(`Failed to copy to clipboard: ${err.message}`);
    }
}

/**
 * Fallback method for copying text to clipboard using a temporary textarea.
 * @param {string} text - The text to copy.
 */
function fallbackCopyTextToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;

    // Avoid scrolling to bottom
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.position = 'fixed';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const successful = document.execCommand('copy');
        if (!successful) {
            throw new Error('Fallback: Copy command was unsuccessful');
        }
    } catch (err) {
        throw new Error(`Fallback: Oops, unable to copy: ${err.message}`);
    }

    document.body.removeChild(textarea);
}
