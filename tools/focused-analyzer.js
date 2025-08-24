#!/usr/bin/env node

/**
 * Migration Focus Analyzer
 *
 * Identifies Phase 4 migration candidates and provides migration recommendations
 */

import { readFileSync } from 'fs'
import { glob } from 'glob'
import { MIGRATED_FILES, PRIORITY_KEYWORDS } from './migration-config.js'

console.log('🔍 Starting Migration Focus Analysis...')
console.log('Identifying Phase 4 migration candidates\n')

const files = await glob([
  'src/**/*.js',
  '!src/**/*.test.js',
  '!test/**/*.js',
  '!tests/**/*.js',
  '!tools/**/*.js'
])

let classCount = 0
let migratedCount = 0
const phase4Candidates = []

files.forEach(file => {
  try {
    const content = readFileSync(file, 'utf8')
    const classMatches = content.match(/class\s+(\w+)/g)

    if (classMatches) {
      classCount += classMatches.length

      const isMigrated = MIGRATED_FILES.some(migrated => file.includes(migrated))

      if (!isMigrated) {
        phase4Candidates.push({
          file,
          classes: classMatches,
          isSystem: /src\/(systems|ui|rendering|utils)/.test(file),
          priority: getPriority(file)
        })
      } else {
        migratedCount += classMatches.length
      }
    }
  } catch (error) {
    console.error(`Error analyzing ${file}:`, error.message)
  }
})

function getPriority(file) {
  if (PRIORITY_KEYWORDS.high.some(keyword => file.includes(keyword))) {
    return 'high'
  }

  if (PRIORITY_KEYWORDS.medium.some(keyword => file.includes(keyword))) {
    return 'medium'
  }

  return 'low'
}

console.log('📊 Migration Focus Analysis Report')
console.log('='.repeat(50))
console.log(`\n📈 Statistics:`)
console.log(`   Files Analyzed: ${files.length}`)
console.log(`   Total Classes Found: ${classCount}`)
console.log(`   Already Migrated: ${migratedCount} (Phase 3 ✅)`)
console.log(`   Phase 4 Candidates: ${phase4Candidates.length}`)

if (phase4Candidates.length > 0) {
  console.log('\n🎯 Phase 4 Migration Plan')
  console.log('='.repeat(50))

  const priorities = {
    high: phase4Candidates.filter(c => c.priority === 'high'),
    medium: phase4Candidates.filter(c => c.priority === 'medium'),
    low: phase4Candidates.filter(c => c.priority === 'low')
  }

  if (priorities.high.length > 0) {
    console.log('\n🚨 HIGH PRIORITY Phase 4 Targets:')
    priorities.high.forEach(candidate => {
      console.log(`   📁 ${candidate.file}`)
      candidate.classes.forEach(cls => {
        console.log(`     • ${cls} - System class migration candidate`)
      })
    })
  }

  if (priorities.medium.length > 0) {
    console.log('\n⚠️  MEDIUM PRIORITY Phase 4 Targets:')
    priorities.medium.forEach(candidate => {
      console.log(`   📁 ${candidate.file} - ${candidate.classes.length} classes`)
    })
  }

  if (priorities.low.length > 0) {
    console.log('\n💡 LOW PRIORITY Phase 4 Targets:')
    priorities.low.forEach(candidate => {
      console.log(`   📁 ${candidate.file} - ${candidate.classes.length} classes`)
    })
  }
} else {
  console.log('\n✅ No Phase 4 migration targets found!')
  console.log('   All systems appear to be migrated!')
}

console.log('\n🎯 Recommended Next Steps:')
console.log('1. Start with HIGH PRIORITY systems for Phase 4')
console.log('2. Focus on systems/ and ui/ directories')
console.log('3. Use existing factory patterns as templates')
console.log('4. Plan complex migrations carefully')
