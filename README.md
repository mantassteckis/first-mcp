# first-mcp

My first Model Context Protocol (MCP) server built following the [official MCP documentation](https://modelcontextprotocol.io/docs/develop/build-server).

## Overview

This is a basic MCP server that demonstrates the core concepts of the Model Context Protocol. It provides a simple "echo" tool that echoes back any message you send to it.

## Features

- Built with TypeScript and the official MCP SDK
- Implements a simple echo tool
- Uses stdio transport for communication
- Follows MCP best practices

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### Running the Server

The server communicates via stdio and is designed to be used with MCP clients:

```bash
node dist/index.js
```

### Development

```bash
# Watch mode for development
npm run watch
```

## Available Tools

### echo

Echoes back the provided message.

**Parameters:**
- `message` (string, required): The message to echo back

**Example:**
```json
{
  "name": "echo",
  "arguments": {
    "message": "Hello, MCP!"
  }
}
```

## Configuration

To use this server with an MCP client, add it to your client's configuration. For example, with Claude Desktop:

```json
{
  "mcpServers": {
    "first-mcp": {
      "command": "node",
      "args": ["/path/to/first-mcp/dist/index.js"]
    }
  }
}
```

## Project Structure

```
first-mcp/
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled JavaScript (generated)
├── tsconfig.json         # TypeScript configuration
├── package.json          # Project metadata and dependencies
└── README.md            # This file
```

## Built With

- [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) - Official MCP SDK
- TypeScript - For type-safe development
- Node.js - Runtime environment

## License

ISC
