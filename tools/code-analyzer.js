#!/usr/bin/env node

/**
 * POJO+Functional Architecture Analyzer
 *
 * General code analyzer for POJO+Functional architecture compliance
 * Detects ES6 class usage, architecture violations, and migration opportunities
 * Supports the ongoing migration from ES6 classes to factory functions
 */

import { readFileSync, existsSync } from 'fs'
import { glob } from 'glob'
import path from 'path'

class ArchitectureAnalyzer {
  constructor() {
    this.issues = []
    this.stats = {
      filesAnalyzed: 0,
      totalLines: 0,
      issuesFound: 0,
      migratedFiles: 0,
      legacyFiles: 0
    }

    // Files already migrated to POJO+Functional
    this.migratedFiles = [
      'src/entities/bullet.js',
      'src/entities/player.js',
      'src/entities/enemies/enemy.js',
      'src/game/game.js',
      'src/ui/StoryJournal.js',
      'src/ui/ChapterTransition.js',
      'src/ui/BossDialogue.js',
      'src/utils/colorUtils.js'
    ]

    // Tool files to ignore (console.log is intentional)
    this.toolFiles = ['tools/**/*.js', 'test/**/*.js', 'tests/**/*.js']

    this.patterns = {
      // Core POJO+Functional Architecture Violations
      classDeclarations: {
        regex: /class\s+(\w+).*{/g,
        severity: 'high',
        category: 'architecture',
        message: 'ES6 class detected - should use factory function pattern',
        suggestion: 'Replace with createComponentName() factory function'
      },

      thisKeywordUsage: {
        regex: /\bthis\./g,
        severity: 'high',
        category: 'architecture',
        message: 'Using "this" keyword - violates POJO+Functional pattern',
        suggestion: 'Use closure variables and factory functions instead'
      },

      constructorPatterns: {
        regex: /constructor\s*\([^)]*\)\s*{/g,
        severity: 'high',
        category: 'architecture',
        message: 'ES6 constructor detected - convert to factory function',
        suggestion: 'Replace constructor with initialization parameters in factory function'
      },

      newKeywordUsage: {
        regex: /new\s+[A-Z]\w*\(/g,
        severity: 'medium',
        category: 'architecture',
        message: 'Using "new" keyword - consider factory function',
        suggestion: 'Use createComponentName() factory function instead of "new"'
      },

      methodBinding: {
        regex: /\w+\.bind\(this\)/g,
        severity: 'high',
        category: 'architecture',
        message: 'Method binding with "this" - indicates class usage',
        suggestion: 'Use closure variables to eliminate need for binding'
      },

      // Factory Function Pattern Detection (Good Patterns)
      factoryFunctions: {
        regex: /function\s+create[A-Z]\w*\(/g,
        severity: 'good',
        category: 'architecture',
        message: 'Factory function detected - good POJO+Functional pattern',
        suggestion: 'Continue using factory function patterns'
      },

      // Common Migration Opportunities
      staticMethods: {
        regex: /static\s+\w+\s*\(/g,
        severity: 'medium',
        category: 'migration',
        message: 'Static method detected - can be extracted to pure function',
        suggestion: 'Move static methods to pure functions outside the class'
      },

      // Performance and Quality Patterns
      inefficientLoops: {
        regex: /for\s*\(\s*\w+\s+in\s+Object\.(keys|values|entries)/g,
        severity: 'medium',
        category: 'performance',
        message: 'Inefficient object iteration pattern',
        suggestion: 'Use for...of with Object.entries() directly'
      },

      directDOMAccess: {
        regex: /document\.(getElementById|querySelector|createElement)/g,
        severity: 'medium',
        category: 'architecture',
        message: 'Direct DOM access - consider canvas-based approach',
        suggestion: 'Use canvas rendering or encapsulated DOM access'
      },

      consoleStatements: {
        regex: /console\.(log|debug|warn)(?!\s*\/\/)/g,
        severity: 'low',
        category: 'cleanup',
        message: 'Console statement in code',
        suggestion: 'Remove debug statements or use proper logging'
      },

      // Error Handling
      uncaughtPromises: {
        regex: /\.then\([^)]*\)(?!\s*\.catch)/g,
        severity: 'high',
        category: 'error-handling',
        message: 'Promise without error handling',
        suggestion: 'Add .catch() handler for promise rejection'
      }
    }
  }

  isToolFile(filePath) {
    return this.toolFiles.some(pattern => {
      const globPattern = pattern.replace(/\*\*/g, '*')
      return filePath.includes(globPattern.replace('*', ''))
    })
  }

  isMigratedFile(filePath) {
    return this.migratedFiles.some(migrated => filePath.includes(migrated))
  }

  analyzeFile(filePath) {
    if (this.isToolFile(filePath)) {
      return // Skip tool files
    }

    try {
      const content = readFileSync(filePath, 'utf8')
      const lines = content.split('\n')

      this.stats.filesAnalyzed++
      this.stats.totalLines += lines.length

      // Track migration status
      if (this.isMigratedFile(filePath)) {
        this.stats.migratedFiles++
      } else {
        this.stats.legacyFiles++
      }

      Object.entries(this.patterns).forEach(([patternName, pattern]) => {
        const matches = content.match(pattern.regex) || []

        matches.forEach(match => {
          const lineIndex = content.substring(0, content.indexOf(match)).split('\n').length

          this.issues.push({
            file: filePath,
            line: lineIndex,
            pattern: patternName,
            severity: pattern.severity,
            category: pattern.category,
            message: pattern.message,
            suggestion: pattern.suggestion,
            code: match,
            migrated: this.isMigratedFile(filePath)
          })
        })
      })
    } catch (error) {
      console.error(`Error analyzing ${filePath}:`, error.message)
    }
  }

  generateReport() {
    // Filter out issues from migrated files (for legacy wrapper compatibility)
    const activeIssues = this.issues.filter(issue => !issue.migrated || issue.severity === 'high')

    this.stats.issuesFound = activeIssues.length

    console.log('\n📊 POJO+Functional Architecture Analysis Report')
    console.log('='.repeat(60))

    // Migration Progress
    console.log('\n🚀 Migration Progress:')
    console.log(`   Migrated Files: ${this.stats.migratedFiles}`)
    console.log(`   Legacy Files: ${this.stats.legacyFiles}`)
    const migrationPercent = Math.round(
      (this.stats.migratedFiles / (this.stats.migratedFiles + this.stats.legacyFiles)) * 100
    )
    console.log(`   Progress: ${migrationPercent}% migrated to POJO+Functional`)

    // Overall Stats
    console.log('\n📈 Analysis Statistics:')
    console.log(`   Files Analyzed: ${this.stats.filesAnalyzed}`)
    console.log(`   Total Lines: ${this.stats.totalLines}`)
    console.log(`   Issues Found: ${this.stats.issuesFound}`)

    if (activeIssues.length === 0) {
      console.log('\n✅ No architecture violations found!')
      console.log('   All analyzed code follows POJO+Functional patterns')
      return
    }

    // Group issues by severity and category
    const severityGroups = {
      high: activeIssues.filter(issue => issue.severity === 'high'),
      medium: activeIssues.filter(issue => issue.severity === 'medium'),
      low: activeIssues.filter(issue => issue.severity === 'low'),
      good: activeIssues.filter(issue => issue.severity === 'good')
    }

    // High priority issues
    if (severityGroups.high.length > 0) {
      console.log('\n🚨 High Priority Architecture Issues:')
      severityGroups.high.forEach(issue => {
        console.log(`   ${issue.file}:${issue.line}`)
        console.log(`     Issue: ${issue.message}`)
        console.log(`     Fix: ${issue.suggestion}`)
        console.log(`     Code: ${issue.code.trim()}`)
        console.log('')
      })
    }

    // Medium priority issues
    if (severityGroups.medium.length > 0) {
      console.log('\n⚠️  Medium Priority Issues:')
      severityGroups.medium.forEach(issue => {
        console.log(`   ${issue.file}:${issue.line} - ${issue.message}`)
      })
    }

    // Good patterns found
    if (severityGroups.good.length > 0) {
      console.log('\n✅ Good POJO+Functional Patterns Found:')
      severityGroups.good.forEach(issue => {
        console.log(`   ${issue.file}:${issue.line} - ${issue.message}`)
      })
    }

    // Migration recommendations
    console.log('\n🔧 Next Steps:')
    console.log('1. Fix high-severity architecture violations first')
    console.log('2. Focus migration efforts on files with most violations')
    console.log('3. Use factory function patterns for new code')
    console.log('4. Consider Phase 4 migration for remaining systems')
  }

  async run() {
    console.log('🏗️  Starting POJO+Functional Architecture Analysis...')
    console.log('Analyzing codebase for migration opportunities\n')

    const patterns = [
      'src/**/*.js',
      '!src/**/*.test.js',
      '!test/**/*.js',
      '!tests/**/*.js',
      '!tools/**/*.js'
    ]

    try {
      const files = await glob(patterns)

      if (files.length === 0) {
        console.log('No JavaScript files found to analyze')
        return
      }

      files.forEach(file => this.analyzeFile(file))
      this.generateReport()
    } catch (error) {
      console.error('Analysis failed:', error.message)
      process.exit(1)
    }
  }
}

// Run the analyzer if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const analyzer = new ArchitectureAnalyzer()
  analyzer.run()
}

export { ArchitectureAnalyzer }
