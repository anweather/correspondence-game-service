# UI Changes Guide

## Visual Overview of New Features

This guide shows the UI changes for the new login and deep linking features.

---

## 1. Login Screen (New)

### When to see it
- First visit to player view
- After clicking "Logout"
- When not logged in

### What it looks like
```
┌─────────────────────────────────────────────────────┐
│  Welcome to Async Boardgame                         │
└─────────────────────────────────────────────────────┘

        ┌───────────────────────────────────┐
        │                                   │
        │     Enter Your Name               │
        │                                   │
        │  Your name will be saved for      │
        │  this browser session             │
        │                                   │
        │  ┌─────────────────────────────┐  │
        │  │ Your Name                   │  │
        │  │ [Enter your name________]   │  │
        │  └─────────────────────────────┘  │
        │                                   │
        │     [ Continue ]                  │
        │                                   │
        └───────────────────────────────────┘
```

### Key elements
- Centered on page
- Clean, simple form
- Single input field
- Large "Continue" button
- Helpful description text

---

## 2. Game Setup Screen (Updated)

### When to see it
- After logging in
- When no game is loaded

### What it looks like
```
┌─────────────────────────────────────────────────────────────┐
│  Welcome, Alice                            [ Logout ]        │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────────────────┐      ┌──────────────────────────┐
    │  Create New Game         │      │  Join Existing Game      │
    │                          │      │                          │
    │  [ Create Tic-Tac-Toe ]  │  OR  │  Select Game:            │
    │                          │      │  [dropdown___________]   │
    │                          │      │                          │
    │                          │      │  Or enter Game ID:       │
    │                          │      │  [________________]      │
    │                          │      │                          │
    │                          │      │  [ Join Game ]           │
    └──────────────────────────┘      └──────────────────────────┘
```

### Changes from before
- ❌ Removed: Player name input (no longer needed)
- ✅ Added: "Welcome, [Name]" header
- ✅ Added: Logout button
- ✅ Simplified: Single button to create game

---

## 3. Active Game Screen (Updated)

### When to see it
- After creating or joining a game
- When playing a game

### What it looks like
```
┌──────────────────────────────────────────────────────────────────┐
│  Welcome, Alice  [ Logout ]    [ 📋 Share Link ] [ Refresh ]     │
└──────────────────────────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────────┐
    │  Game Details                                          │
    │  ─────────────────────────────────────────────────────│
    │  Game ID: 977b71a4-7733-4006-8b66-e317a02d166b        │
    │  Type: tic-tac-toe                                     │
    │  Status: active                                        │
    │  Players: Alice, Bob                                   │
    │  Current Turn: Alice (You!)                            │
    │                                                        │
    │  Board:                                                │
    │  ┌───┬───┬───┐                                        │
    │  │ X │   │   │                                        │
    │  ├───┼───┼───┤                                        │
    │  │   │ O │   │                                        │
    │  ├───┼───┼───┤                                        │
    │  │   │   │   │                                        │
    │  └───┴───┴───┘                                        │
    └────────────────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────────┐
    │  Make Your Move                                        │
    │  ─────────────────────────────────────────────────────│
    │  Click a cell to place your token                      │
    │                                                        │
    │  [ Submit Move ]                                       │
    └────────────────────────────────────────────────────────┘
```

### Changes from before
- ✅ Added: "📋 Share Link" button (NEW!)
- ✅ Added: Logout button
- ✅ Updated: Header layout with left/right sections

---

## 4. Button Styles

### Logout Button
```
┌──────────┐
│  Logout  │  ← Small, subtle, gray border
└──────────┘
   Hover: Light red background
```

### Share Link Button
```
┌─────────────────┐
│ 📋 Share Link   │  ← Blue border, white background
└─────────────────┘
   Hover: Blue background, white text
   Click: Copies link to clipboard
```

### Refresh Button
```
┌───────────┐
│  Refresh  │  ← Gray background
└───────────┘
   Hover: Darker gray
```

---

## 5. Responsive Design

### Desktop (1024px+)
```
┌────────────────────────────────────────────────────────┐
│  Welcome, Alice  [Logout]  [📋 Share Link] [Refresh]   │
└────────────────────────────────────────────────────────┘
```
- All buttons in header
- Side-by-side layout for create/join

### Tablet (768px - 1023px)
```
┌────────────────────────────────────────────────────────┐
│  Welcome, Alice  [Logout]                              │
│  [📋 Share Link] [Refresh]                             │
└────────────────────────────────────────────────────────┘
```
- Buttons wrap to second row
- Stacked layout for create/join

