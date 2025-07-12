/**
 * Shared application constants and build-time definitions
 * Used by both Vite and Vitest configurations
 */

import { readFileSync } from 'fs'

/**
 * Reads and parses package.json
 * @returns {Object} Parsed package.json content
 */
function getPackageInfo() {
  try {
    return JSON.parse(readFileSync('./package.json', 'utf8'))
  } catch (error) {
    console.error('Failed to read package.json:', error)
    return {
      name: 'unknown',
      version: '0.0.0',
      description: 'Unknown application'
    }
  }
}

/**
 * Generates build-time constants for injection into the application
 * @returns {Object} Define constants for Vite/Vitest
 */
export function createAppDefines() {
  const packageJson = getPackageInfo()
  
  return {
    // Inject version info at build/test time
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __APP_NAME__: JSON.stringify('Transformer Scroll Shooter'), // Display name
    __APP_PACKAGE_NAME__: JSON.stringify(packageJson.name), // Package name
    __APP_DESCRIPTION__: JSON.stringify(packageJson.description),
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
  }
}

/**
 * Gets package.json info for use in config files
 * @returns {Object} Package information
 */
export function getAppInfo() {
  return getPackageInfo()
}
