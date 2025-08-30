/**
 * Audio Manager - Pure POJO+Functional Implementation
 * Handles sound effects and music using W    ) else if (soundDef.sweep) {
      oscillator.frequency.setValueAtTime(frequency * 2, audioManager.audioContext.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 0.5,
        audioManager.audioContext.currentTime + soundDef.duration
      )
    } else {
      oscillator.frequency.setValueAtTime(frequency, audioManager.audioContext.currentTime)
    }

    // Set volume envelope
    gainNode.gain.setValueAtTime(0, audioManager.audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(volume, audioManager.audioContext.currentTime + 0.01) */

/**
 * Creates a new audio manager instance
 * @returns {Object} Audio manager POJO
 */
export function createAudioManager() {
  const audioManager = {
    sounds: {},
    musicVolume: 0.5,
    sfxVolume: 0.7,
    masterVolume: 1.0,
    enabled: true,
    audioContext: null,
    soundDefinitions: {}
  }

  // Initialize the audio manager
  const initializedManager = loadSounds(audioManager)

  // Add backward-compatible method wrappers for tests
  initializedManager.generateSound = function (soundDef, volume) {
    return generateSound(this, soundDef, volume)
  }

  initializedManager.playSound = function (soundName, volume = 1.0) {
    if (!this.enabled || !this.audioContext) return

    const soundDef = this.soundDefinitions[soundName]
    if (!soundDef) return

    const finalVolume = volume * this.sfxVolume * this.masterVolume
    if (finalVolume <= 0) return

    try {
      this.generateSound(soundDef, finalVolume)
    } catch {
      console.warn('Could not play sound:', soundName)
    }
  }

  initializedManager.setMasterVolume = function (volume) {
    Object.assign(this, setMasterVolume(this, volume))
    return this
  }

  initializedManager.setSfxVolume = function (volume) {
    Object.assign(this, setSfxVolume(this, volume))
    return this
  }

  initializedManager.setMusicVolume = function (volume) {
    Object.assign(this, setMusicVolume(this, volume))
    return this
  }

  initializedManager.setEnabled = function (enabled) {
    Object.assign(this, setEnabled(this, enabled))
    return this
  }

  initializedManager.resume = function () {
    return resumeAudio(this)
  }

  return initializedManager
}

/**
 * Initializes sound definitions and audio context
 * @param {Object} audioManager - Audio manager POJO
 * @returns {Object} Updated audio manager
 */
function loadSounds(audioManager) {
  // Create audio contexts for procedural sounds
  try {
    audioManager.audioContext = new (window.AudioContext || window['webkitAudioContext'])()
  } catch {
    console.warn('Web Audio API not supported')
    audioManager.audioContext = null
  }

  // Define sound effects
  audioManager.soundDefinitions = {
    shoot: { frequency: 800, duration: 0.1, type: 'square' },
    enemyShoot: { frequency: 400, duration: 0.15, type: 'sawtooth' },
    explosion: { frequency: 200, duration: 0.3, type: 'noise' },
    powerup: { frequency: 600, duration: 0.2, type: 'sine', ascending: true },
    transform: { frequency: 300, duration: 0.4, type: 'triangle', sweep: true },
    enemyHit: { frequency: 350, duration: 0.1, type: 'square' },
    playerHit: { frequency: 150, duration: 0.2, type: 'sawtooth' },
    engineLow: { frequency: 100, duration: 0.5, type: 'triangle', loop: true },
    engineHigh: { frequency: 200, duration: 0.5, type: 'triangle', loop: true },
    backgroundAmbient: { frequency: 80, duration: 2.0, type: 'sine', loop: true, volume: 0.1 }
  }

  return audioManager
}

/**
 * Plays a sound with the given name and volume
 * @param {Object} audioManager - Audio manager POJO
 * @param {string} soundName - Name of the sound to play
 * @param {number} volume - Volume level (0.0 to 1.0)
 */
