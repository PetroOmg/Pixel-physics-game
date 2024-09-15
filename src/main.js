// src/main.js

import { initializeSimulation, performSimulationStep } from './simulation/simulation.js';
import { initializeUpdateProgram, initializeRenderProgram, renderScene } from './rendering/rendering.js';
import { createUIElements, updateUI, Popup } from './ui/ui.js';
import { setupInputHandlers } from './input/input.js';
import { PlayerShip } from './ship/ship.js';
import { clamp, createTexture } from './utils/utils.js';
import { info, error } from './utils/logger.js';

// ----- WebGL Initialization -----
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    alert('WebGL 2 not supported in this browser.');
}

// Check for required extensions
if (!gl.getExtension('EXT_color_buffer_float')) {
    alert('EXT_color_buffer_float extension not supported!');
}

// ----- Constants -----
const WIDTH = 500; // Simulation grid width
const HEIGHT = 500; // Simulation grid height

// ----- Set Canvas Dimensions Dynamically -----
canvas.width = WIDTH;
canvas.height = HEIGHT;

// Optional: Make the canvas responsive
canvas.style.width = '100%';
canvas.style.height = 'auto';

// Set the WebGL viewport to match the canvas dimensions
gl.viewport(0, 0, WIDTH, HEIGHT);

// ----- Attribute Indices -----
const ATTRIBUTES = {
    DENSITY: 0,
    TEMPERATURE: 1,
    MAGIC: 2,
    ORGANIC: 3,
    // Add more attributes as needed
};

// ----- Global Variables -----

// FPS and TPS Counters
let frameCount = 0;
let lastFpsUpdate = performance.now();
let fps = 0;

let ticsCount = 0;
let lastTpsUpdate = performance.now();
let tps = 0;

// Simulation Year Tracking
let currentYear = 0;
let ticksIntoYear = 0;

// Seasons Setup
const SEASONS = [
    { name: 'Spring', duration: 648000 }, // duration in simulation tics
    { name: 'Summer', duration: 648000 },
    { name: 'Autumn', duration: 648000 },
    { name: 'Winter', duration: 648000 }
];
const SEASON_TOTAL_DURATION = SEASONS.reduce((sum, season) => sum + season.duration, 0); // Total ticks per year (2,592,000)

// Average Temperature Tracking
let lastAvgTime = performance.now();
let averageTemperature = 0;

// Mouse Position Tracking
let mousePosition = { x: 0, y: 0 };
let mouseClientPosition = { x: 0, y: 0 };

// Update mouse position based on mousemove events
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    mousePosition.x = clamp((e.clientX - rect.left) * (WIDTH / rect.width) / dpr, 0, WIDTH - 1);
    mousePosition.y = clamp((e.clientY - rect.top) * (HEIGHT / rect.height) / dpr, 0, HEIGHT - 1);
    mouseClientPosition.x = e.clientX;
    mouseClientPosition.y = e.clientY;
});

// ----- Handle User Input -----

const inputEventTarget = setupInputHandlers();

// Track pressed keys
let pressedKeys = [];

// Update pressedKeys array based on custom events
inputEventTarget.addEventListener('w-press', () => {
    if (!pressedKeys.includes('w')) pressedKeys.push('w');
});
inputEventTarget.addEventListener('w-release', () => {
    pressedKeys = pressedKeys.filter(key => key !== 'w');
});
inputEventTarget.addEventListener('a-press', () => {
    if (!pressedKeys.includes('a')) pressedKeys.push('a');
});
inputEventTarget.addEventListener('a-release', () => {
    pressedKeys = pressedKeys.filter(key => key !== 'a');
});
inputEventTarget.addEventListener('s-press', () => {
    if (!pressedKeys.includes('s')) pressedKeys.push('s');
});
inputEventTarget.addEventListener('s-release', () => {
    pressedKeys = pressedKeys.filter(key => key !== 's');
});
inputEventTarget.addEventListener('d-press', () => {
    if (!pressedKeys.includes('d')) pressedKeys.push('d');
});
inputEventTarget.addEventListener('d-release', () => {
    pressedKeys = pressedKeys.filter(key => key !== 'd');
});

// ----- Initialize UI Elements -----

createUIElements();

// Initialize Popup
const popup = new Popup();

// ----- Initialize Simulation -----

// Create textures for current and next states
let currentStateData = new Float32Array(WIDTH * HEIGHT * 4); // RGBA
let currentState = createTexture(gl, WIDTH, HEIGHT, currentStateData);
let nextState = createTexture(gl, WIDTH, HEIGHT, new Float32Array(WIDTH * HEIGHT * 4));

// Initialize simulation with a seed
initializeSimulation(gl, currentState, WIDTH, HEIGHT, 12345);

// ----- Initialize Shader Programs -----

