/**
 * StateUtils - Utility functions for StateManager
 * 
 * This module contains pure utility functions for:
 * - Deep cloning objects and arrays
 * - Path resolution (dot-notation)
 * - Object manipulation helpers
 * - Deep equality comparisons
 * 
 * All functions are stateless and can be tested independently.
 */

/**
 * Get value from object using dot-notation path
 * @param {Object} obj - Source object
 * @param {string} path - Dot-notation path to property
 * @returns {*} Value at path or undefined if not found
 */
export function getValueByPath(obj, path) {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
        if (current === null || current === undefined || !(part in current)) {
            return undefined;
        }
        current = current[part];
    }

    return current;
}

/**
 * Set value in object by dot-notation path (immutable)
 * Creates a new object with the value set at the specified path
 * @param {Object} obj - Source object
 * @param {string} path - Dot-notation path to property
 * @param {*} value - Value to set
 * @param {boolean} merge - Whether to merge objects instead of replacing
 * @returns {Object} New object with value set
 */
export function setValueByPath(obj, path, value, merge = false) {
    const parts = path.split('.');
    const newObj = deepClone(obj);
    let current = newObj;

    // Navigate to the parent of the target property
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (current[part] === undefined || current[part] === null) {
            current[part] = {};
        } else if (typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part];
    }

    // Set the final value
    const finalKey = parts[parts.length - 1];
    if (merge && typeof current[finalKey] === 'object' && typeof value === 'object') {
        current[finalKey] = { ...current[finalKey], ...value };
    } else {
        current[finalKey] = value;
    }

    return newObj;
}

/**
 * Optimized deep clone with structured clone fallback
 * @param {*} obj - Object to clone
 * @returns {*} Deep cloned object
 */
export function deepClone(obj) {
    // Use native structuredClone if available (modern browsers, Node 17+)
    if (typeof structuredClone !== 'undefined') {
        try {
            return structuredClone(obj);
        } catch (error) {
            // Fall back to manual cloning for non-cloneable objects
        }
    }

    // Fallback manual cloning
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (Array.isArray(obj)) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const cloned = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                cloned[key] = deepClone(obj[key]);
            }
        }
        return cloned;
    }
    return obj;
}

/**
 * Deep equality check for comparing objects and arrays
 * @param {*} a - First value to compare
 * @param {*} b - Second value to compare
 * @returns {boolean} True if values are deeply equal
 */
export function deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    
    // Check if both are arrays
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (!deepEqual(a[i], b[i])) return false;
        }
        return true;
    }
    
    // If one is array and other isn't, they're not equal
    if (Array.isArray(a) || Array.isArray(b)) {
        return false;
    }
    
    // Check if both are objects (and not arrays)
    if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        for (const key of keysA) {
            if (!keysB.includes(key)) return false;
            if (!deepEqual(a[key], b[key])) return false;
        }
        return true;
    }
    return false;
}

/**
 * Resolve validation rule references
 * Converts string references to actual values from state
 * @param {*} value - The value to resolve (could be string reference or actual value)
 * @param {string} path - Current path being validated
 * @param {Object} state - Current state for reference resolution
 * @returns {*} Resolved value
 */
export function resolveReference(value, path, state) {
    if (typeof value !== 'string') {
        return value;
    }

    // Check if it's a reference (starts with $)
    if (value.startsWith('$')) {
        const refPath = value.substring(1);
        const resolvedValue = getValueByPath(state, refPath);
        return resolvedValue !== undefined ? resolvedValue : value;
    }

    return value;
}

/**
 * Split dot-notation path into parts
 * @param {string} path - Dot-notation path
 * @returns {string[]} Array of path parts
 */
export function splitPath(path) {
    return path.split('.');
}

/**
 * Join path parts into dot-notation path
 * @param {string[]} parts - Array of path parts
 * @returns {string} Dot-notation path
 */
export function joinPath(parts) {
    return parts.join('.');
}

/**
 * Check if a path is valid (non-empty string)
 * @param {*} path - Path to validate
 * @returns {boolean} True if path is valid
 */
export function isValidPath(path) {
    return typeof path === 'string' && path.length > 0;
}

/**
 * Get parent path from a dot-notation path
 * @param {string} path - Dot-notation path
 * @returns {string} Parent path or empty string if no parent
 */
export function getParentPath(path) {
    const parts = splitPath(path);
    if (parts.length <= 1) return '';
    return joinPath(parts.slice(0, -1));
}

/**
 * Get the last part of a dot-notation path
 * @param {string} path - Dot-notation path
 * @returns {string} Last part of the path
 */
export function getPathLeaf(path) {
    const parts = splitPath(path);
    return parts[parts.length - 1];
}
