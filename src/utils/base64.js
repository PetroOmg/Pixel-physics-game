// src/utils/base64.js

/**
 * Converts a Float32Array to a binary string.
 * @param {Float32Array} floatArray - The Float32Array to convert.
 * @returns {string} - The binary string representation.
 */
export function float32ArrayToBinaryString(floatArray) {
    let binary = '';
    for (let i = 0; i < floatArray.length; i++) {
        const float = floatArray[i];
        const bytes = new Uint8Array(new Float32Array([float]).buffer);
        for (let byte of bytes) {
            binary += String.fromCharCode(byte);
        }
    }
    return binary;
}

/**
 * Converts a binary string to a Float32Array.
 * @param {string} binary - The binary string to convert.
 * @returns {Float32Array} - The resulting Float32Array.
 */
export function binaryStringToFloat32Array(binary) {
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    const floatArray = new Float32Array(bytes.buffer);
    return floatArray;
}

/**
 * Encodes a binary string to a Base64 string.
 * @param {string} binary - The binary string to encode.
 * @returns {string} - The Base64 encoded string.
 */
export function encodeBase64(binary) {
    return btoa(binary);
}

/**
 * Decodes a Base64 string to a binary string.
 * @param {string} base64 - The Base64 string to decode.
 * @returns {string} - The decoded binary string.
 */
export function decodeBase64(base64) {
    return atob(base64);
}
