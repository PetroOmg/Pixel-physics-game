// src/input/input.js

/**
 * Sets up keyboard input handlers to track pressed keys and dispatch custom events.
 * @returns {EventTarget} - An EventTarget instance for dispatching and listening to custom events.
 */
export function setupInputHandlers() {
    // Create an EventTarget for custom event dispatching
    const inputEventTarget = new EventTarget();

    // Listen for keydown events
    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 't' && !e.repeat) {
            // Dispatch a custom 't-press' event when 'T' is pressed down
            const event = new Event('t-press');
            inputEventTarget.dispatchEvent(event);
        }
    });

    // Listen for keyup events
    window.addEventListener('keyup', (e) => {
        if (e.key.toLowerCase() === 't') {
            // Dispatch a custom 't-release' event when 'T' is released
            const event = new Event('t-release');
            inputEventTarget.dispatchEvent(event);
        }
    });

    return inputEventTarget;
}
