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
 * Resolve a reference value, supporting $ references and relative paths
 * Enhanced with safe default value handling to prevent undefined comparisons
 * @param {*} value - Value to resolve (could be a reference string)
 * @param {string} path - Current path context for relative references
 * @param {Object} state - Current state object
 * @param {*} defaultValue - Default value if resolution fails (if not provided, returns original value)
 * @returns {*} Resolved value or defaultValue or original value
 */
export function resolveReference(value, path, state, defaultValue = null) {
    if (typeof value !== 'string') {
        return value;
    }

    // Check if it's a $ reference (starts with $)
    if (value.startsWith('$')) {
        const refPath = value.substring(1);
        const resolvedValue = getValueByPath(state, refPath);
        if (resolvedValue !== undefined) {
            return resolvedValue;
        }
        // Return defaultValue if provided, otherwise return original value (backward compatibility)
        return defaultValue !== null ? defaultValue : value;
    }

    // Handle schema-style references (relative to parent object)
    // For example, if path is 'player.health' and value is 'maxHealth',
    // resolve to 'player.maxHealth'
    const pathParts = path.split('.');
    const parentPath = pathParts.slice(0, -1).join('.');
    const referencePath = parentPath ? `${parentPath}.${value}` : value;
    
    const resolvedValue = getValueByPath(state, referencePath);
    if (resolvedValue !== undefined) {
        return resolvedValue;
    }
    // Return defaultValue if provided, otherwise return original value (backward compatibility)
    return defaultValue !== null ? defaultValue : value;
}

/**
 * Ramda-style pathOr function - get value by path with default fallback
 * Inspired by functional programming libraries for safer path access
 * @param {*} defaultValue - Default value if path doesn't exist
 * @param {string} path - Dot-notation path to property
 * @param {Object} obj - Object to traverse
 * @returns {*} Value at path or defaultValue
 */
export function pathOr(defaultValue, path, obj) {
    if (!obj || typeof obj !== 'object') {
        return defaultValue;
    }
    
    const value = getValueByPath(obj, path);
    return value !== undefined ? value : defaultValue;
}

/**
 * Safe reference resolution for validation rules
 * Ensures numeric comparisons always have valid values
 * @param {*} reference - Reference value to resolve
 * @param {string} path - Current validation path
 * @param {Object} state - Current state
 * @param {*} fallback - Fallback value for failed resolution
 * @param {boolean} expectNumeric - Whether to convert result to number
 * @returns {*} Safely resolved value
 */
export function safeResolveReference(reference, path, state, fallback = null, expectNumeric = false) {
    if (reference === undefined || reference === null) {
        return fallback;
    }
    
    const resolved = resolveReference(reference, path, state, fallback);
    
    // If resolveReference returned the original string and it was a reference,
    // it means the resolution failed, so return fallback
    if (typeof reference === 'string' && reference.startsWith('$') && resolved === reference) {
        return fallback;
    }
    
    // Only convert to numeric if explicitly requested or reference suggests numeric intent
    const shouldConvertToNumeric = expectNumeric || 
        (typeof reference === 'number') ||
        (typeof reference === 'string' && !isNaN(Number(reference)) && reference !== '' && !/^[a-zA-Z]/.test(reference));
    
    if (shouldConvertToNumeric && resolved !== null && resolved !== undefined) {
        const numericValue = Number(resolved);
        return !isNaN(numericValue) ? numericValue : fallback;
    }
    
    return resolved;
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
