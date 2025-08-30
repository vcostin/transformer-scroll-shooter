/**
 * Manual Options Menu Pause Test
 * Simple test to debug the options menu pause behavior
 */

console.log('🧪 Manual Options Menu Pause Test Started')

// Test the pause functionality manually
setTimeout(() => {
  console.log('Testing options menu pause behavior...')

  const game = window.game
  if (!game) {
    console.error('❌ Game not found on window object')
    return
  }

  console.log('✅ Game found:', game)
  console.log('Initial state - paused:', game.paused, 'userPaused:', game.userPaused)

  // Test ESC key to open options menu
  console.log('📝 Simulating ESC key press to open options menu...')
  const escEvent = new KeyboardEvent('keydown', { code: 'Escape' })
  document.dispatchEvent(escEvent)

  setTimeout(() => {
    console.log('After ESC - paused:', game.paused, 'userPaused:', game.userPaused)
    console.log('Options menu open:', game.options?.isOpen)

    // Test ESC key again to close options menu
    console.log('📝 Simulating ESC key press again to close options menu...')
    const escEvent2 = new KeyboardEvent('keydown', { code: 'Escape' })
    document.dispatchEvent(escEvent2)

    setTimeout(() => {
      console.log('After second ESC - paused:', game.paused, 'userPaused:', game.userPaused)
      console.log('Options menu open:', game.options?.isOpen)
      console.log('🧪 Manual test complete')
    }, 100)
  }, 100)
}, 2000) // Wait 2 seconds for game to initialize
