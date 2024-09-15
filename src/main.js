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

const framebuffer = gl.createFramebuffer();

// Initialize readFramebuffer to read from currentState
const readFramebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, readFramebuffer);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentState, 0);

// Check framebuffer status
if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    error('readFramebuffer is not complete.');
}
gl.bindFramebuffer(gl.FRAMEBUFFER, null);

// ----- Initialize Player Ship -----

const playerShip = new PlayerShip(WIDTH, HEIGHT, gl, readFramebuffer);

// ----- Initialize Web Worker -----

const simulationWorker = new Worker(new URL('./workers/simulationWorker.js', import.meta.url));

simulationWorker.onmessage = function(e) {
    const { type, averageTemperature: avgTemp } = e.data;
    if (type === 'averageTemperature') {
        averageTemperature = avgTemp;
        lastAvgTime = performance.now();
    }
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

// ----- Helper Function to Get Pixel Data Under Cursor -----

/**
 * Retrieves the pixel data at the given simulation coordinates.
 * @param {number} x - The x-coordinate in the simulation grid.
 * @param {number} y - The y-coordinate in the simulation grid.
 * @returns {Promise<Float32Array>} - The pixel data [R, G, B, A].
 */
function getPixelData(x, y) {
    return new Promise((resolve, reject) => {
        // Bind readFramebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, readFramebuffer);

        // Read the pixel at (x, y)
        const pixelData = new Float32Array(4);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.FLOAT, pixelData);

        // Unbind framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        resolve(pixelData);
    });
}

/**
 * Determines the material name based on attribute values.
 * @param {number} density - Density attribute [0,1].
 * @param {number} temperature - Temperature attribute [0,1].
 * @param {number} magic - Magic attribute [0,1].
 * @param {number} organic - Organic attribute [0,1].
 * @returns {string} - The name of the material.
 */
function getMaterialName(density, temperature, magic, organic) {
    // Define your own logic for mapping attributes to material names
    if (organic > 0.5) return 'Organic';
    if (magic > 0.3) return 'Magic';
    if (density > 0.7) return 'Metal';
    if (temperature > 0.5) return 'Hot';
    return 'Unknown';
}

// ----- Handle 't' Key Events -----

inputEventTarget.addEventListener('t-press', async () => {
    // Get simulation grid position
    const x = Math.floor(mousePosition.x);
    const y = Math.floor(mousePosition.y);

    // Invert Y for WebGL
    const invertedY = HEIGHT - y - 1;

    try {
        // Get pixel data
        const pixelData = await getPixelData(x, invertedY);

        // Extract attributes, clamped
        const density = clamp(pixelData[ATTRIBUTES.DENSITY], 0.0, 1.0);
        const temperature = clamp(pixelData[ATTRIBUTES.TEMPERATURE], 0.0, 1.0);
        const magic = clamp(pixelData[ATTRIBUTES.MAGIC], 0.0, 1.0);
        const organic = clamp(pixelData[ATTRIBUTES.ORGANIC], 0.0, 1.0);

        // Determine material name
        const materialName = getMaterialName(density, temperature, magic, organic);

        // Create popup content
        const content = `
            <strong>Pixel (${x}, ${y})</strong><br>
            <strong>Material:</strong> ${materialName}<br>
            <strong>Density:</strong> ${density.toFixed(2)}<br>
            <strong>Temperature:</strong> ${temperature.toFixed(2)}<br>
            <strong>Magic:</strong> ${magic.toFixed(2)}<br>
            <strong>Organic:</strong> ${organic.toFixed(2)}
        `;

        // Position the popup near the mouse cursor
        const position = { x: mouseClientPosition.x, y: mouseClientPosition.y };

        // Show the popup
        popup.show(content, position);
    } catch (err) {
        error(`Failed to retrieve pixel data: ${err.message}`);
    }
});

inputEventTarget.addEventListener('t-release', () => {
    popup.hide();
});

// ----- Toggle Dev Panel Visibility -----

document.addEventListener('keydown', (e) => {
    if (e.key === 'F1') { // Example: Toggle with F1
        const devPanel = document.getElementById('devPanel');
        if (devPanel) {
            devPanel.style.display = devPanel.style.display === 'none' ? 'block' : 'none';
        }
        e.preventDefault(); // Prevent default F1 action
    }
});

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
            performSimulationStep(gl, updateProgram, framebuffer, currentState, nextState, gravity);
            lastTickTime += TICK_INTERVAL;
            ticsCount++;
            ticksIntoYear++;

            // Check if a year has passed
            if (ticksIntoYear >= SEASON_TOTAL_DURATION) {
                ticksIntoYear -= SEASON_TOTAL_DURATION;
                currentYear++;
                info(`Year ${currentYear} completed.`);
            }

            // Swap current and next state textures
            [currentState, nextState] = [nextState, currentState];

            // Update the readFramebuffer to reference the new currentState
            gl.bindFramebuffer(gl.FRAMEBUFFER, readFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentState, 0);

            // Unbind framebuffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        // ----- Render Pass -----
        renderScene(gl, renderProgram, currentState);

        // ----- Render Ship -----
        playerShip.render();

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
