// src/utils/compression.js

/**
 * Compresses an array using Run-Length Encoding (RLE).
 * @param {Array<number>} data - The quantized integer data to compress.
 * @returns {Array<Array<number>>} - The RLE compressed data as [value, count] pairs.
 */
export function rleCompress(data) {
    if (data.length === 0) return [];
    
    const compressed = [];
    let prev = data[0];
    let count = 1;
    
    for (let i = 1; i < data.length; i++) {
        if (data[i] === prev) {
            count++;
            // To prevent count overflow, reset if count exceeds 255
            if (count === 255) {
                compressed.push([prev, count]);
                count = 0;
            }
        } else {
            if (count > 0) {
                compressed.push([prev, count]);
            }
            prev = data[i];
            count = 1;
        }
    }
    
    // Push the last run
    if (count > 0) {
        compressed.push([prev, count]);
    }
    
    return compressed;
}

/**
 * Decompresses RLE compressed data.
 * @param {Array<Array<number>>} compressedData - The RLE compressed data as [value, count] pairs.
 * @returns {Uint16Array} - The decompressed quantized data.
 */
export function rleDecompress(compressedData) {
    const decompressed = [];
    
    for (const [value, count] of compressedData) {
        for (let i = 0; i < count; i++) {
            decompressed.push(value);
        }
    }
    
    return new Uint16Array(decompressed);
}

/**
 * Quantizes a Float32Array to a Uint16Array by scaling and rounding.
 * @param {Float32Array} floatArray - The original float data.
 * @param {number} factor - The scaling factor.
 * @returns {Uint16Array} - The quantized integer data.
 */
export function quantizeData(floatArray, factor = 100) {
    const quantized = new Uint16Array(floatArray.length);
    for (let i = 0; i < floatArray.length; i++) {
        quantized[i] = Math.round(floatArray[i] * factor);
    }
    return quantized;
}

/**
 * Dequantizes a Uint16Array back to a Float32Array by scaling down.
 * @param {Uint16Array} intArray - The quantized integer data.
 * @param {number} factor - The scaling factor used during quantization.
 * @returns {Float32Array} - The dequantized float data.
 */
export function dequantizeData(intArray, factor = 100) {
    const dequantized = new Float32Array(intArray.length);
    for (let i = 0; i < intArray.length; i++) {
        dequantized[i] = intArray[i] / factor;
    }
    return dequantized;
}
