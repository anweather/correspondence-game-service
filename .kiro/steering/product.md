# Product Overview

The Async Boardgame Service is a generic, pluggable platform for managing turn-based board games through RESTful web APIs. It enables correspondence-style gameplay where players make moves asynchronously, retrieve game state, and generate visual board representations.

## Core Capabilities

- Create and manage multiple game instances simultaneously
- Support 2-8 players per game with flexible join mechanics
- Asynchronous turn-based gameplay via REST API
- Automatic board visualization (SVG/PNG rendering)
- Pluggable game engine architecture for easy game type additions
- Optimistic locking for concurrent game state management

## Design Philosophy

The platform prioritizes extensibility through a clean plugin interface, allowing game developers to implement custom board games without modifying core service code. The architecture separates game-specific logic from infrastructure concerns, supporting progressive complexity from simple games (Tic-Tac-Toe) to advanced multi-phase games with cards, dice, and custom board shapes.

## Target Use Cases

- Correspondence-style board gaming platforms
- Educational game development and testing
- Prototyping new board game mechanics
- Multi-player async gaming experiences
