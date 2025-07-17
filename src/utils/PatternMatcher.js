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
   * Compile glob pattern to regex
   * @private
   */
  _compileGlobPattern(pattern) {
    // Handle edge case: single asterisk
    if (pattern === '*') {
      return /^.*$/;
    }
    
    // Handle edge case: single question mark
    if (pattern === '?') {
      return /^.$/;
    }
    
    // Escape special regex characters except * and ?
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    
    // Convert glob patterns to regex
    const regex = escaped
      .replace(/\*/g, '.*')  // * matches any characters (don't escape first)
      .replace(/\?/g, '.');  // ? matches single character (don't escape first)
    
    return new RegExp(`^${regex}$`);
  }

  /**
   * Compile wildcard pattern to regex
   * @private
   */
  _compileWildcardPattern(pattern) {
    // Similar to glob but with different semantics if needed
    return this._compileGlobPattern(pattern);
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
   * @private
   */
  _generateId() {
    return `pattern_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

export default PatternMatcher;
