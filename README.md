# Advanced Minecraft Bot

A sophisticated Minecraft bot with multiple automated systems and features.

## Features

### Core Systems
- **Inventory Management** - Smart inventory organization and tool selection
- **Auto-Eating** - Automatic health and hunger management
- **Combat System** - PvE combat with weapon switching
- **Farming Automation** - Plant, harvest, and replant crops
- **Fishing Bot** - Automated fishing with rod management
- **Waypoint System** - Save and navigate to named locations
- **Follow Player** - Follow and guard players
- **Command System** - Comprehensive chat commands
- **Building System** - Automated structure building
- **Crafting Automation** - Auto-craft items from available materials

### Commands
- `!help` - Show available commands
- `!status` - Show bot status (health, hunger, position)
- `!inv` - Show inventory summary
- `!eat` - Force eat food
- `!fight on/off` - Toggle auto-combat
- `!farm start/stop` - Start/stop farming
- `!fish start/stop` - Start/stop fishing
- `!follow [player]` - Follow a player
- `!come` - Come to command sender
- `!stop` - Stop all actions
- `!wp save/go/list [name]` - Waypoint management
- `!mine [block]` - Mine specific blocks
- `!build [type]` - Build structures

### Legacy Commands
- `loaded` - Initialize bot systems
- `find [block]` - Find and mine blocks
- `wear armor` - Equip available armor
- `inventory` - Show inventory
- `health` - Show health status
- `organize` - Organize inventory

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure settings in `config.json`

3. Start the bot:
```bash
npm start
```

## Configuration

Edit `config.json` to customize:
- Server connection details
- Bot behavior settings
- Feature toggles
- Thresholds and distances

## Systems Overview

### Inventory Management
- Automatic organization
- Tool and weapon selection
- Space management
- Item prioritization

### Auto-Eating
- Health monitoring
- Hunger tracking
- Food prioritization
- Emergency eating

### Combat
- Hostile mob detection
- Weapon auto-switching
- Target prioritization
- Defensive actions

### Farming
- Crop detection
- Harvest automation
- Replanting
- Tool management

### Waypoints
- Location saving
- Path navigation
- Distance calculation
- Tour system

## Development

The bot uses a modular architecture with separate systems:
- `lib/inventory.js` - Inventory management
- `lib/autoEat.js` - Eating automation
- `lib/combat.js` - Combat system
- `lib/farming.js` - Farming automation
- `lib/fishing.js` - Fishing bot
- `lib/follow.js` - Player following
- `lib/waypoints.js` - Waypoint system
- `lib/commands.js` - Command handling
- `lib/crafting.js` - Crafting automation

