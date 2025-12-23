# Yahtzee Game Plugin

A classic dice-scoring game implementation for the Async Boardgame Service.

## Overview

Yahtzee is a dice game where players roll 5 dice up to 3 times per turn, trying to achieve specific scoring combinations. Players fill out a scorecard with 13 categories, and the player with the highest total score wins.

## Features

- Support for 1-8 players
- Classic Yahtzee scoring rules with upper section bonus
- Seeded random dice generation for reproducible games
- SVG-based visual rendering
- Turn-based gameplay with selective dice re-rolling

## Game Rules

### Scoring Categories

**Upper Section (Ones through Sixes):**
- Sum of dice showing the category number
- 35-point bonus if upper section totals 63+ points

**Lower Section:**
- Three of a Kind: Sum of all dice (requires 3+ of same value)
- Four of a Kind: Sum of all dice (requires 4+ of same value)
- Full House: 25 points (requires 3 of one value + 2 of another)
- Small Straight: 30 points (requires 4 consecutive numbers)
- Large Straight: 40 points (requires 5 consecutive numbers)
- Yahtzee: 50 points (requires all 5 dice same value)
- Chance: Sum of all dice (no requirements)

### Gameplay

1. Players take turns rolling 5 dice
2. After each roll, player can choose which dice to keep
3. Player can roll up to 3 times per turn
4. After final roll, player must score in an available category
5. Game ends when all players have filled all 13 categories
6. Highest total score wins

## Technical Details

This plugin follows the established game plugin architecture:
- Extends `BaseGameEngine` for core functionality
- Modular design with specialized modules for different concerns
- Uses seeded random generation for reproducible dice rolls
- Integrates with existing service infrastructure