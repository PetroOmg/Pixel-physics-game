// src/utils/compression.js

/**
 * Compresses an array using Run-Length Encoding (RLE).
 * @param {Float32Array} data - The pixel data to compress.
 * @returns {Array} - The RLE compressed data as [value, count] pairs.
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
 * @param {Array} compressedData - The RLE compressed data as [value, count] pairs.
 * @returns {Float32Array} - The decompressed pixel data.
 */
export function rleDecompress(compressedData) {
    const decompressed = [];
    
    for (const [value, count] of compressedData) {
        for (let i = 0; i < count; i++) {
            decompressed.push(value);
        }
    }
    
    return new Float32Array(decompressed);
}
