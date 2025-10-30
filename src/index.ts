#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

// Create an MCP server
const server = new Server(
  {
    name: "first-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define a simple echo tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "echo",
        description: "Echoes back the provided message",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "The message to echo back",
            },
          },
          required: ["message"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "echo") {
    const message = request.params.arguments?.message;
    
    if (typeof message !== "string") {
      throw new McpError(
        ErrorCode.InvalidParams,
        "Message must be a string"
      );
    }

    return {
      content: [
        {
          type: "text",
          text: `Echo: ${message}`,
        },
      ],
    };
  }

  throw new McpError(
    ErrorCode.MethodNotFound,
    `Unknown tool: ${request.params.name}`
  );
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("First MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
