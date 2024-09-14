// src/input/input.js

import { clamp } from '../utils/utils.js';

/**
 * Sets up keyboard input handlers to track pressed keys.
 * @param {Object} keys - An object to store the state of keys.
 */
export function setupInputHandlers(keys) {
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
}

/**
 * Processes player input and updates the player ship accordingly.
 * @param {Object} keys - The current state of keys.
 * @param {PlayerShip} playerShip - The player ship instance.
 * @param {number} deltaTime - Time elapsed since the last update (in seconds).
 */
export function handlePlayerInput(keys, playerShip, deltaTime) {
    playerShip.update(keys, deltaTime);
}
