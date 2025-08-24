/**
 * Color Utilities - Shared functions for color manipulation across UI components
 *
 * Centralizes color format handling to reduce code duplication
 * and provide consistent color operations throughout the application.
 */

/**
 * Apply alpha transparency to a color regardless of format
 * @param {string} color - Color in hex (#ffffff) or rgba(r,g,b,a) format
 * @param {number} alpha - Alpha value between 0 and 1
 * @returns {string} Color with applied alpha in rgba format
 */
export function applyAlphaToColor(color, alpha) {
  if (color.includes('rgba')) {
    // Replace existing alpha value
    return color.replace(')', `, ${alpha})`)
  } else {
    // Convert hex to rgba with alpha
    return hexToRgba(color, alpha)
  }
}

/**
 * Convert hex color to rgba format with specified alpha
 * @param {string} hex - Hex color string (e.g., "#ffffff" or "ffffff")
 * @param {number} alpha - Alpha value between 0 and 1
 * @returns {string} RGBA color string
 */
export function hexToRgba(hex, alpha) {
  // Remove # if present
  hex = hex.replace('#', '')

  // Parse hex values
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Check if a color string is in rgba format
 * @param {string} color - Color string to check
 * @returns {boolean} True if color is in rgba format
 */
export function isRgbaFormat(color) {
  return color.includes('rgba')
}

/**
 * Check if a color string is in hex format
 * @param {string} color - Color string to check
 * @returns {boolean} True if color is in hex format
 */
export function isHexFormat(color) {
  return color.startsWith('#') || /^[0-9A-Fa-f]{6}$/.test(color)
}
