import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";
import path from "node:path";
import process from "node:process";
import { PassThrough } from "node:stream";

// This scope allows the app to manage files in the user's Drive.
const SCOPES = ["https://www.googleapis.com/auth/drive"];

const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

export class GoogleDriveClient {
  private drive;

  private constructor(auth) {
    this.drive = google.drive({ version: "v3", auth });
  }

  static async create() {
    const auth = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    return new GoogleDriveClient(auth);
  }

  /**
   * Lists files within a specific folder.
   * @param folderId The ID of the folder to list files from.
   */
  async listFiles(folderId: string) {
    const res = await this.drive.files.list({
      // Filter files to only include those directly within the specified folder.
      q: `'${folderId}' in parents`,
      // Request the mimeType to handle different file types correctly.
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: 1000,
    });
    return res.data.files || [];
  }

  /**
   * Retrieves the content of a file, handling different mime types.
   * @param fileId The ID of the file to read.
   */
  async getFileContent(fileId: string): Promise<string> {
    // First, get the file's metadata to check its mime type.
    const metadata = await this.drive.files.get({
      fileId,
      fields: "mimeType",
    });
    const mimeType = metadata.data.mimeType;

    let res;
    // If it's a Google Doc, export it as plain text.
    if (mimeType === "application/vnd.google-apps.document") {
      res = await this.drive.files.export(
        { fileId, mimeType: "text/plain" },
        { responseType: "stream" }
      );
    } else if (mimeType && mimeType.startsWith("text/")) {
      // For plain text files, get the raw media content.
      res = await this.drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
      );
    } else {
      // For binary or unsupported files, return an informative message.
      return `Cannot display content of file with mime type: ${
        mimeType || "unknown"
      }`;
    }

    // Read the file content from the stream.
    return new Promise((resolve, reject) => {
      let data = "";
      (res.data as PassThrough)
        .on("data", (chunk) => (data += chunk))
        .on("end", () => resolve(data))
        .on("error", (err) => reject(err));
    });
  }

  /**
   * Renames a file.
   * @param fileId The ID of the file to rename.
   * @param newName The new name for the file.
   */
  async renameFile(fileId: string, newName: string) {
    await this.drive.files.update({
      fileId,
      requestBody: {
        name: newName,
      },
    });
  }

  /**
   * Creates a new file in a specific folder.
   * @param fileName The name of the file to create.
   * @param content The content of the file.
   * @param folderId The ID of the parent folder.
   */
  async createFile(fileName: string, content: string, folderId: string) {
    await this.drive.files.create({
      requestBody: {
        name: fileName,
        // Specify the parent folder for the new file.
        parents: [folderId],
      },
      media: {
        mimeType: "application/json",
        body: content,
      },
    });
  }
}
