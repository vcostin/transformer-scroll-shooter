/**
 * Collision Utilities - Phase 2 Module Extraction
 * 
 * Reusable collision detection functions for game objects.
 * Extracted from Game class for better modularity and testing.
 */

/**
 * Basic rectangle collision detection (AABB)
 * @param {Object} rect1 - First rectangle with x, y, width, height
 * @param {Object} rect2 - Second rectangle with x, y, width, height
 * @returns {boolean} - True if rectangles intersect
 */
export function checkRectCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

/**
 * Circle collision detection
 * @param {Object} circle1 - First circle with x, y, radius
 * @param {Object} circle2 - Second circle with x, y, radius
 * @returns {boolean} - True if circles intersect
 */
export function checkCircleCollision(circle1, circle2) {
    const dx = circle1.x - circle2.x;
    const dy = circle1.y - circle2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < circle1.radius + circle2.radius;
}

/**
 * Point-in-rectangle collision detection
 * @param {Object} point - Point with x, y coordinates
 * @param {Object} rect - Rectangle with x, y, width, height
 * @returns {boolean} - True if point is inside rectangle
 */
export function pointInRect(point, rect) {
    return point.x >= rect.x && 
           point.x <= rect.x + rect.width &&
           point.y >= rect.y && 
           point.y <= rect.y + rect.height;
}

/**
 * Check if object is within screen bounds
 * @param {Object} obj - Object with x, y, width, height
 * @param {number} screenWidth - Screen width
 * @param {number} screenHeight - Screen height
 * @param {number} margin - Margin for off-screen detection (default: 100)
 * @returns {boolean} - True if object is within bounds
 */
export function isWithinBounds(obj, screenWidth, screenHeight, margin = 100) {
    return obj.x > -margin && 
           obj.x < screenWidth + margin &&
           obj.y > -margin && 
           obj.y < screenHeight + margin;
}

/**
 * Calculate distance between two points
 * @param {Object} point1 - First point with x, y
 * @param {Object} point2 - Second point with x, y
 * @returns {number} - Distance between points
 */
export function calculateDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two points
 * @param {Object} from - Starting point with x, y
 * @param {Object} to - Ending point with x, y
 * @returns {number} - Angle in radians
 */
export function calculateAngle(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
}

// Default export for convenience
export default {
    checkRectCollision,
    checkCircleCollision,
    pointInRect,
    isWithinBounds,
    calculateDistance,
    calculateAngle
};
