# Debug Logger Usage Instructions

## Immediate Testing Steps

The debug logger is now integrated into the game. Here's how to use it to capture the pause functionality bug:

### 1. Open Browser Console
- Press F12 or right-click → Inspect → Console tab
- The game should auto-start the debug logger

### 2. Verify Debug Logger is Active
```javascript
// Check if debug logger exists
window.gameDebugLogger

// Check if session is active
window.gameDebugLogger.sessionActive
```

### 3. Reproduce the Pause Bug
1. **Press 'P' key** - This should work (pause/resume)
2. **Press 'ESC' key** - This opens options menu (should pause but may not work properly)
3. **Close options menu** - This should resume (may not work)

### 4. Download Debug Logs
```javascript
// Download the captured debug data
window.gameDebugLogger.downloadLogs()
```

### 5. Get Quick Summary
```javascript
// Get summary without downloading
window.gameDebugLogger.getSummary()
```

## What to Look For

When analyzing the downloaded JSON file, look for:

### Successful P Key Pattern:
```json
[
  {"event": "PAUSE_GAME_CALLED", "data": {"paused": true, "userPaused": true}},
  {"event": "RESUME_GAME_CALLED", "data": {"paused": false, "userPaused": false}}
]
```

### Broken ESC Options Menu Pattern:
```json
[
  {"event": "OPTIONS_MENU_OPEN", "data": {"wasUserPaused": undefined}},
  {"event": "PAUSE_GAME_CALLED", "data": {"userPaused": undefined}},
  {"event": "OPTIONS_MENU_CLOSE", "data": {"wasUserPaused": undefined}},
  {"event": "RESUME_GAME_CALLED", "data": {"userPaused": undefined}}
]
```

### Recursion Problem:
- Multiple identical events with close timestamps
- Rapid-fire OPTIONS_MENU_OPEN events
- undefined values for userPaused

## Expected Debug Events

The system should capture:
- `PAUSE_GAME_CALLED` - When pauseGame() is called
- `RESUME_GAME_CALLED` - When resumeGame() is called  
- `OPTIONS_MENU_OPEN` - When ESC opens options menu
- `OPTIONS_MENU_CLOSE` - When options menu closes

## Console Commands Reference

```javascript
// Start fresh debug session
window.gameDebugLogger.start()

// Stop and download
window.gameDebugLogger.stop()
window.gameDebugLogger.downloadLogs()

// Clear logs and start over
window.gameDebugLogger.clear()
window.gameDebugLogger.start()

// Manual logging (for testing)
window.gameDebugLogger.log('TEST_EVENT', {test: 'data'})
```

## Next Steps

1. Use the browser console commands above
2. Reproduce the pause issues (P key vs ESC options menu)
3. Download the debug logs JSON file
4. Share the JSON content to analyze the exact event sequence and identify the bug

This structured approach will help identify why the ESC options menu pause functionality is broken while the P key works correctly.
