/**
 * Legacy Compatibility Layer Removal Tool
 * Analyzes and removes unnecessary compatibility code
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export class CompatibilityAnalyzer {
    constructor() {
        this.patterns = {
            // Legacy compatibility patterns to remove
            legacyComments: [
                /\/\*\*?\s*.*backward compatibility.*\*\//gi,
                /\/\*\*?\s*.*legacy.*\*\//gi,
                /\/\/.*backward compatibility.*/gi,
                /\/\/.*legacy.*/gi
            ],
            legacyMethods: [
                /legacyUpdate\s*\([^)]*\)\s*{[^}]*}/gs,
                /\/\*\*[^*]*\*+(?:[^/*][^*]*\*+)*\/\s*legacyUpdate/gs
            ],
            globalReferences: [
                /window\.(\w+)\s*=/g,
                /if\s*\(\s*typeof\s+window\s*!==\s*['"]undefined['"][^}]*}/gs
            ],
            compatibilityChecks: [
                /if\s*\(\s*this\.eventDispatcher\s*\)/g,
                /if\s*\(\s*this\.stateManager\s*\)/g,
                /if\s*\(\s*typeof\s+\w+\s*!==\s*['"]undefined['"][^}]*}/gs
            ]
        };
        
        this.removals = [];
        this.warnings = [];
    }

    /**
     * Analyze a file for legacy compatibility code
     */
    analyzeFile(filePath) {
        const content = readFileSync(filePath, 'utf8');
        const analysis = {
            file: filePath,
            legacyComments: [],
            legacyMethods: [],
            globalReferences: [],
            compatibilityChecks: [],
            recommendations: []
        };

        // Find legacy comments
        this.patterns.legacyComments.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            matches.forEach(match => {
                analysis.legacyComments.push({
                    match: match[0],
                    index: match.index,
                    line: this.getLineNumber(content, match.index)
                });
            });
        });

        // Find legacy methods
        this.patterns.legacyMethods.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            matches.forEach(match => {
                analysis.legacyMethods.push({
                    match: match[0],
                    index: match.index,
                    line: this.getLineNumber(content, match.index)
                });
            });
        });

        // Find global references
        this.patterns.globalReferences.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            matches.forEach(match => {
                analysis.globalReferences.push({
                    variable: match[1],
                    match: match[0],
                    index: match.index,
                    line: this.getLineNumber(content, match.index)
                });
            });
        });

        // Find compatibility checks
        this.patterns.compatibilityChecks.forEach(pattern => {
            const matches = [...content.matchAll(pattern)];
            matches.forEach(match => {
                analysis.compatibilityChecks.push({
                    match: match[0],
                    index: match.index,
                    line: this.getLineNumber(content, match.index)
                });
            });
        });

        // Generate recommendations
        analysis.recommendations = this.generateRecommendations(analysis);

        return analysis;
    }

    /**
     * Remove legacy compatibility code from a file
     */
    removeCompatibilityCode(filePath) {
        let content = readFileSync(filePath, 'utf8');
        const original = content;
        let changes = 0;

        // Remove legacy comments
        this.patterns.legacyComments.forEach(pattern => {
            const newContent = content.replace(pattern, '');
            if (newContent !== content) {
                content = newContent;
                changes++;
            }
        });

        // Remove legacy methods
        this.patterns.legacyMethods.forEach(pattern => {
            const newContent = content.replace(pattern, '');
            if (newContent !== content) {
                content = newContent;
                changes++;
            }
        });

        // Remove unnecessary compatibility checks
        content = this.removeUnnecessaryChecks(content);

        // Clean up empty lines and formatting
        content = this.cleanupFormatting(content);

        if (content !== original) {
            writeFileSync(filePath, content, 'utf8');
            this.removals.push({
                file: filePath,
                changes,
                sizeBefore: original.length,
                sizeAfter: content.length,
                sizeReduction: original.length - content.length
            });
        }

        return { changes, content };
    }

    /**
     * Remove unnecessary compatibility checks
     */
    removeUnnecessaryChecks(content) {
        // Remove checks for eventDispatcher and stateManager since they're now required
        content = content.replace(
            /if\s*\(\s*this\.eventDispatcher\s*\)\s*{([^}]*)}/gs,
            '$1'
        );
        
        content = content.replace(
            /if\s*\(\s*this\.stateManager\s*\)\s*{([^}]*)}/gs,
            '$1'
        );

        // Remove window checks for modules that are now properly imported
        content = content.replace(
            /if\s*\(\s*typeof\s+window\s*!==\s*['"]undefined['"][^}]*window\.(\w+)[^}]*}/gs,
            ''
        );

        return content;
    }

    /**
     * Clean up formatting after removals
     */
    cleanupFormatting(content) {
        // Remove excessive empty lines
        content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
        
        // Remove trailing whitespace
        content = content.replace(/[ \t]+$/gm, '');
        
        // Ensure single newline at end of file
        content = content.replace(/\n*$/, '\n');
        
        return content;
    }

    /**
     * Generate recommendations for compatibility removal
     */
    generateRecommendations(analysis) {
        const recommendations = [];

        if (analysis.legacyComments.length > 0) {
            recommendations.push({
                type: 'cleanup',
                priority: 'low',
                message: `Remove ${analysis.legacyComments.length} legacy comments`,
                action: 'Remove outdated compatibility comments'
            });
        }

        if (analysis.legacyMethods.length > 0) {
            recommendations.push({
                type: 'refactor',
                priority: 'high',
                message: `Remove ${analysis.legacyMethods.length} legacy methods`,
                action: 'Remove legacyUpdate and other backward compatibility methods'
            });
        }

        if (analysis.globalReferences.length > 0) {
            recommendations.push({
                type: 'modernize',
                priority: 'medium',
                message: `Remove ${analysis.globalReferences.length} global references`,
                action: 'Replace global references with proper ES6 imports'
            });
        }

        if (analysis.compatibilityChecks.length > 0) {
            recommendations.push({
                type: 'simplify',
                priority: 'medium',
                message: `Remove ${analysis.compatibilityChecks.length} compatibility checks`,
                action: 'Remove unnecessary null checks for required dependencies'
            });
        }

        return recommendations;
    }

    /**
     * Get line number for a character index
     */
    getLineNumber(content, index) {
        return content.substring(0, index).split('\n').length;
    }

    /**
     * Analyze entire project for compatibility issues
     */
    analyzeProject(projectPath) {
        const results = {
            totalFiles: 0,
            filesWithIssues: 0,
            totalIssues: 0,
            files: [],
            summary: {
                legacyComments: 0,
                legacyMethods: 0,
                globalReferences: 0,
                compatibilityChecks: 0
            }
        };

        const analyzeDirectory = (dir) => {
            const items = readdirSync(dir);
            
            items.forEach(item => {
                const fullPath = join(dir, item);
                const stat = statSync(fullPath);
                
                if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                    analyzeDirectory(fullPath);
                } else if (stat.isFile() && item.endsWith('.js')) {
                    results.totalFiles++;
                    const analysis = this.analyzeFile(fullPath);
                    
                    const totalIssues = analysis.legacyComments.length +
                                       analysis.legacyMethods.length +
                                       analysis.globalReferences.length +
                                       analysis.compatibilityChecks.length;
                    
                    if (totalIssues > 0) {
                        results.filesWithIssues++;
                        results.totalIssues += totalIssues;
                        results.files.push(analysis);
                        
                        results.summary.legacyComments += analysis.legacyComments.length;
                        results.summary.legacyMethods += analysis.legacyMethods.length;
                        results.summary.globalReferences += analysis.globalReferences.length;
                        results.summary.compatibilityChecks += analysis.compatibilityChecks.length;
                    }
                }
            });
        };

        analyzeDirectory(projectPath);
        return results;
    }

    /**
     * Generate compatibility removal report
     */
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            removals: this.removals,
            warnings: this.warnings,
            summary: {
                filesProcessed: this.removals.length,
                totalChanges: this.removals.reduce((sum, r) => sum + r.changes, 0),
                totalSizeReduction: this.removals.reduce((sum, r) => sum + r.sizeReduction, 0),
                averageReduction: this.removals.length > 0 ? 
                    this.removals.reduce((sum, r) => sum + r.sizeReduction, 0) / this.removals.length : 0
            }
        };

        return report;
    }
}

// Export analyzer instance
export const compatibilityAnalyzer = new CompatibilityAnalyzer();