### Mobile (<768px)
```
┌──────────────────────────┐
│  Welcome, Alice          │
│  [Logout]                │
│  [📋 Share Link]         │
│  [Refresh]               │
└──────────────────────────┘
```
- All elements stack vertically
- Full-width buttons
- Larger touch targets

---

## 6. User Flow Diagrams

### Flow 1: First-Time User
```
Start
  ↓
Visit /player
  ↓
See Login Screen
  ↓
Enter Name "Alice"
  ↓
Click "Continue"
  ↓
See Game Setup
  ↓
Click "Create Game"
  ↓
Game Created!
  ↓
See "📋 Share Link" button
```

### Flow 2: Returning User
```
Start
  ↓
Visit /player
  ↓
Already Logged In!
  ↓
See Game Setup
  (name remembered)
```

### Flow 3: Deep Link User
```
Start
  ↓
Click shared link
/player?gameId=123
  ↓
See Login Screen
  ↓
Enter Name "Bob"
  ↓
Click "Continue"
  ↓
Game Loads Automatically!
  ↓
Click "Join Game"
  ↓
Playing with Alice!
```

---

## 7. Color Scheme

### Primary Colors
- **Primary Blue**: `#007bff` - Main actions (Create, Join, Share)
- **Secondary Gray**: `#6c757d` - Refresh button
- **Error Red**: `#721c24` - Logout hover, errors
- **Success Green**: `#28a745` - Success messages

### Background Colors
- **Page Background**: `#f5f5f5` - Light gray
- **Card Background**: `#ffffff` - White
- **Input Background**: `#ffffff` - White

### Text Colors
- **Primary Text**: `#333333` - Dark gray
- **Secondary Text**: `#666666` - Medium gray
- **Tertiary Text**: `#999999` - Light gray (placeholders)

---

## 8. Accessibility Features

### Keyboard Navigation
- ✅ All buttons are keyboard accessible
- ✅ Tab order is logical
- ✅ Enter key submits forms
- ✅ Escape key can close modals (future)

### Screen Readers
- ✅ Proper ARIA labels on buttons
- ✅ Error messages have `role="alert"`
- ✅ Form labels properly associated
- ✅ Semantic HTML structure

### Visual
- ✅ High contrast text
- ✅ Focus indicators visible
- ✅ Button states clear
- ✅ Error messages prominent

---

## 9. Animation & Transitions

### Button Hover
```css
transition: background-color 0.2s, color 0.2s;
```
- Smooth color transitions
- 200ms duration
- Feels responsive

### Button Click
```css
transform: scale(0.98);
```
- Subtle press effect
- Provides tactile feedback
- Enhances interactivity

### Form Focus
```css
box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
```
- Blue glow on focus
- Clear indication of active field
- Accessible and attractive

---

## 10. Error States

### Login Error
```
┌───────────────────────────────────┐
│  ⚠️ Player name cannot be empty   │
└───────────────────────────────────┘
```

### Game Load Error
```
┌───────────────────────────────────┐
│  ⚠️ Failed to load game           │
└───────────────────────────────────┘
```

### Join Error
```
┌───────────────────────────────────┐
│  ⚠️ Game is full                  │
└───────────────────────────────────┘
```

All errors:
- Red background
- Dark red text
- Clear icon
- Dismissible (auto-clear on next action)

---

## 11. Loading States

### During Login
```
[ Continue ]  →  [ Loading... ]
```
- Button disabled
- Text changes
- Cursor shows waiting

### During Game Load
```
Loading game...
```
- Spinner or loading text
- Prevents duplicate actions
- Clear feedback

---

## 12. Success States

### After Login
```
✓ Logged in as Alice
```
- Brief success message
- Transitions to game setup
- Smooth experience

### After Copy Link
```
✓ Link copied to clipboard!
```
- Toast notification (future enhancement)
- Visual confirmation
- Non-intrusive

---

## Summary

The new UI provides:
- ✅ **Cleaner** - Less clutter, focused actions
- ✅ **Faster** - Fewer steps to play
- ✅ **Friendlier** - Welcoming messages
- ✅ **Smarter** - Remembers your name
- ✅ **Shareable** - One-click link copying
- ✅ **Accessible** - Works for everyone
- ✅ **Responsive** - Great on all devices

The changes maintain the existing design language while adding powerful new features that enhance the player experience.

