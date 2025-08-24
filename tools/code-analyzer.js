#!/usr/bin/env node

/**
 * Custom Code Analysis for Transformer Scroll Shooter
 *
 * Performs local static analysis to catch patterns before GitHub PR review
 * Focuses on POJO + Functional architecture compliance and code quality
 */

import { readFileSync, existsSync } from 'fs'
import { glob } from 'glob'
import path from 'path'

class CodeAnalyzer {
  constructor() {
    this.issues = []
    this.stats = {
      filesAnalyzed: 0,
      totalLines: 0,
      issuesFound: 0
    }

    this.patterns = {
      // POJO + Functional violations
      thisKeywords: {
        regex: /\bthis\./g,
        severity: 'high',
        category: 'architecture',
        message: 'Using "this" keyword - violates POJO + Functional pattern',
        suggestion: 'Convert to factory function with closures instead of class'
      },

      classConstructors: {
        regex: /class\s+\w+.*{/g,
        severity: 'high',
        category: 'architecture',
        message: 'ES6 class usage - should use factory pattern',
        suggestion: 'Replace with createComponentName() factory function'
      },

      // Performance issues
      inefficientLoops: {
        regex: /for.*in.*Object\.(keys|values|entries)/g,
        severity: 'medium',
        category: 'performance',
        message: 'Inefficient object iteration pattern',
        suggestion: 'Use for...of with Object.entries() directly'
      },

      repeatedCalculations: {
        regex: /\w+\(\)\s*[+\-*/]/g,
        severity: 'medium',
        category: 'performance',
        message: 'Potential repeated function call in calculation',
        suggestion: 'Cache function result in variable'
      },

      getTotalCalls: {
        regex: /getTotalEnemiesKilled\(\)/g,
        severity: 'medium',
        category: 'performance',
        message: 'Using expensive calculation method',
        suggestion: 'Use direct enemiesKilled property instead'
      },

      // Security concerns
      directDOMAccess: {
        regex: /document\.(getElementById|querySelector)/g,
        severity: 'medium',
        category: 'security',
        message: 'Direct DOM access - potential XSS risk',
        suggestion: 'Use canvas-based rendering or validated DOM access'
      },

      consoleLeftovers: {
        regex: /console\.(log|debug)(?!\s*\/\/)/g,
        severity: 'low',
        category: 'cleanup',
        message: 'Debug console statement left in code',
        suggestion: 'Remove debug console.log or use proper logging'
      },

      // Architecture smells
      circularDeps: {
        regex: /import.*from.*\.\./g,
        severity: 'medium',
        category: 'architecture',
        message: 'Relative import - potential circular dependency',
        suggestion: 'Use absolute imports or restructure dependencies'
      },

      magicNumbers: {
        regex: /\b(?<!\/\/.*)\d{3,}\b(?![px%ms])/g,
        severity: 'low',
        category: 'maintainability',
        message: 'Magic number - should be named constant',
        suggestion: 'Extract to named constant in constants file'
      },

      // Error handling
      bareThrows: {
        regex: /throw\s+new\s+Error\s*\(/g,
        severity: 'medium',
        category: 'error-handling',
        message: 'Generic Error throw - should be specific',
        suggestion: 'Use specific error types or custom error classes'
      },

      uncaughtPromises: {
        regex: /\.then\(.*\)(?!\s*\.catch)/g,
        severity: 'high',
        category: 'error-handling',
        message: 'Promise without error handling',
        suggestion: 'Add .catch() handler for promise rejection'
      }
    }

    // Architecture-specific rules for different directories
    this.architectureRules = {
      'src/ui/': {
        name: 'UI Components POJO+Functional',
        rules: [
          {
            pattern: /class\s+\w+/,
            message: 'UI component should use factory pattern, not ES6 class',
            severity: 'high'
          },
          {
            pattern: /\bthis\./,
            message: 'UI component should use closures, not "this" keyword',
            severity: 'high'
          }
        ]
      },
      'src/entities/': {
        name: 'Entity Architecture',
        rules: [
          {
            pattern: /new\s+\w+\(/,
            message: 'Consider using factory pattern for entities',
            severity: 'medium'
          }
        ]
      },
      'src/systems/': {
        name: 'System Architecture',
        rules: [
          {
            pattern: /setTimeout|setInterval/,
            message: 'Use requestAnimationFrame or event-driven patterns',
            severity: 'medium'
          }
        ]
      }
    }
  }

  analyzeFile(filePath) {
    if (!existsSync(filePath)) return

    const content = readFileSync(filePath, 'utf8')
    const relativePath = path.relative(process.cwd(), filePath)

    // Skip test files, node_modules, and build output
    if (
      relativePath.includes('test') ||
      relativePath.includes('node_modules') ||
      relativePath.includes('dist') ||
      relativePath.includes('coverage')
    ) {
      return
    }

    this.stats.filesAnalyzed++
    this.stats.totalLines += content.split('\n').length

    this.checkPatterns(content, relativePath)
    this.checkArchitecturalRules(content, relativePath)
    this.checkSpecificIssues(content, relativePath)
  }

  checkPatterns(content, filePath) {
    const lines = content.split('\n')

    Object.entries(this.patterns).forEach(([patternName, patternConfig]) => {
      lines.forEach((line, index) => {
        const matches = line.match(patternConfig.regex)
        if (matches) {
          matches.forEach(match => {
            this.issues.push({
              type: 'pattern',
              severity: patternConfig.severity,
              category: patternConfig.category,
              file: filePath,
              line: index + 1,
              pattern: patternName,
              code: line.trim(),
              match: match,
              message: patternConfig.message,
              suggestion: patternConfig.suggestion
            })
          })
        }
      })
    })
  }

  checkArchitecturalRules(content, filePath) {
    Object.entries(this.architectureRules).forEach(([directory, ruleSet]) => {
      if (filePath.includes(directory)) {
        ruleSet.rules.forEach(rule => {
          if (content.match(rule.pattern)) {
            this.issues.push({
              type: 'architecture',
              severity: rule.severity,
              category: 'architecture',
              file: filePath,
              rule: ruleSet.name,
              message: rule.message,
              suggestion: 'Follow POJO + Functional architecture patterns'
            })
          }
        })
      }
    })
  }

  checkSpecificIssues(content, filePath) {
    // Check for proper error boundaries
    if (content.includes('try {') && !content.includes('finally {')) {
      this.issues.push({
        type: 'error-handling',
        severity: 'medium',
        category: 'error-handling',
        file: filePath,
        message: 'Try-catch should consider cleanup in finally block',
        suggestion: 'Add finally block for resource cleanup'
      })
    }

    // Check for missing JSDoc on exported functions
    const exportedFunctions = content.match(/export\s+(function|const\s+\w+\s*=)/g)
    const jsdocBlocks = content.match(/\/\*\*[\s\S]*?\*\//g) || []

    if (exportedFunctions && exportedFunctions.length > jsdocBlocks.length) {
      this.issues.push({
        type: 'documentation',
        severity: 'low',
        category: 'maintainability',
        file: filePath,
        message: 'Missing JSDoc documentation on exported functions',
        suggestion: 'Add JSDoc comments for better code documentation'
      })
    }

    // Check for POJO+Functional compliance in UI components
    if (filePath.includes('src/ui/') && !filePath.includes('.test.js')) {
      if (content.includes('class ') && !content.includes('// Legacy class')) {
        this.issues.push({
          type: 'architecture',
          severity: 'high',
          category: 'architecture',
          file: filePath,
          message: 'UI component should use factory pattern, not ES6 classes',
          suggestion: 'Convert to createComponentName() factory function'
        })
      }
    }
  }

  generateReport() {
    this.stats.issuesFound = this.issues.length

    const grouped = this.issues.reduce((acc, issue) => {
      const key = `${issue.severity}`
      acc[key] = acc[key] || []
      acc[key].push(issue)
      return acc
    }, {})

    const categoryGroups = this.issues.reduce((acc, issue) => {
      const key = issue.category || 'other'
      acc[key] = acc[key] || []
      acc[key].push(issue)
      return acc
    }, {})

    console.log('\n🔍 LOCAL CODE ANALYSIS REPORT')
    console.log('='.repeat(50))
    console.log(`📊 Files Analyzed: ${this.stats.filesAnalyzed}`)
    console.log(`📏 Total Lines: ${this.stats.totalLines}`)
    console.log(`⚠️  Issues Found: ${this.stats.issuesFound}`)
    console.log('='.repeat(50))

    if (this.issues.length === 0) {
      console.log('✅ No issues found! Code quality looks good.')
      return
    }

    // Summary by severity
    console.log('\n📈 ISSUE SUMMARY:')
    Object.entries(grouped).forEach(([severity, issues]) => {
      const icon = severity === 'high' ? '🚨' : severity === 'medium' ? '⚠️' : 'ℹ️'
      console.log(`${icon} ${severity.toUpperCase()}: ${issues.length} issues`)
    })

    // Summary by category
    console.log('\n🏷️  BY CATEGORY:')
    Object.entries(categoryGroups).forEach(([category, issues]) => {
      const icon = this.getCategoryIcon(category)
      console.log(`${icon} ${category}: ${issues.length} issues`)
    })

    // Detailed issues
    console.log('\n📋 DETAILED ISSUES:')
    console.log('-'.repeat(50))

    // Sort by severity (high -> medium -> low)
    const severityOrder = { high: 0, medium: 1, low: 2 }
    const sortedIssues = this.issues.sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
    )

    sortedIssues.forEach((issue, index) => {
      const icon = issue.severity === 'high' ? '🚨' : issue.severity === 'medium' ? '⚠️' : 'ℹ️'
      const categoryIcon = this.getCategoryIcon(issue.category)

      console.log(
        `\n${index + 1}. ${icon} ${issue.severity.toUpperCase()} - ${categoryIcon} ${issue.category}`
      )
      console.log(`   📄 ${issue.file}${issue.line ? ':' + issue.line : ''}`)
      console.log(`   � ${issue.message}`)
      if (issue.code) {
        console.log(`   📝 Code: ${issue.code}`)
      }

      if (issue.match) {
        console.log(`   🎯 Match: ${issue.match}`)
      }
      console.log(`   💡 ${issue.suggestion}`)
    })

    console.log('\n' + '='.repeat(50))
    this.generateSuggestions()
  }

  getCategoryIcon(category) {
    const icons = {
      architecture: '🏗️',
      performance: '⚡',
      security: '🔒',
      'error-handling': '🛡️',
      maintainability: '🔧',
      cleanup: '🧹',
      documentation: '📚'
    }
    return icons[category] || '❓'
  }

  generateSuggestions() {
    const highSeverityCount = this.issues.filter(i => i.severity === 'high').length
    const architectureIssues = this.issues.filter(i => i.category === 'architecture').length

    console.log('🎯 RECOMMENDATIONS:')

    if (highSeverityCount > 0) {
      console.log(`⚠️  Address ${highSeverityCount} high-severity issues first`)
    }

    if (architectureIssues > 0) {
      console.log(
        `🏗️  ${architectureIssues} architecture issues found - consider POJO+Functional migration`
      )
    }

    const performanceIssues = this.issues.filter(i => i.category === 'performance').length
    if (performanceIssues > 0) {
      console.log(`⚡ ${performanceIssues} performance optimizations available`)
    }

    console.log('\n💡 NEXT STEPS:')
    console.log('1. Fix high-severity issues first')
    console.log('2. Run `npm run analyze:watch` for continuous monitoring')
    console.log('3. Consider setting up pre-commit hooks for automatic checks')
    console.log('4. Use GitHub Copilot reviews for complex architectural decisions')
  }

  async run() {
    console.log('🔍 Starting Custom Code Analysis...')
    console.log('Focusing on POJO + Functional Architecture Compliance\n')

    try {
      const files = await glob(['src/**/*.js', '!src/**/*.test.js', '!src/**/*.spec.js'])

      if (files.length === 0) {
        console.log('❌ No JavaScript files found to analyze')
        return
      }

      console.log(`📁 Found ${files.length} files to analyze...`)

      files.forEach(file => this.analyzeFile(file))

      this.generateReport()

      // Exit code for CI integration
      const criticalIssues = this.issues.filter(i => i.severity === 'high').length
      if (criticalIssues > 0) {
        console.log(`\n❌ Analysis failed: ${criticalIssues} high-severity issues found`)
        process.exit(1)
      } else {
        console.log('\n✅ Analysis passed: No critical issues found')
        process.exit(0)
      }
    } catch (error) {
      console.error('❌ Analysis failed with error:', error.message)
      process.exit(1)
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  new CodeAnalyzer().run()
}

export { CodeAnalyzer }
