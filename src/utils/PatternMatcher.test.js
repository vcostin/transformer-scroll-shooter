import { describe, it, expect, beforeEach } from 'vitest';
import PatternMatcher from '@/utils/PatternMatcher.js';

describe('PatternMatcher', () => {
  let patternMatcher;

  beforeEach(() => {
    patternMatcher = new PatternMatcher();
  });

  describe('constructor', () => {
    it('should initialize with empty patterns', () => {
      expect(patternMatcher.patterns.size).toBe(0);
    });
  });

  describe('register()', () => {
    it('should register a simple string pattern', () => {
      const handler = () => {};
      const id = patternMatcher.register('test', handler);
      
      expect(patternMatcher.patterns.size).toBe(1);
      expect(id).toBeTruthy();
      const pattern = patternMatcher.patterns.get(id);
      expect(pattern.pattern).toBe('test');
      expect(pattern.handler).toBe(handler);
      expect(pattern.type).toBe('exact');
    });

    it('should register a glob pattern', () => {
      const handler = () => {};
      const id = patternMatcher.register('user:*', handler);
      
      expect(patternMatcher.patterns.size).toBe(1);
      const pattern = patternMatcher.patterns.get(id);
      expect(pattern.pattern).toBe('user:*');
      expect(pattern.handler).toBe(handler);
      expect(pattern.type).toBe('glob');
      expect(pattern.compiledPattern).toBeInstanceOf(RegExp);
    });

    it('should register a wildcard pattern', () => {
      const handler = () => {};
      const id = patternMatcher.register('user:?', handler);
      
      expect(patternMatcher.patterns.size).toBe(1);
      const pattern = patternMatcher.patterns.get(id);
      expect(pattern.pattern).toBe('user:?');
      expect(pattern.handler).toBe(handler);
      expect(pattern.type).toBe('wildcard');
      expect(pattern.compiledPattern).toBeInstanceOf(RegExp);
    });

    it('should register a regex pattern', () => {
      const handler = () => {};
      const regex = /^test:.+$/;
      const id = patternMatcher.register(regex, handler);
      
      expect(patternMatcher.patterns.size).toBe(1);
      const pattern = patternMatcher.patterns.get(id);
      expect(pattern.pattern).toBe(regex);
      expect(pattern.handler).toBe(handler);
      expect(pattern.type).toBe('regex');
    });

    it('should register multiple patterns', () => {
      const handler1 = () => {};
      const handler2 = () => {};
      
      patternMatcher.register('test1', handler1);
      patternMatcher.register('test2', handler2);
      
      expect(patternMatcher.patterns.size).toBe(2);
    });

    it('should register with priority', () => {
      const handler = () => {};
      const id = patternMatcher.register('test', handler, { priority: 10 });
      
      const pattern = patternMatcher.patterns.get(id);
      expect(pattern.priority).toBe(10);
    });

    it('should register with once option', () => {
      const handler = () => {};
      const id = patternMatcher.register('test', handler, { once: true });
      
      const pattern = patternMatcher.patterns.get(id);
      expect(pattern.once).toBe(true);
    });
  });

  describe('unregister()', () => {
    it('should unregister a pattern by ID', () => {
      const handler = () => {};
      const id = patternMatcher.register('test', handler);
      
      expect(patternMatcher.patterns.size).toBe(1);
      
      const result = patternMatcher.unregister(id);
      expect(result).toBe(true);
      expect(patternMatcher.patterns.size).toBe(0);
    });

    it('should return false for non-existent pattern', () => {
      const result = patternMatcher.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getMatches()', () => {
    beforeEach(() => {
      patternMatcher.register('exact', () => 'exact');
      patternMatcher.register('user:*', () => 'glob');
      patternMatcher.register('test:?', () => 'wildcard');
      patternMatcher.register(/^regex:.+$/, () => 'regex');
    });

    it('should match exact string patterns', () => {
      const matches = patternMatcher.getMatches('exact');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].handler()).toBe('exact');
    });

    it('should match glob patterns with *', () => {
      const matches = patternMatcher.getMatches('user:login');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].handler()).toBe('glob');
    });

    it('should match glob patterns with multiple segments', () => {
      const matches = patternMatcher.getMatches('user:login:success');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].handler()).toBe('glob');
    });

    it('should match wildcard patterns with ?', () => {
      const matches = patternMatcher.getMatches('test:1');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].handler()).toBe('wildcard');
    });

    it('should not match wildcard patterns with multiple characters', () => {
      const matches = patternMatcher.getMatches('test:multiple');
      
      expect(matches).toHaveLength(0);
    });

    it('should match regex patterns', () => {
      const matches = patternMatcher.getMatches('regex:test');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].handler()).toBe('regex');
    });

    it('should return empty array for no matches', () => {
      const matches = patternMatcher.getMatches('nomatch');
      
      expect(matches).toHaveLength(0);
    });

    it('should return multiple matches for overlapping patterns', () => {
      // Add another pattern that matches the same input
      patternMatcher.register('user:login', () => 'exact-user-login');
      
      const matches = patternMatcher.getMatches('user:login');
      
      expect(matches).toHaveLength(2);
      expect(matches.map(m => m.handler())).toContain('glob');
      expect(matches.map(m => m.handler())).toContain('exact-user-login');
    });

    it('should handle empty string input', () => {
      const matches = patternMatcher.getMatches('');
      
      expect(matches).toHaveLength(0);
    });

    it('should handle special characters in input', () => {
      patternMatcher.register('special:*', () => 'special');
      
      const matches = patternMatcher.getMatches('special:test.with-special_chars');
      
      expect(matches).toHaveLength(1);
      expect(matches[0].handler()).toBe('special');
    });

    it('should sort matches by priority', () => {
      patternMatcher.clear();
      patternMatcher.register('user:*', () => 'low', { priority: 1 });
      patternMatcher.register('user:*', () => 'high', { priority: 10 });
      patternMatcher.register('user:*', () => 'medium', { priority: 5 });
      
      const matches = patternMatcher.getMatches('user:login');
      
      expect(matches).toHaveLength(3);
      expect(matches[0].handler()).toBe('high');
      expect(matches[1].handler()).toBe('medium');
      expect(matches[2].handler()).toBe('low');
    });
  });

  describe('removeOncePatterns()', () => {
    it('should remove patterns marked as once', () => {
      const id1 = patternMatcher.register('test1', () => {}, { once: true });
      const id2 = patternMatcher.register('test2', () => {}, { once: false });
      
      expect(patternMatcher.patterns.size).toBe(2);
      
      patternMatcher.removeOncePatterns([id1, id2]);
      
      expect(patternMatcher.patterns.size).toBe(1);
      expect(patternMatcher.patterns.has(id1)).toBe(false);
      expect(patternMatcher.patterns.has(id2)).toBe(true);
    });
  });

  describe('getStats()', () => {
    it('should return statistics about patterns', () => {
      patternMatcher.register('exact', () => {});
      patternMatcher.register('user:*', () => {});
      patternMatcher.register('test:?', () => {});
      patternMatcher.register(/regex/, () => {});
      
      const stats = patternMatcher.getStats();
      
      expect(stats.totalPatterns).toBe(4);
      expect(stats.byType.exact).toBe(1);
      expect(stats.byType.glob).toBe(1);
      expect(stats.byType.wildcard).toBe(1);
      expect(stats.byType.regex).toBe(1);
    });
  });

  describe('clear()', () => {
    it('should clear all patterns', () => {
      patternMatcher.register('test1', () => {});
      patternMatcher.register('test2', () => {});
      
      expect(patternMatcher.patterns.size).toBe(2);
      
      patternMatcher.clear();
      
      expect(patternMatcher.patterns.size).toBe(0);
    });
  });

  describe('_getPatternType()', () => {
    it('should detect exact type for plain strings', () => {
      expect(patternMatcher._getPatternType('plain')).toBe('exact');
    });

    it('should detect glob type for patterns with *', () => {
      expect(patternMatcher._getPatternType('user:*')).toBe('glob');
      expect(patternMatcher._getPatternType('*:action')).toBe('glob');
      expect(patternMatcher._getPatternType('prefix:*:suffix')).toBe('glob');
    });

    it('should detect wildcard type for patterns with ?', () => {
      expect(patternMatcher._getPatternType('user:?')).toBe('wildcard');
      expect(patternMatcher._getPatternType('?:action')).toBe('wildcard');
      expect(patternMatcher._getPatternType('prefix:?:suffix')).toBe('wildcard');
    });

    it('should detect regex type for RegExp objects', () => {
      expect(patternMatcher._getPatternType(/test/)).toBe('regex');
    });

    it('should prioritize glob over wildcard when both are present', () => {
      expect(patternMatcher._getPatternType('user:*:?')).toBe('glob');
    });
  });

  describe('_compilePattern()', () => {
    it('should compile glob patterns correctly', () => {
      const regex = patternMatcher._compilePattern('user:*');
      
      expect(regex.test('user:login')).toBe(true);
      expect(regex.test('user:logout')).toBe(true);
      expect(regex.test('user:login:success')).toBe(true);
      expect(regex.test('admin:login')).toBe(false);
    });

    it('should compile wildcard patterns correctly', () => {
      const regex = patternMatcher._compilePattern('user:?');
      
      expect(regex.test('user:1')).toBe(true);
      expect(regex.test('user:a')).toBe(true);
      expect(regex.test('user:login')).toBe(false);
      expect(regex.test('user:')).toBe(false);
    });

    it('should escape special regex characters', () => {
      const regex = patternMatcher._compilePattern('user:*');
      
      expect(regex.test('user:test.with-special_chars')).toBe(true);
      expect(regex.test('user:test(with)brackets')).toBe(true);
    });

    it('should handle multiple wildcards', () => {
      const regex = patternMatcher._compilePattern('user:*:*');
      
      expect(regex.test('user:login:success')).toBe(true);
      expect(regex.test('user:logout:error')).toBe(true);
      expect(regex.test('user:single')).toBe(false);
    });

    it('should handle single wildcard correctly', () => {
      const globRegex = patternMatcher._compilePattern('*');
      const wildcardRegex = patternMatcher._compilePattern('?');
      
      expect(globRegex.test('anything')).toBe(true);
      expect(wildcardRegex.test('a')).toBe(true);
      expect(wildcardRegex.test('ab')).toBe(false);
    });

    it('should return regex as-is for regex patterns', () => {
      const regex = /test/;
      const result = patternMatcher._compilePattern(regex);
      
      expect(result).toBe(regex);
    });

    it('should return string as-is for exact patterns', () => {
      const result = patternMatcher._compilePattern('exact');
      
      expect(result).toBe('exact');
    });
  });

  describe('performance optimization', () => {
    it('should handle large number of patterns efficiently', () => {
      const start = Date.now();
      
      // Register many patterns
      for (let i = 0; i < 1000; i++) {
        patternMatcher.register(`pattern:${i}:*`, () => i);
      }
      
      // Test matching performance
      const matches = patternMatcher.getMatches('pattern:500:test');
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(matches).toHaveLength(1);
    });
  });
});
