/**
 * PatternMatcher - Advanced pattern matching for side effects
 * Supports glob patterns, wildcards, and regex for flexible effect registration
 */
export class PatternMatcher {
  constructor() {
    this.patterns = new Map();
  }

  /**
   * Register a pattern with its handler and priority
   * @param {string|RegExp} pattern - Pattern to match against
   * @param {Function} handler - Handler function
   * @param {Object} options - Options (priority, once, etc.)
   * @returns {string} Pattern ID for unregistration
   */
  register(pattern, handler, options = {}) {
    const id = this._generateId();
    const patternEntry = {
      id,
      pattern,
      handler,
      priority: options.priority || 0,
      once: options.once || false,
      type: this._getPatternType(pattern),
      compiledPattern: this._compilePattern(pattern)
    };

    this.patterns.set(id, patternEntry);
    return id;
  }

  /**
   * Unregister a pattern by ID
   * @param {string} id - Pattern ID to remove
   * @returns {boolean} True if pattern was removed
   */
  unregister(id) {
    return this.patterns.delete(id);
  }

  /**
   * Get all patterns that match the given event name
   * @param {string} eventName - Event name to match against
   * @returns {Array} Array of matching pattern entries sorted by priority
   */
  getMatches(eventName) {
    const matches = [];

    for (const patternEntry of this.patterns.values()) {
      if (this._isMatch(eventName, patternEntry)) {
        matches.push(patternEntry);
      }
    }

    // Sort by priority (higher priority first)
    return matches.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove patterns that should only run once
   * @param {Array} patternIds - Array of pattern IDs to potentially remove
   */
  removeOncePatterns(patternIds) {
    patternIds.forEach(id => {
      const pattern = this.patterns.get(id);
      if (pattern && pattern.once) {
        this.patterns.delete(id);
      }
    });
  }

  /**
   * Get current statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const stats = {
      totalPatterns: this.patterns.size,
      byType: {},
      byPriority: {}
    };

    for (const pattern of this.patterns.values()) {
      // Count by type
      stats.byType[pattern.type] = (stats.byType[pattern.type] || 0) + 1;
      
      // Count by priority
      const priority = pattern.priority.toString();
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
    }

    return stats;
  }

  /**
   * Clear all patterns
   */
  clear() {
    this.patterns.clear();
  }

  /**
   * Determine the type of pattern
   * @private
   */
  _getPatternType(pattern) {
    if (pattern instanceof RegExp) return 'regex';
    if (typeof pattern === 'string') {
      if (pattern.includes('*')) return 'glob';
      if (pattern.includes('?')) return 'wildcard';
      return 'exact';
    }
    return 'unknown';
  }

  /**
   * Compile pattern for efficient matching
   * @private
   */
  _compilePattern(pattern) {
    if (pattern instanceof RegExp) {
      return pattern;
    }

    if (typeof pattern === 'string') {
      const type = this._getPatternType(pattern);
      
      switch (type) {
        case 'glob':
          return this._compileGlobPattern(pattern);
        case 'wildcard':
          return this._compileWildcardPattern(pattern);
        case 'exact':
          return pattern;
        default:
          return pattern;
      }
    }

    return pattern;
  }

  /**
   * Escape special regex characters except * and ?
   * @param {string} pattern - Pattern to escape
   * @returns {string} Escaped pattern
   * @private
   */
  _escapeRegexChars(pattern) {
    return pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Compile glob pattern to regex
   * @private
   */
  _compileGlobPattern(pattern) {
    return this._compilePatternToRegex(pattern);
  }

  /**
   * Compile wildcard pattern to regex
   * @private
   */
  _compileWildcardPattern(pattern) {
    return this._compilePatternToRegex(pattern);
  }

  /**
   * Shared logic to compile patterns (glob or wildcard) to regex
   * @private
   */
  _compilePatternToRegex(pattern) {
    // Handle edge case: single asterisk
    if (pattern === '*') {
      return /^.*$/;
    }
    
    // Handle edge case: single question mark
    if (pattern === '?') {
      return /^.$/;
    }
    
    // Escape special regex characters except * and ?
    const escaped = this._escapeRegexChars(pattern);
    
    // Convert patterns to regex
    const regex = escaped
      .replace(/\*/g, '.*')  // * matches any characters
      .replace(/\?/g, '.');  // ? matches a single character
    
    return new RegExp(`^${regex}$`);
  }

  /**
   * Check if event name matches pattern
   * @private
   */
  _isMatch(eventName, patternEntry) {
    const { type, pattern, compiledPattern } = patternEntry;

    switch (type) {
      case 'exact':
        return eventName === pattern;
      
      case 'glob':
      case 'wildcard':
      case 'regex':
        return compiledPattern.test(eventName);
      
      default:
        return false;
    }
  }

  /**
   * Generate unique ID for patterns
   * Browser-compatible UUID generation with fallback
   * @private
   */
  _generateId() {
    // Use crypto.randomUUID() if available (modern browsers/Node.js)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback for older browsers or environments without crypto.randomUUID
    // Use pattern_ prefix in fallback to distinguish from crypto-generated UUIDs
    return `pattern_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

export default PatternMatcher;
