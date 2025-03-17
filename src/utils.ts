import { showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import fs from "fs";
import { IncomingMessage } from "http";
import https from "https";
import { pipeline } from "stream/promises";
import { promisify } from "util";
import { ERROR_PATTERNS, JAR_DOWNLOAD_URL, JAR_PATH } from "./constants";

const unlinkAsync = promisify(fs.unlink);

export const runShellScript = async (command: string): Promise<string> => {
  try {
    const escapedCommand = command.replace(/(["\n\\])/g, "\\$1");
    const script = `do shell script "${escapedCommand}"`;
    const output = await runAppleScript(script);
    return output;
  } catch (error) {
    console.error("Shell script execution error:", error);
    throw error; // Pass the original error up for more specific handling
  }
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
};

export const getUserFriendlyErrorMessage = (errorMessage: string): string => {
  // Check if the error matches any known patterns and return a user-friendly message
  for (const pattern of ERROR_PATTERNS) {
    if (errorMessage.includes(pattern.pattern)) {
      return pattern.message + "\nOriginal Error: " + errorMessage;
    }
  }

  // If no specific pattern is matched, return a generic message
  return (
    "An error occurred during the operation. Please check your inputs and try again." +
    "\nOriginal Error: " +
    errorMessage
  );
};

export const doesJarExist = async (): Promise<boolean> => {
  return fs.promises
    .access(JAR_PATH, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
};

export const downloadJar = async (): Promise<void> => {
  const fileStream = fs.createWriteStream(JAR_PATH);

  try {
    const response: IncomingMessage = await new Promise((resolve, reject) => {
      const request = https.get(JAR_DOWNLOAD_URL, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Failed to download file. Status code: ${res.statusCode}`));
          return;
        }
        resolve(res);
      });

      request.on("error", (err) => {
        reject(err);
      });
    });

    await pipeline(response, fileStream);
  } catch (error) {
    try {
      await unlinkAsync(JAR_PATH);
    } catch (unlinkError) {
      console.error("Error removing incomplete JAR file:", unlinkError);
    }
    throw error;
  }
};

// Helper function to clean encrypted text (remove wrapper if present)
export const cleanEncryptedText = (text: string): string => {
  text = text.trim();
  if (text.startsWith("![") && text.endsWith("]")) {
    return text.substring(2, text.length - 1);
  }
  return text;
};

// Helper function to build the command parameters
export const buildCommandParams = (
  operation: "encrypt" | "decrypt",
  input: string,
  password: string,
  algorithm: string,
  mode: string,
  useRandomIV?: boolean,
): string => {
  let params = `string ${operation} ${algorithm} ${mode}`;

  // Add random IV parameter if specified and it's an encryption operation
  if (operation === "encrypt" && useRandomIV) {
    params += " true";
  }

  // Add the password and input string
  params += ` "${password}" "${input}"`;

  return params;
};

// Helper function to handle common operation errors
export const handleOperationError = async (error: unknown, operation: "Encryption" | "Decryption"): Promise<void> => {
  const errorMessage = getErrorMessage(error);
  console.error(`${operation} error:`, error);

  const userMessage = getUserFriendlyErrorMessage(errorMessage);

  await showToast({
    style: Toast.Style.Failure,
    title: `${operation} Error`,
    message: userMessage,
  });
};
