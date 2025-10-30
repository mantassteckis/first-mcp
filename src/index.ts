#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleDriveClient } from "./google-drive-client.js";

async function main() {
  const driveClient = await GoogleDriveClient.create();

  // Create an MCP server
  const server = new Server(
    {
      name: "google-drive-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define the tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "list_drive_files",
          description: "Lists all files in a specific Google Drive folder",
          inputSchema: {
            type: "object",
            properties: {
              folderId: {
                type: "string",
                description: "The ID of the folder to list files from",
              },
            },
            required: ["folderId"],
          },
        },
        {
          name: "read_drive_file",
          description: "Reads a file from Google Drive",
          inputSchema: {
            type: "object",
            properties: {
              fileId: {
                type: "string",
                description: "The ID of the file to read",
              },
            },
            required: ["fileId"],
          },
        },
        {
          name: "rename_drive_file",
          description: "Renames a file in Google Drive",
          inputSchema: {
            type: "object",
            properties: {
              fileId: {
                type: "string",
                description: "The ID of the file to rename",
              },
              newName: {
                type: "string",
                description: "The new name for the file",
              },
            },
            required: ["fileId", "newName"],
          },
        },
        {
          name: "generate_toc",
          description:
            "Generates a table of contents file (toc.json) for a folder",
          inputSchema: {
            type: "object",
            properties: {
              folderId: {
                type: "string",
                description: "The ID of the folder for the TOC",
              },
            },
            required: ["folderId"],
          },
        },
        {
          name: "query",
          description: "Queries a folder in Google Drive for a file",
          inputSchema: {
            type: "object",
            properties: {
              folderId: {
                type: "string",
                description: "The ID of the folder to query",
              },
              query: {
                type: "string",
                description: "The query to search for",
              },
            },
            required: ["folderId", "query"],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "list_drive_files") {
      if (
        !request.params.arguments ||
        typeof request.params.arguments.folderId !== "string"
      ) {
        throw new McpError(ErrorCode.InvalidParams, "Missing folderId");
      }
      const files = await driveClient.listFiles(
        request.params.arguments.folderId
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(files, null, 2),
          },
        ],
      };
    }

    if (request.params.name === "read_drive_file") {
      if (
        !request.params.arguments ||
        typeof request.params.arguments.fileId !== "string"
      ) {
        throw new McpError(ErrorCode.InvalidParams, "Missing fileId");
      }
      const content = await driveClient.getFileContent(
        request.params.arguments.fileId
      );
      return {
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      };
    }

    if (request.params.name === "rename_drive_file") {
      if (
        !request.params.arguments ||
        typeof request.params.arguments.fileId !== "string" ||
        typeof request.params.arguments.newName !== "string"
      ) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Missing fileId or newName"
        );
      }
      await driveClient.renameFile(
        request.params.arguments.fileId,
        request.params.arguments.newName
      );
      return {
        content: [
          {
            type: "text",
            text: "File renamed successfully",
          },
        ],
      };
    }

    if (request.params.name === "generate_toc") {
      if (
        !request.params.arguments ||
        typeof request.params.arguments.folderId !== "string"
      ) {
        throw new McpError(ErrorCode.InvalidParams, "Missing folderId");
      }
      const folderId = request.params.arguments.folderId;
      const files = await driveClient.listFiles(folderId);
      const toc = {
        files: files.map((file) => ({
          id: file.id,
          name: file.name,
        })),
      };
      await driveClient.createFile(
        "toc.json",
        JSON.stringify(toc, null, 2),
        folderId
      );
      return {
        content: [
          {
            type: "text",
            text: "toc.json generated successfully",
          },
        ],
      };
    }

    if (request.params.name === "query") {
      if (
        !request.params.arguments ||
        typeof request.params.arguments.folderId !== "string" ||
        typeof request.params.arguments.query !== "string"
      ) {
        throw new McpError(
          ErrorCode.InvalidParams,
          "Missing folderId or query"
        );
      }

      const { folderId, query } = request.params.arguments;

      // Find and read the toc.json file
      const files = await driveClient.listFiles(folderId);
      const tocFile = files.find((file) => file.name === "toc.json");
      if (!tocFile || !tocFile.id) {
        throw new McpError(ErrorCode.InternalError, "toc.json not found");
      }
      const tocContent = await driveClient.getFileContent(tocFile.id);
      const toc = JSON.parse(tocContent);

      // Find the best matching file
      const bestMatch = toc.files.find((file) =>
        file.name.toLowerCase().includes(query.toLowerCase())
      );
      if (!bestMatch || !bestMatch.id) {
        throw new McpError(ErrorCode.InternalError, "No matching file found");
      }

      // Read the content of the best matching file
      const fileContent = await driveClient.getFileContent(bestMatch.id);

      return {
        content: [
          {
            type: "text",
            text: fileContent,
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Google Drive MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
