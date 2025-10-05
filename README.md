# Lightning Timer

A lightweight, cross-platform timer application built with Tauri, React, and TypeScript.

## Features

- **Timer Control**: Set timer up to 99 minutes and 99 seconds
- **Multiple Input Methods**:
  - Up/Down buttons for minutes and seconds
  - Number pad for quick input (right-to-left insertion)
- **Settings**:
  - Always on top window option
  - Dark mode toggle
- **Audio Alarm**: Built-in alarm sound when timer reaches zero
- **Responsive Design**: Optimized for 800x200 window size

## Requirements

- Node.js 16+
- Rust 1.70+
- npm or yarn

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

To run the application in development mode:

```bash
npm run tauri:dev
```

## Building

### macOS Universal Build

To build a universal macOS application (Intel + Apple Silicon):

```bash
npm run tauri:build:universal
```

### Windows Build

To build a Windows executable from macOS:

1. Install required tools:

   ```bash
   brew install mingw-w64 llvm nsis
   ```

2. Run the Windows build script:

   ```bash
   npm run build:windows
   ```

   Or manually:

   ```bash
   npm run tauri:build:windows
   ```

### Standard Build

To build the application for your current platform:

```bash
npm run tauri:build
```

## Usage

### Setting Timer

- Use the up/down arrows next to "Minutes" and "Seconds" to adjust time
- Click "Number Pad" to open a calculator-style input
- In number pad mode, enter numbers from right to left (e.g., "90" becomes 90 seconds, "900" becomes 9 minutes)

### Controls

- **Start**: Begin the countdown
- **Pause**: Pause the running timer
- **Reset**: Stop and reset timer to 00:00
- **Number Pad**: Open numeric input interface
- **Settings**: Configure application preferences

### Settings

- **Always on top**: Keep the timer window above other applications
- **Dark mode**: Switch between light and dark themes

## Technical Details

- **Frontend**: React 18 + TypeScript
- **Backend**: Tauri (Rust)
- **Styling**: CSS with CSS Variables for theming
- **Audio**: Web Audio API for alarm generation
- **Linting**: ESLint + TypeScript strict mode

## Project Structure

```
src/
├── components/          # React components
│   ├── TimerDisplay.tsx
│   ├── TimerControls.tsx
│   ├── NumberPad.tsx
│   └── Settings.tsx
├── types.ts            # TypeScript type definitions
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles

src-tauri/
├── src/
│   └── main.rs         # Rust backend entry point
├── Cargo.toml          # Rust dependencies
└── tauri.conf.json     # Tauri configuration
```

## License

MIT License
