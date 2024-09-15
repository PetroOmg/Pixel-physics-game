// src/input/input.js

/**
 * Sets up keyboard input handlers to track pressed keys and dispatch custom events.
 * @returns {EventTarget} - An EventTarget instance for dispatching and listening to custom events.
 */
export function setupInputHandlers() {
    const inputEventTarget = new EventTarget();
    const pressedKeys = new Set();

    // List of keys to track
    const keysToTrack = ['w', 'a', 's', 'd', 't'];

    // Keydown handler
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (keysToTrack.includes(key) && !e.repeat) {
            pressedKeys.add(key);
            const eventName = `${key}-press`;
            const event = new Event(eventName);
            inputEventTarget.dispatchEvent(event);
            e.preventDefault(); // Prevent default behavior if necessary
        }
    });

    // Keyup handler
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (keysToTrack.includes(key)) {
            pressedKeys.delete(key);
            const eventName = `${key}-release`;
            const event = new Event(eventName);
            inputEventTarget.dispatchEvent(event);
            e.preventDefault(); // Prevent default behavior if necessary
        }
    });

    // Optional: Expose the current state of pressed keys
    inputEventTarget.pressedKeys = () => Array.from(pressedKeys);

    return inputEventTarget;
}
