// src/simulation/simulation.js

import { clamp, createTexture } from '../utils/utils.js';

/**
 * Initializes the simulation world with a given seed.
 * @param {WebGL2RenderingContext} gl - The WebGL context.
 * @param {WebGLTexture} currentState - The texture representing the current state.
 * @param {number} width - Simulation grid width.
 * @param {number} height - Simulation grid height.
 * @param {number} seed - Seed value for random generation.
 */
export function initializeSimulation(gl, currentState, width, height, seed) {
    const rand = mulberry32(seed);
    const initialData = new Float32Array(width * height * 4);

    for (let i = 0; i < width * height; i++) {
        initialData[i * 4 + 0] = clamp(rand(), 0.0, 1.0);        // Density (R)
        initialData[i * 4 + 1] = clamp(rand(), 0.0, 1.0);        // Temperature (G)
        initialData[i * 4 + 2] = clamp(rand() * 0.5, 0.0, 1.0);  // Magic (B)
        initialData[i * 4 + 3] = clamp(0.0, 0.0, 1.0);          // Organic (A)
    }

    gl.bindTexture(gl.TEXTURE_2D, currentState);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.FLOAT, initialData);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

/**
 * Performs a single simulation step.
 * @param {WebGL2RenderingContext} gl - The WebGL context.
 * @param {WebGLProgram} updateProgram - The shader program for updating simulation.
 * @param {WebGLFramebuffer} framebuffer - The framebuffer to render to.
 * @param {WebGLTexture} currentState - The texture representing the current state.
 * @param {WebGLTexture} nextState - The texture representing the next state.
 * @param {number} gravity - Gravity value influencing the simulation.
 */
export function performSimulationStep(gl, updateProgram, framebuffer, currentState, nextState, gravity) {
    gl.useProgram(updateProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nextState, 0);

    // Set uniforms
    const gravityLoc = gl.getUniformLocation(updateProgram, 'u_gravity');
    const currentStateLoc = gl.getUniformLocation(updateProgram, 'u_currentState');
    gl.uniform1f(gravityLoc, gravity);
    gl.uniform1i(currentStateLoc, 0); // Texture unit 0

    // Bind current state texture to texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, currentState);

    // Draw the full-screen quad
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Unbind framebuffer and texture
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

/**
 * Mulberry32 PRNG.
 * @param {number} a - Seed value.
 * @returns {Function} - A function that returns a pseudo-random number between 0 and 1.
 */
function mulberry32(a) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}
