/**
 * Systems module - Core game systems
 * 
 * - EventDispatcher: Event-driven communication system
 * - StateManager: Centralized state management with validation, history, and events
 * - EffectManager: Side effects coordination system
 * - EffectContext: Controlled operations for side effects
 */
export { EventDispatcher, eventDispatcher } from '@/systems/EventDispatcher.js';
export { StateManager, stateManager } from '@/systems/StateManager.js';
export { EffectManager } from '@/systems/EffectManager.js';
export { EffectContext } from '@/systems/EffectContext.js';