let updateProgram, renderProgram;
try {
    updateProgram = initializeUpdateProgram(gl);
    renderProgram = initializeRenderProgram(gl);
    info('Shader programs initialized successfully.');
} catch (err) {
    error(`Failed to initialize shader programs: ${err.message}`);
}

// ----- Initialize Framebuffers -----

const readFramebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, readFramebuffer);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentState, 0);

// Create Write Framebuffer and attach nextState
const writeFramebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, writeFramebuffer);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nextState, 0);

// Check framebuffer status
if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    error('One of the framebuffers is not complete.');
}
gl.bindFramebuffer(gl.FRAMEBUFFER, null);

// ----- Initialize Player Ship -----

const playerShip = new PlayerShip(WIDTH, HEIGHT, gl, writeFramebuffer);

// ----- Initialize Web Worker -----

const simulationWorker = new Worker(new URL('./workers/simulationWorker.js', import.meta.url));

simulationWorker.onmessage = function(e) {
    const { type, averageTemperature: avgTemp } = e.data;
    if (type === 'averageTemperature') {
        averageTemperature = avgTemp;
        lastAvgTime = performance.now();
    }
    // Handle other message types as needed
};

// ----- Simulation Settings -----

// Fixed timestep settings
const TICK_RATE = 60; // 60 tics per second
const TICK_INTERVAL = 1000 / TICK_RATE; // ~16.666 ms per tic
let lastTickTime = performance.now();

// Gravity Slider Handling
const gravitySlider = document.getElementById('gravity');
const gravityValueDisplay = document.getElementById('gravityValue');
let gravity = parseFloat(gravitySlider.value);

// Update gravity value display and variable on slider input
gravitySlider.addEventListener('input', (e) => {
    gravity = parseFloat(e.target.value);
    gravityValueDisplay.textContent = gravity.toFixed(2);
});

// ----- Error Logging Mechanism -----
const capturedErrors = [];

// Override console.error to capture error messages
const originalConsoleError = console.error;
console.error = function(...args) {
    const message = args.join(' ');
    capturedErrors.push(message);
    originalConsoleError.apply(console, args);
};

