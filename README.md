# Web-Agent Frontend

Next-generation AI agent platform built with Next.js, TypeScript, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

Navigate to this directory and install dependencies:

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/app`: Next.js App Router pages and global styles.
- `src/components`: Reusable UI components (Sidebar, ChatInterface, ModelPicker).
- `src/lib`: Utility functions and database configuration (`db.ts` using Dexie.js).

## Features Implemented

- **UI Shell**: Responsive layout with a collapsible sidebar and clean chat interface.
- **Model Picker**: Functional dropdown to switch between AI providers.
- **Offline-First**: Integrated Dexie.js for local persistence in IndexedDB.
- **Offline Indicator**: Visual status in the sidebar.
- **Realtime Voice**: Low-latency audio conversations via OpenAI Realtime API.
- **MCP Integration**: Dynamic tool calling via Model Context Protocol.
- **Notion Sync**: Automatic cloud backup and sync using Notion.
- **Pricing & Credits**: At-cost credit system and feature unlocks.
