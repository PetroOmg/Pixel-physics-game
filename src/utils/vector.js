// src/utils/vector.js

/**
 * Adds two vectors.
 * @param {Object} v1 - Vector 1 with x and y.
 * @param {Object} v2 - Vector 2 with x and y.
 * @returns {Object} - Resultant vector.
 */
export function addVectors(v1, v2) {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
}

/**
 * Subtracts vector v2 from v1.
 * @param {Object} v1 - Vector 1 with x and y.
 * @param {Object} v2 - Vector 2 with x and y.
 * @returns {Object} - Resultant vector.
 */
export function subtractVectors(v1, v2) {
    return { x: v1.x - v2.x, y: v1.y - v2.y };
}

/**
 * Multiplies a vector by a scalar.
 * @param {Object} v - Vector with x and y.
 * @param {number} scalar - Scalar value.
 * @returns {Object} - Resultant vector.
 */
export function multiplyVector(v, scalar) {
    return { x: v.x * scalar, y: v.y * scalar };
}

/**
 * Calculates the magnitude of a vector.
 * @param {Object} v - Vector with x and y.
 * @returns {number} - Magnitude.
 */
export function magnitude(v) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Normalizes a vector.
 * @param {Object} v - Vector with x and y.
 * @returns {Object} - Normalized vector.
 */
export function normalize(v) {
    const mag = magnitude(v);
    if (mag === 0) return { x: 0, y: 0 };
    return { x: v.x / mag, y: v.y / mag };
}
