# Debug Logger Documentation

## Overview

The `DebugLogger` is a file-based debugging tool designed specifically for situations where traditional browser console debugging is insufficient or inaccessible. It captures structured debug data and provides downloadable JSON logs for offline analysis.

## Purpose

This tool was created to solve the "inhumane" debugging problem where:
- Console spam makes debugging impossible to read
- Agent lacks direct browser console access
- Traditional debugging approaches fail with rapid-fire events
- Complex recursion issues need structured analysis

## Features

- **Structured Logging**: Timestamp, event type, and data payload for each entry
- **Session Management**: Start/stop tracking with duration calculations
- **File Export**: Downloadable JSON files for offline analysis
- **Persistence**: localStorage integration for session management
- **Summary Analysis**: Event counting, pause state changes, error collection

## Usage

### Basic Setup

```javascript
// The debug logger is automatically initialized in game.js
// Access it globally through:
window.gameDebugLogger
```

### Manual Control

```javascript
// Start debug session
window.gameDebugLogger.start()

// Log events (automatically done by integrated systems)
window.gameDebugLogger.log('CUSTOM_EVENT', { data: 'value' })

// Stop session and download logs
window.gameDebugLogger.stop()
window.gameDebugLogger.downloadLogs()

// Get session summary
const summary = window.gameDebugLogger.getSummary()
console.log(summary)
```

### Browser Console Commands

```javascript
// Download current session logs
window.gameDebugLogger.downloadLogs()

// Get summary of current session
window.gameDebugLogger.getSummary()

// Clear current session
window.gameDebugLogger.logs = []

// Save to localStorage
window.gameDebugLogger.saveToLocalStorage()
```

## Integrated Debug Events

The following events are automatically logged when they occur:

### Game Events
- `PAUSE_GAME_CALLED` - When game.pauseGame() is called
- `RESUME_GAME_CALLED` - When game.resumeGame() is called
- `GAME_STATE_CHANGE` - General game state changes

### Options Menu Events
- `OPTIONS_MENU_OPEN` - When options menu opens
- `OPTIONS_MENU_CLOSE` - When options menu closes

### Debug Data Structure

Each log entry contains:
```javascript
{
  timestamp: "2024-01-01T12:00:00.000Z",
  type: "EVENT_TYPE",
  data: {
    // Event-specific data
    paused: true,
    userPaused: true,
    gameOver: false,
    optionsOpen: false
  }
}
```

## Analysis Workflow

1. **Reproduce Issue**: Trigger the pause functionality bug
2. **Download Logs**: Use `window.gameDebugLogger.downloadLogs()`
3. **Analyze Data**: Open JSON file to examine event sequence
4. **Identify Problems**: Look for:
   - Rapid-fire duplicate events
   - Undefined state values
   - Incorrect event ordering
   - Missing state transitions

## Common Debug Patterns

### Recursion Detection
Look for multiple identical events with same timestamps:
```javascript
// BAD - Recursion detected
{ timestamp: "12:00:00.100", type: "OPTIONS_MENU_OPEN", data: {...} }
{ timestamp: "12:00:00.101", type: "OPTIONS_MENU_OPEN", data: {...} }
{ timestamp: "12:00:00.102", type: "OPTIONS_MENU_OPEN", data: {...} }
```

### State Validation
Check for undefined or inconsistent values:
```javascript
// BAD - userPaused should not be undefined
{ data: { paused: true, userPaused: undefined } }

// GOOD - Consistent state
{ data: { paused: true, userPaused: true } }
```

### Event Ordering
Verify logical event sequences:
```javascript
// GOOD - Proper pause sequence
1. OPTIONS_MENU_OPEN
2. PAUSE_GAME_CALLED
3. Game state: paused=true, userPaused=true

// BAD - Missing pause call
1. OPTIONS_MENU_OPEN
2. Game state: paused=false, userPaused=undefined
```

## File Structure

Downloaded logs are saved as:
- Filename: `debug-logs-YYYY-MM-DD-HH-mm-ss.json`
- Format: JSON array of log entries
- Size: Automatically managed (old entries removed)

## Integration Points

### Game.js Integration
```javascript
// Automatic initialization
constructor() {
  this.debugLogger = new DebugLogger()
  this.debugLogger.start()
  window.gameDebugLogger = this.debugLogger
}

// Automatic logging in pause/resume methods
pauseGame() {
  // ... pause logic
  if (this.debugLogger) {
    this.debugLogger.log('PAUSE_GAME_CALLED', {
      paused: this.paused,
      userPaused: this.userPaused,
      gameOver: this.gameOver,
      optionsOpen: this.options?.isOpen
    })
  }
}
```

### Options Menu Integration
```javascript
// Automatic logging in open/close methods
open() {
  if (window.gameDebugLogger) {
    window.gameDebugLogger.log('OPTIONS_MENU_OPEN', {
      wasGamePaused: this.game.paused,
      wasUserPaused: this.game.userPaused,
      isOpen: this.isOpen
    })
  }
}
```

## Troubleshooting

### TypeScript Errors
If you see TypeScript errors about `window.gameDebugLogger`, they can be safely ignored as this is a runtime debugging tool.

### Missing Logs
If logs aren't being captured:
1. Check that game has initialized properly
2. Verify `window.gameDebugLogger` exists in console
3. Ensure debug logger was started: `window.gameDebugLogger.sessionActive`

### Performance Impact
The debug logger is designed to be lightweight, but in production:
- Consider disabling in production builds
- Monitor file size if running long sessions
- Use `getSummary()` instead of downloading full logs for quick checks

## Agent Usage Notes

Since agents cannot access browser console directly:
1. Always request user to download logs using console commands
2. Ask user to share the JSON file contents
3. Analyze the structured data to identify issues
4. Use insights to make targeted code fixes
5. Verify fixes by requesting new debug sessions

This tool bridges the gap between agent debugging capabilities and browser-based development environments.
