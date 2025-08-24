#!/usr/bin/env node

/**
 * Focused Code Analyzer - Task #70 GitHub Copilot Review Monitoring
 *
 * Specifically monitors the issues flagged in GitHub Copilot PR #70 review:
 * - Forward reference closures in UI components
 * - Color logic order issues
 * - Performance optimization opportunities
 * - Architecture compliance in story UI components
 */

import { readFileSync, existsSync } from 'fs'
import { glob } from 'glob'
import path from 'path'

class FocusedCodeAnalyzer {
  constructor() {
    this.issues = []
    this.stats = {
      filesAnalyzed: 0,
      totalLines: 0,
      issuesFound: 0
    }

    // Focus on specific areas for analysis
    this.focusAreas = [
      'src/ui/StoryJournal.js',
      'src/ui/ChapterTransition.js',
      'src/ui/BossDialogue.js',
      'tools/**/*.js',
      'src/**/*.js' // New code patterns
    ]

    // Legacy files to ignore (planned for future migration)
    this.legacyFiles = [
      'src/game/game.js',
      'src/entities/player.js',
      'src/entities/enemies/enemy.js',
      'src/ui/UIManager.js',
      'src/utils/PatternMatcher.js'
    ]

    // Tool files to ignore (console.log is intentional)
    this.toolFiles = [
      'tools/code-analyzer.js',
      'tools/focused-analyzer.js',
      'tools/analyzer-config.json'
    ]

    this.patterns = {
      // GitHub Copilot Issue #1: Forward reference closures
      forwardReferenceClosure: {
        regex:
          /const\s+\w+\s*=\s*\(\)\s*=>\s*\{[^}]*(?:stateInterface|uiInterface|componentInterface|Interface\(\))[^}]*\}/g,
        severity: 'high',
        category: 'github-copilot-review',
        message: 'Potential forward reference closure (GitHub Copilot Issue)',
        suggestion: 'Pass interface dependencies as parameters to avoid forward references',
        applyTo: ['src/ui/StoryJournal.js', 'src/ui/ChapterTransition.js', 'src/ui/BossDialogue.js']
      },

      // GitHub Copilot Issue #2: Color logic order problems (should be resolved with colorUtils)
      colorLogicOrder: {
        regex:
          /(?:\.includes\(['"]rgba['"]\).*\.replace\(['"][)]['"]|\.replace\(['"][)]['"].*\.includes\(['"]rgba['"]\))/g,
        severity: 'medium',
        category: 'github-copilot-review',
        message: 'Color logic pattern detected - consider using applyAlphaToColor utility',
        suggestion:
          'Use applyAlphaToColor() from colorUtils.js instead of manual color manipulation',
        applyTo: ['src/ui/StoryJournal.js', 'src/ui/ChapterTransition.js', 'src/ui/BossDialogue.js']
      },

      // GitHub Copilot Issue #3: Performance - getTotalEnemiesKilled usage
      inefficientEnemyCount: {
        regex: /getTotalEnemiesKilled\(\)/g,
        severity: 'high',
        category: 'github-copilot-review',
        message: 'Using expensive calculation method (GitHub Copilot Performance Issue)',
        suggestion:
          'Use direct state.player.enemiesKilled property instead of getTotalEnemiesKilled()',
        applyTo: ['src/ui/StoryJournal.js', 'src/ui/ChapterTransition.js', 'src/ui/BossDialogue.js']
      },

      // GitHub Copilot Issue #4: POJO+Functional violations in story UI
      thisKeywordInStoryUI: {
        regex: /\bthis\./g,
        severity: 'high',
        category: 'github-copilot-review',
        message: 'Using "this" keyword in POJO+Functional component (GitHub Copilot Issue)',
        suggestion: 'Use closure variables and factory functions instead of "this"',
        applyTo: ['src/ui/StoryJournal.js', 'src/ui/ChapterTransition.js', 'src/ui/BossDialogue.js']
      },

      // GitHub Copilot Issue #5: Error handling patterns
      missingErrorHandling: {
        regex: /try\s*\{[^}]*\}\s*(?!catch)/g,
        severity: 'medium',
        category: 'github-copilot-review',
        message: 'Try block without catch (GitHub Copilot Error Handling Issue)',
        suggestion: 'Add catch block for proper error handling in UI components',
        applyTo: ['src/ui/StoryJournal.js', 'src/ui/ChapterTransition.js', 'src/ui/BossDialogue.js']
      },

      // New pattern: Check for usage of colorUtils
      colorUtilsUsage: {
        regex: /applyAlphaToColor/g,
        severity: 'info',
        category: 'improvement',
        message: 'Using shared color utility - good practice!',
        suggestion: 'Continue using colorUtils for consistent color handling'
      },

      // Secondary patterns - general code quality
      consoleLeftovers: {
        regex: /console\.(log|debug)(?!\s*\/\/)/g,
        severity: 'low',
        category: 'cleanup',
        message: 'Debug console statement',
        suggestion: 'Remove debug console.log or use proper logging'
      }
    }
  }

