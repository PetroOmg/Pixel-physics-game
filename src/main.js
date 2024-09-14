// src/main.js

import { initializeSimulation, performSimulationStep, computeAverageTemperature } from './simulation/simulation.js';
import { initializeUpdateProgram, initializeRenderProgram, renderScene } from './rendering/rendering.js';
import { createUIElements, updateUI } from './ui/ui.js';
import { setupInputHandlers, handlePlayerInput } from './input/input.js';
import { PlayerShip } from './ship/ship.js';
import { clamp, createTexture } from './utils/utils.js';

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

// ----- Handle User Input -----

const keys = {};
setupInputHandlers(keys);

// ----- Initialize UI Elements -----

createUIElements();

// ----- Initialize Simulation -----

// Create textures for current and next states
const currentStateData = new Float32Array(WIDTH * HEIGHT * 4); // RGBA
const currentState = createTexture(gl, WIDTH, HEIGHT, currentStateData);
const nextState = createTexture(gl, WIDTH, HEIGHT, new Float32Array(WIDTH * HEIGHT * 4));

// Initialize simulation with a seed
initializeSimulation(gl, currentState, WIDTH, HEIGHT, 12345);

// ----- Initialize Shader Programs -----

const updateProgram = initializeUpdateProgram(gl);
const renderProgram = initializeRenderProgram(gl);

// ----- Initialize Framebuffers -----

const framebuffer = gl.createFramebuffer();

// Initialize readFramebuffer to read from currentState
const readFramebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, readFramebuffer);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentState, 0);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);

// ----- Initialize Player Ship -----

const playerShip = new PlayerShip(WIDTH, HEIGHT, gl, readFramebuffer);

// ----- Simulation Settings -----

// Fixed timestep settings
const TICK_RATE = 60; // 60 tics per second
const TICK_INTERVAL = 1000 / TICK_RATE; // ~16.666 ms per tic
let lastTickTime = performance.now();

// ----- Simulation Loop -----

function simulate(currentTime) {
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
        averageTemperature = computeAverageTemperature(gl, readFramebuffer, WIDTH, HEIGHT);
        lastAvgTime += 1000;
    }

    // ----- Fixed Timestep Simulation -----
    while (currentTime - lastTickTime >= TICK_INTERVAL) {
        performSimulationStep(gl, updateProgram, framebuffer, currentState, nextState, 0.1);
        lastTickTime += TICK_INTERVAL;
        ticsCount++;
        ticksIntoYear++;

        // Check if a year has passed
        if (ticksIntoYear >= SEASON_TOTAL_DURATION) {
            ticksIntoYear -= SEASON_TOTAL_DURATION;
            currentYear++;
            console.log(`Year ${currentYear} completed.`);
        }

        // Update Loading Bar and other UI elements if necessary
    }

    // ----- Render Pass -----
    renderScene(gl, renderProgram, currentState);

    // ----- Handle Player Input -----
    handlePlayerInput(keys, playerShip, 1 / TICK_RATE); // Pass fixed deltaTime in seconds

    // ----- Render Ship -----
    playerShip.render();

    // ----- Update UI -----
    updateUI(fps, tps, currentYear, averageTemperature);

    // Continue the loop
    requestAnimationFrame(simulate);
}

// Start the simulation loop
requestAnimationFrame(simulate);