// Capture errors from Web Workers
simulationWorker.onerror = function(event) {
    const errorMessage = `Worker Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
    capturedErrors.push(errorMessage);
    error(errorMessage); // Also log using your logger
};

// ----- Keyboard Shortcut for Super Debugger -----
let isCapturing = false; // Flag to prevent multiple captures

document.addEventListener('keydown', async (e) => {
    if ((e.key === 'y' || e.key === 'Y') && !isCapturing) {
        e.preventDefault(); // Prevent any default behavior
        isCapturing = true;
        try {
            await triggerSuperDebugger();
        } catch (err) {
            error(`Debugger error: ${err.message}`);
        }
        // Reset the flag after a short delay to allow subsequent captures
        setTimeout(() => { isCapturing = false; }, 1000);
    }
});

/**
 * Triggers the super debugger to capture pixel data and error messages.
 */
async function triggerSuperDebugger() {
    // Capture pixel data
    const pixels = await capturePixelData();

    // Retrieve and clear captured errors
    const errors = [...capturedErrors];
    capturedErrors.length = 0; // Clear the array after capturing

    // Combine data into a single object
    const debugData = {
        timestamp: new Date().toISOString(),
        pixelData: pixels,
        errorMessages: errors
    };

    // Serialize to JSON
    const jsonData = JSON.stringify(debugData, null, 2); // Pretty-print with 2-space indentation

    // Copy to clipboard
    await copyToClipboard(jsonData);

    // Provide user feedback
    notifyUser('Super Debugger: Pixel data and errors have been copied to the clipboard.');
}

/**
 * Copies the given text to the clipboard.
 * @param {string} text - The text to copy.
 * @returns {Promise<void>}
 */
async function copyToClipboard(text) {
    if (!navigator.clipboard) {
        // Fallback for browsers that do not support Clipboard API
        fallbackCopyTextToClipboard(text);
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        error(`Failed to copy to clipboard: ${err.message}`);
        notifyUser('Super Debugger: Failed to copy data to clipboard.');
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
        error(`Fallback: Oops, unable to copy: ${err.message}`);
        notifyUser('Super Debugger: Failed to copy data to clipboard.');
    }

    document.body.removeChild(textarea);
}

/**
 * Displays a temporary notification to the user.
 * @param {string} message - The message to display.
 */
function notifyUser(message) {
    let notification = document.getElementById('debuggerNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'debuggerNotification';
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.background = 'rgba(0, 0, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontSize = '14px';
        notification.style.zIndex = '3000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.style.opacity = '1';

    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
    }, 3000);
}

/**
 * Captures the entire pixel data from the current simulation state.
 * @returns {Promise<Array>} - Resolves to an array containing pixel data.
 */
async function capturePixelData() {
    // Bind the readFramebuffer to read from currentState
    gl.bindFramebuffer(gl.FRAMEBUFFER, readFramebuffer);

    // Create a Float32Array to store pixel data
    const pixelData = new Float32Array(WIDTH * HEIGHT * 4); // RGBA for each pixel

    // Read pixels from the framebuffer
    gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.FLOAT, pixelData);

    // Unbind the framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Convert Float32Array to a regular array for serialization
    const pixelArray = Array.from(pixelData);

    return pixelArray;
}

/**
 * Copies the given text to the clipboard.
 * @param {string} text - The text to copy.
 * @returns {Promise<void>}
 */
async function copyToClipboard(text) {
    if (!navigator.clipboard) {
        // Fallback for browsers that do not support Clipboard API
        fallbackCopyTextToClipboard(text);
        return;
    }
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        error(`Failed to copy to clipboard: ${err.message}`);
        notifyUser('Super Debugger: Failed to copy data to clipboard.');
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
        error(`Fallback: Oops, unable to copy: ${err.message}`);
        notifyUser('Super Debugger: Failed to copy data to clipboard.');
    }

    document.body.removeChild(textarea);
}

/**
 * Displays a temporary notification to the user.
 * @param {string} message - The message to display.
 */
function notifyUser(message) {
    let notification = document.getElementById('debuggerNotification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'debuggerNotification';
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.background = 'rgba(0, 0, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '10px 20px';
        notification.style.borderRadius = '5px';
        notification.style.fontFamily = 'Arial, sans-serif';
        notification.style.fontSize = '14px';
        notification.style.zIndex = '3000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.style.opacity = '1';

    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
    }, 3000);
}

/**
 * Triggers the super debugger to capture pixel data and error messages.
 */
async function triggerSuperDebugger() {
    // Capture pixel data
    const pixels = await capturePixelData();

    // Retrieve and clear captured errors
    const errors = [...capturedErrors];
    capturedErrors.length = 0; // Clear the array after capturing

    // Combine data into a single object
    const debugData = {
        timestamp: new Date().toISOString(),
        pixelData: pixels,
        errorMessages: errors
    };

    // Serialize to JSON
    const jsonData = JSON.stringify(debugData, null, 2); // Pretty-print with 2-space indentation

    // Copy to clipboard
    await copyToClipboard(jsonData);

    // Provide user feedback
    notifyUser('Super Debugger: Pixel data and errors have been copied to the clipboard.');
}

// ----- Simulation Loop -----

function simulate(currentTime) {
    try {
        // ----- FPS Calculation -----
        frameCount++;
        if (currentTime - lastFpsUpdate >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastFpsUpdate = currentTime;
        }

        // ----- TPS Calculation -----
        if (currentTime - lastTpsUpdate >= 1000) {
            tps = ticsCount;
            ticsCount = 0;
            lastTpsUpdate = currentTime;
        }

        // ----- Average Temperature Calculation -----
        if (currentTime - lastAvgTime >= 1000) { // Every 1 second
            computeAverageTemperature(gl, readFramebuffer, WIDTH, HEIGHT);
        }

        // ----- Fixed Timestep Simulation -----
        while (currentTime - lastTickTime >= TICK_INTERVAL) {
            performSimulationStep(gl, updateProgram, writeFramebuffer, currentState, nextState, gravity);
            playerShip.update(pressedKeys, TICK_INTERVAL / 1000); // Update ship with deltaTime in seconds
            playerShip.render();
            lastTickTime += TICK_INTERVAL;
            ticsCount++;
            ticksIntoYear++;

            // Check if a year has passed
            if (ticksIntoYear >= SEASON_TOTAL_DURATION) {
                ticksIntoYear -= SEASON_TOTAL_DURATION;
                currentYear++;
                info(`Year ${currentYear} completed.`);
            }
        }

        // ----- Swap Current and Next State Textures -----
        [currentState, nextState] = [nextState, currentState];

        // Update the readFramebuffer to reference the new currentState
        gl.bindFramebuffer(gl.FRAMEBUFFER, readFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentState, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // ----- Render Pass -----
        renderScene(gl, renderProgram, currentState);

        // ----- Update UI -----
        updateUI(fps, tps, currentYear, averageTemperature);
    } catch (err) {
        error(`Simulation error: ${err.message}`);
    }

    // Continue the loop
    requestAnimationFrame(simulate);
}

// Start the simulation loop
requestAnimationFrame(simulate);

// ----- Get Pixel Data and Compute Average Temperature via Web Worker -----

// Overriding computeAverageTemperature to use Web Worker
function computeAverageTemperature(gl, readFramebuffer, width, height) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, readFramebuffer);

    const pixelData = new Float32Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.FLOAT, pixelData);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Send data to worker
    simulationWorker.postMessage({
        type: 'computeAverageTemperature',
        payload: { pixelData, width, height }
    });
}