  shouldAnalyzeFile(filePath) {
    // Skip test files, node_modules, build output
    if (
      filePath.includes('test') ||
      filePath.includes('node_modules') ||
      filePath.includes('dist') ||
      filePath.includes('coverage')
    ) {
      return false
    }

    // Skip legacy files
    const relativePath = path.relative(process.cwd(), filePath)
    if (this.legacyFiles.some(legacy => relativePath.includes(legacy))) {
      return false
    }

    // Skip tool files (console.log is intentional)
    if (this.toolFiles.some(tool => relativePath.includes(tool))) {
      return false
    }

    return true
  }

  analyzeFile(filePath) {
    if (!existsSync(filePath) || !this.shouldAnalyzeFile(filePath)) return

    const content = readFileSync(filePath, 'utf8')
    const relativePath = path.relative(process.cwd(), filePath)

    this.stats.filesAnalyzed++
    this.stats.totalLines += content.split('\n').length

    this.checkPatterns(content, relativePath)
    this.checkSpecificIssues(content, relativePath)
  }

  checkPatterns(content, filePath) {
    const lines = content.split('\n')

    Object.entries(this.patterns).forEach(([patternName, patternConfig]) => {
      // Check if pattern applies to this file
      if (patternConfig.applyTo && !patternConfig.applyTo.some(file => filePath.includes(file))) {
        return
      }

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

  checkSpecificIssues(content, filePath) {
    // Check for missing error handling in UI components
    if (filePath.includes('src/ui/') && content.includes('try {') && !content.includes('catch')) {
      this.issues.push({
        type: 'error-handling',
        severity: 'medium',
        category: 'error-handling',
        file: filePath,
        message: 'Try block without catch in UI component',
        suggestion: 'Add catch block for error handling'
      })
    }

    // Check for proper factory pattern usage
    if (
      filePath.includes('src/ui/') &&
      content.includes('export') &&
      !content.includes('createStory')
    ) {
      const hasFactoryPattern = content.includes('create') && content.includes('function')
      if (!hasFactoryPattern) {
        this.issues.push({
          type: 'architecture',
          severity: 'low',
          category: 'architecture',
          file: filePath,
          message: 'UI component might benefit from factory pattern',
          suggestion: 'Consider using createComponentName() factory function'
        })
      }
    }
  }

  generateReport() {
    this.stats.issuesFound = this.issues.length

    console.log('\n🎯 TASK #70 - GITHUB COPILOT REVIEW MONITORING')
    console.log('Monitoring fixes for GitHub Copilot PR #70 review issues')
    console.log('='.repeat(60))
    console.log(`📊 Files Analyzed: ${this.stats.filesAnalyzed}`)
    console.log(`📏 Total Lines: ${this.stats.totalLines}`)
    console.log(`⚠️  Issues Found: ${this.stats.issuesFound}`)
    console.log('='.repeat(60))

    if (this.issues.length === 0) {
      console.log('✅ No GitHub Copilot review issues detected!')
      console.log('🎉 All Task #70 fixes are holding correctly!')
      console.log('\n💡 This analyzer monitors:')
      console.log('   ✅ Forward reference closures (Fixed)')
      console.log('   ✅ Color logic order issues (Fixed)')
      console.log('   ✅ Performance optimization - getTotalEnemiesKilled (Fixed)')
      console.log('   ✅ POJO+Functional compliance in story UI (Fixed)')
      console.log('   ✅ Error handling patterns (Fixed)')
      return
    }

    // Group by severity and category
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

    // GitHub Copilot specific issues highlight
    const gitHubCopilotIssues = this.issues.filter(i => i.category === 'github-copilot-review')
    if (gitHubCopilotIssues.length > 0) {
      console.log(`\n🤖 GITHUB COPILOT REVIEW REGRESSIONS: ${gitHubCopilotIssues.length} issues`)
      console.log('⚠️  Previously fixed issues have reappeared!')
    }

    // Detailed issues (limit to top 20 for readability)
    console.log('\n📋 TOP ISSUES:')
    console.log('-'.repeat(50))

    const sortedIssues = this.issues
      .sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      })
      .slice(0, 20) // Show only top 20 issues

    sortedIssues.forEach((issue, index) => {
      const icon = issue.severity === 'high' ? '🚨' : issue.severity === 'medium' ? '⚠️' : 'ℹ️'
      const categoryIcon = this.getCategoryIcon(issue.category)

      console.log(
        `\n${index + 1}. ${icon} ${issue.severity.toUpperCase()} - ${categoryIcon} ${issue.category}`
      )
      console.log(`   📄 ${issue.file}${issue.line ? ':' + issue.line : ''}`)
      console.log(`   💬 ${issue.message}`)
      if (issue.code && issue.code.length < 100) {
        console.log(`   📝 Code: ${issue.code}`)
      }
      console.log(`   💡 ${issue.suggestion}`)
    })

    if (this.issues.length > 20) {
      console.log(`\n... and ${this.issues.length - 20} more issues`)
    }

    console.log('\n' + '='.repeat(60))
    this.generateSuggestions()
  }

  getCategoryIcon(category) {
    const icons = {
      'github-copilot-review': '🤖',
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
    const gitHubCopilotIssues = this.issues.filter(
      i => i.category === 'github-copilot-review'
    ).length
    const highSeverityCount = this.issues.filter(i => i.severity === 'high').length

    console.log('🎯 TASK #70 MONITORING RESULTS:')

    if (gitHubCopilotIssues > 0) {
      console.log(`🚨 ALERT: ${gitHubCopilotIssues} GitHub Copilot review issues have reappeared!`)
      console.log('   These were previously fixed in Task #70 commits')
      console.log('   Please review the recent changes that may have introduced regressions')
    } else {
      console.log('✅ All GitHub Copilot review fixes from Task #70 are intact!')
    }

    if (highSeverityCount > 0) {
      console.log(`⚠️  ${highSeverityCount} high-severity issues detected`)
      console.log('    Review these issues to maintain Task #70 compliance')
    } else {
      console.log('✅ No high-severity issues in story UI components!')
    }

    console.log('\n💡 TASK #70 MONITORING WORKFLOW:')
    console.log('1. Run analyzer before making changes to story UI')
    console.log('2. Monitor for regressions of fixed GitHub Copilot issues')
    console.log('3. Use watch mode during story UI development')
    console.log('4. Pre-commit hook ensures Task #70 compliance')
    console.log('5. Focus on StoryJournal, ChapterTransition, BossDialogue components')
  }

  async run() {
    console.log('🤖 Starting Task #70 GitHub Copilot Review Monitoring...')
    console.log('Checking for regressions in previously fixed issues\n')

    try {
      // Focus specifically on the story UI components from Task #70
      const files = await glob([
        'src/ui/StoryJournal.js',
        'src/ui/ChapterTransition.js',
        'src/ui/BossDialogue.js',
        'src/ui/options.js',
        '!src/**/*.test.js',
        '!src/**/*.spec.js',
        '!tools/**'
      ])

      if (files.length === 0) {
        console.log('❌ No Task #70 target files found')
        return
      }

      console.log(`📁 Analyzing ${files.length} Task #70 story UI components...`)
      console.log('   Primary focus: StoryJournal, ChapterTransition, BossDialogue')
      console.log('   Monitoring: GitHub Copilot review issue regressions\n')

      files.forEach(file => this.analyzeFile(file))

      this.generateReport()

      // Stricter exit code for GitHub Copilot review monitoring
      const gitHubCopilotRegressions = this.issues.filter(
        i => i.category === 'github-copilot-review'
      ).length
      if (gitHubCopilotRegressions > 0) {
        console.log(
          `\n🚨 TASK #70 REGRESSION DETECTED: ${gitHubCopilotRegressions} GitHub Copilot issues reappeared`
        )
        console.log('Previously fixed issues have been reintroduced')
        process.exit(1)
      } else {
        console.log('\n✅ Task #70 monitoring passed - no regressions detected!')
        process.exit(0)
      }
    } catch (error) {
      console.error('❌ Task #70 monitoring failed with error:', error.message)
      process.exit(1)
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  new FocusedCodeAnalyzer().run()
}

export { FocusedCodeAnalyzer }
