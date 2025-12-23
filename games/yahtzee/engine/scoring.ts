/**
 * Yahtzee Scoring Module
 * 
 * Calculates scores for all 13 Yahtzee categories according to official rules.
 * This module will be fully implemented in task 4.
 */

import { YahtzeeCategory } from '../shared/types';

/**
 * Calculate the score for a given category and dice combination
 * 
 * @param category The scoring category to calculate
 * @param dice Array of 5 dice values (1-6)
 * @returns The score for this category, or 0 if combination doesn't qualify
 */
export function calculateScore(_category: YahtzeeCategory, _dice: number[]): number {
  // TODO: Implement in task 4 - Implement Yahtzee scoring calculations
  throw new Error('calculateScore not yet implemented - will be completed in task 4');
}

/**
 * Calculate upper section bonus eligibility
 * 
 * @param upperSectionTotal Current total of upper section categories
 * @returns Bonus points (35 if eligible, 0 otherwise)
 */
export function calculateUpperSectionBonus(_upperSectionTotal: number): number {
  // TODO: Implement in task 4 - Implement Yahtzee scoring calculations
  throw new Error('calculateUpperSectionBonus not yet implemented - will be completed in task 4');
}