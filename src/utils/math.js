/**
 * Math Utilities - Phase 2 Module Extraction
 *
 * Common mathematical functions and helpers for game development.
 * Extracted from various files for better reusability.
 */

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Clamped value
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Linear interpolation between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} - Interpolated value
 */
export function lerp(start, end, t) {
  return start + (end - start) * t
}

/**
 * Generate random number between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random number
 */
export function randomBetween(min, max) {
  return Math.random() * (max - min) + min
}

/**
 * Generate random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random integer
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * Convert degrees to radians
 * @param {number} degrees - Degrees
 * @returns {number} - Radians
 */
export function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180)
}

/**
 * Convert radians to degrees
 * @param {number} radians - Radians
 * @returns {number} - Degrees
 */
export function radiansToDegrees(radians) {
  return radians * (180 / Math.PI)
}

/**
 * Normalize a vector
 * @param {Object} vector - Vector with x, y components
 * @returns {Object} - Normalized vector
 */
export function normalize(vector) {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y)
  if (length === 0) return { x: 0, y: 0 }
  return { x: vector.x / length, y: vector.y / length }
}

/**
 * Calculate vector magnitude
 * @param {Object} vector - Vector with x, y components
 * @returns {number} - Vector magnitude
 */
export function magnitude(vector) {
  return Math.sqrt(vector.x * vector.x + vector.y * vector.y)
}

/**
 * Check if a value is approximately equal to another (within epsilon)
 * @param {number} a - First value
 * @param {number} b - Second value
 * @param {number} epsilon - Tolerance (default: 0.001)
 * @returns {boolean} - True if approximately equal
 */
export function approximately(a, b, epsilon = 0.001) {
  return Math.abs(a - b) < epsilon
}

/**
 * Sign function (-1, 0, or 1)
 * @param {number} value - Input value
 * @returns {number} - Sign of value
 */
export function sign(value) {
  return value > 0 ? 1 : value < 0 ? -1 : 0
}

// Default export for convenience
export default {
  clamp,
  lerp,
  randomBetween,
  randomInt,
  degreesToRadians,
  radiansToDegrees,
  normalize,
  magnitude,
  approximately,
  sign
}
