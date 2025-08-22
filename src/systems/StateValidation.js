/**
 * StateValidation - Validation logic for StateManager
 *
 * This module contains all validation-related functionality:
 * - Schema validation logic
 * - Type checking utilities
 * - Dynamic validation resolution
 * - Error handling for validation
 *
 * All functions work with external schema definitions and are stateless.
 */

import { getValidationRules } from '@/constants/state-schema.js'
import { safeResolveReference } from '@/systems/StateUtils.js'

/**
 * Validate a value against schema rules for a given path
 * @param {string} path - Dot-notation path to state property
 * @param {*} value - Value to validate
 * @param {Object} currentState - Current state for reference resolution
 * @returns {string|null} Error message if validation fails, null if valid
 */
export function validateValue(path, value, currentState) {
  const rules = getValidationRules(path)
  if (!rules) return null

  // Type validation
  if (rules.type) {
    if (rules.type === 'any') return null
    if (rules.nullable && value === null) return null

    const valueType = Array.isArray(value) ? 'array' : typeof value
    if (valueType !== rules.type) {
      return `Expected ${rules.type}, got ${valueType}`
    }
  }

  // Enum validation
  if (rules.enum && !rules.enum.includes(value)) {
    return `Value must be one of: ${rules.enum.join(', ')}`
  }

  // Number range validation with safe reference resolution
  if (typeof value === 'number') {
    const resolvedMin = safeResolveReference(rules.min, path, currentState, null, true)
    const resolvedMax = safeResolveReference(rules.max, path, currentState, null, true)

    if (resolvedMin !== null && value < resolvedMin) {
      return `Value must be >= ${resolvedMin}`
    }

    if (resolvedMax !== null && value > resolvedMax) {
      return `Value must be <= ${resolvedMax}`
    }
  }

  // String validation
  if (typeof value === 'string') {
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      return `String must be at least ${rules.minLength} characters long`
    }

    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      return `String must be no more than ${rules.maxLength} characters long`
    }

    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
      return `String does not match required pattern: ${rules.pattern}`
    }
  }

  // Array validation
  if (Array.isArray(value)) {
    if (rules.minItems !== undefined && value.length < rules.minItems) {
      return `Array must have at least ${rules.minItems} items`
    }

    if (rules.maxItems !== undefined && value.length > rules.maxItems) {
      return `Array must have no more than ${rules.maxItems} items`
    }

    if (rules.uniqueItems && hasDuplicates(value)) {
      return `Array items must be unique`
    }
  }

  // Object validation
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    if (rules.required) {
      const missingKeys = rules.required.filter(key => !(key in value))
      if (missingKeys.length > 0) {
        return `Missing required properties: ${missingKeys.join(', ')}`
      }
    }

    if (rules.properties) {
      for (const [key, keyValue] of Object.entries(value)) {
        if (rules.properties[key]) {
          const keyPath = path ? `${path}.${key}` : key
          const keyError = validateValue(keyPath, keyValue, currentState)
          if (keyError) {
            return `Property '${key}': ${keyError}`
          }
        }
      }
    }
  }

  return null
}

/**
 * Validate multiple values in a batch operation
 * @param {Array} updates - Array of {path, value} objects to validate
 * @param {Object} currentState - Current state for reference resolution
 * @returns {Array} Array of validation errors (empty if all valid)
 */
export function validateBatch(updates, currentState) {
  const errors = []

  for (const update of updates) {
    const { path, value } = update
    const error = validateValue(path, value, currentState)
    if (error) {
      errors.push({ path, error })
    }
  }

  return errors
}

/**
 * Check if a path has validation rules defined
 * @param {string} path - Dot-notation path to check
 * @returns {boolean} True if validation rules exist for this path
 */
export function hasValidationRules(path) {
  return getValidationRules(path) !== null
}

/**
 * Get all validation rules for a path
 * @param {string} path - Dot-notation path
 * @returns {Object|null} Validation rules object or null if none exist
 */
export function getPathValidationRules(path) {
  return getValidationRules(path)
}

/**
 * Check if a value type matches the expected type
 * @param {*} value - Value to check
 * @param {string} expectedType - Expected type name
 * @returns {boolean} True if types match
 */
export function isValidType(value, expectedType) {
  if (expectedType === 'any') return true

  const actualType = Array.isArray(value) ? 'array' : typeof value
  return actualType === expectedType
}

/**
 * Get the type of a value in validation-friendly format
 * @param {*} value - Value to get type for
 * @returns {string} Type name (array, object, string, number, boolean, null, undefined)
 */
export function getValueType(value) {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

/**
 * Check if an array has duplicate values
 * @param {Array} array - Array to check
 * @returns {boolean} True if array has duplicates
 * @private
 */
function hasDuplicates(array) {
  const seen = new Set()
  for (const item of array) {
    const key = typeof item === 'object' ? JSON.stringify(item) : item
    if (seen.has(key)) {
      return true
    }
    seen.add(key)
  }
  return false
}

/**
 * Validate that a value is not null or undefined when required
 * @param {*} value - Value to check
 * @param {boolean} required - Whether the value is required
 * @returns {string|null} Error message if invalid, null if valid
 */
export function validateRequired(value, required) {
  if (required && (value === null || value === undefined)) {
    return 'Value is required'
  }
  return null
}

/**
 * Validate enum values
 * @param {*} value - Value to validate
 * @param {Array} enumValues - Allowed enum values
 * @returns {string|null} Error message if invalid, null if valid
 */
export function validateEnum(value, enumValues) {
  if (enumValues && !enumValues.includes(value)) {
    return `Value must be one of: ${enumValues.join(', ')}`
  }
  return null
}

/**
 * Validate number ranges
 * @param {number} value - Number to validate
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {string|null} Error message if invalid, null if valid
 */
export function validateNumberRange(value, min, max) {
  if (typeof value !== 'number') {
    return 'Value must be a number'
  }

  if (min !== undefined && value < min) {
    return `Value must be >= ${min}`
  }

  if (max !== undefined && value > max) {
    return `Value must be <= ${max}`
  }

  return null
}

/**
 * Create a validation error with context
 * @param {string} path - Path where validation failed
 * @param {string} message - Error message
 * @param {*} value - Value that failed validation
 * @returns {Error} Validation error with context
 */
export function createValidationError(path, message, value) {
  const error = new Error(`Validation error for '${path}': ${message}`)
  // Attach context using Object.assign to avoid property typing issues in editors
  return Object.assign(error, { path, value, type: 'ValidationError' })
}
