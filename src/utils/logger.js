// src/utils/logger.js

const levels = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

/**
 * Logs a message with the specified level.
 * @param {string} message - The message to log.
 * @param {string} level - The level of the log (INFO, WARN, ERROR).
 */
export function log(message, level = levels.INFO) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
}

/**
 * Logs an informational message.
 * @param {string} message - The message to log.
 */
export function info(message) {
    log(message, levels.INFO);
}

/**
 * Logs a warning message.
 * @param {string} message - The message to log.
 */
export function warn(message) {
    log(message, levels.WARN);
}

/**
 * Logs an error message.
 * @param {string} message - The message to log.
 */
export function error(message) {
    log(message, levels.ERROR);
}