export function playSound(audioManager, soundName, volume = 1.0) {
  if (!audioManager.enabled || !audioManager.audioContext) return

  const soundDef = audioManager.soundDefinitions[soundName]
  if (!soundDef) return

  const finalVolume = volume * audioManager.sfxVolume * audioManager.masterVolume
  if (finalVolume <= 0) return

  try {
    generateSound(audioManager, soundDef, finalVolume)
  } catch (error) {
    console.warn('Could not play sound:', soundName)
  }
}

/**
 * Generates and plays a procedural sound
 * @param {Object} audioManager - Audio manager POJO
 * @param {Object} soundDef - Sound definition object
 * @param {number} volume - Final volume level
 */
export function generateSound(audioManager, soundDef, volume) {
  const oscillator = audioManager.audioContext.createOscillator()
  const gainNode = audioManager.audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioManager.audioContext.destination)

  // Set waveform
  oscillator.type = soundDef.type === 'noise' ? 'sawtooth' : soundDef.type

  // Set frequency
  const frequency = soundDef.frequency
  if (soundDef.ascending) {
    oscillator.frequency.setValueAtTime(frequency * 0.5, audioManager.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * 2,
      audioManager.audioContext.currentTime + soundDef.duration
    )
  } else if (soundDef.sweep) {
    oscillator.frequency.setValueAtTime(frequency * 2, audioManager.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * 0.5,
      audioManager.audioContext.currentTime + soundDef.duration
    )
  } else {
    oscillator.frequency.setValueAtTime(frequency, audioManager.audioContext.currentTime)
  }

  // Set volume envelope
  gainNode.gain.setValueAtTime(0, audioManager.audioContext.currentTime)
  gainNode.gain.linearRampToValueAtTime(volume, audioManager.audioContext.currentTime + 0.01)

  if (soundDef.type === 'noise') {
    // Create noise effect for explosions
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioManager.audioContext.currentTime + soundDef.duration
    )
  } else {
    gainNode.gain.linearRampToValueAtTime(
      0,
      audioManager.audioContext.currentTime + soundDef.duration
    )
  }

  // Start and stop
  oscillator.start(audioManager.audioContext.currentTime)
  oscillator.stop(audioManager.audioContext.currentTime + soundDef.duration)
}

/**
 * Sets the master volume
 * @param {Object} audioManager - Audio manager POJO
 * @param {number} volume - Volume level (0.0 to 1.0)
 * @returns {Object} Updated audio manager
 */
export function setMasterVolume(audioManager, volume) {
  return {
    ...audioManager,
    masterVolume: Math.max(0, Math.min(1, volume))
  }
}

/**
 * Sets the sound effects volume
 * @param {Object} audioManager - Audio manager POJO
 * @param {number} volume - Volume level (0.0 to 1.0)
 * @returns {Object} Updated audio manager
 */
export function setSfxVolume(audioManager, volume) {
  return {
    ...audioManager,
    sfxVolume: Math.max(0, Math.min(1, volume))
  }
}

/**
 * Sets the music volume
 * @param {Object} audioManager - Audio manager POJO
 * @param {number} volume - Volume level (0.0 to 1.0)
 * @returns {Object} Updated audio manager
 */
export function setMusicVolume(audioManager, volume) {
  return {
    ...audioManager,
    musicVolume: Math.max(0, Math.min(1, volume))
  }
}

/**
 * Enables or disables audio
 * @param {Object} audioManager - Audio manager POJO
 * @param {boolean} enabled - Whether audio should be enabled
 * @returns {Object} Updated audio manager
 */
export function setEnabled(audioManager, enabled) {
  return {
    ...audioManager,
    enabled: enabled
  }
}

/**
 * Resumes audio context (required for Chrome autoplay policy)
 * @param {Object} audioManager - Audio manager POJO
 */
export function resumeAudio(audioManager) {
  if (audioManager.audioContext && audioManager.audioContext.state === 'suspended') {
    audioManager.audioContext.resume()
  }
}

// Default export - createAudioManager function for new functional usage
export default createAudioManager
