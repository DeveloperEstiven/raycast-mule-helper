import os from "os";
import path from "path";

export const HOME_DIR = os.homedir();
export const JAR_NAME = "secure-properties-tool.jar";
export const JAR_PATH = path.join(HOME_DIR, JAR_NAME);
export const JAVA_COMMAND = "java -cp";
export const MAIN_CLASS = "com.mulesoft.tools.SecurePropertiesTool";
export const JAR_DOWNLOAD_URL =
  "https://docs.mulesoft.com/mule-runtime/latest/_attachments/secure-properties-tool-j17.jar";

export interface Preferences {
  defaultPassword: string;
}

// Supported algorithms according to the documentation
export const ALGORITHMS = [
  { value: "Blowfish", label: "Blowfish" },
  { value: "AES", label: "AES (default in docs)" },
  { value: "DES", label: "DES" },
  { value: "DESede", label: "DESede" },
  { value: "RC2", label: "RC2" },
  { value: "RCA", label: "RCA" },
];

// Supported modes according to the documentation
export const MODES = [
  { value: "CBC", label: "CBC (default)" },
  { value: "CFB", label: "CFB" },
  { value: "ECB", label: "ECB" },
  { value: "OFB", label: "OFB" },
];

// Form validation error messages
export const ERROR_MESSAGES = {
  REQUIRED_INPUT: "Input text is required.",
  REQUIRED_PASSWORD: "Password is required.",
  JAR_DOWNLOAD_FAILED: "Failed to download the encryption tool JAR file.",
  PASSWORD_NOT_SET: "No password provided. Please enter a password or set a default in preferences.",
};

// Success messages
export const SUCCESS_MESSAGES = {
  JAR_DOWNLOADED: "secure-properties-tool.jar has been downloaded successfully.",
  ENCRYPT_SUCCESS: "Successfully encrypted and copied to clipboard:",
  DECRYPT_SUCCESS: "Successfully decrypted and copied to clipboard:",
};

// Common error patterns to provide helpful user messages
export const ERROR_PATTERNS = [
  {
    pattern: "Input length must be multiple of 8",
    message:
      "The encrypted text might be missing padding or is incomplete. Please ensure you're using the complete encrypted string.",
  },
  {
    pattern: "Input byte array has wrong",
    message:
      "The text doesn't appear to be in the correct format. Please ensure you're using a properly encrypted string.",
  },
  { pattern: "Base64", message: "Invalid Base64 encoding. Please ensure you're using a properly encrypted string." },
  {
    pattern: "Given final block not properly padded",
    message: "This may indicate an incorrect password or corrupted encrypted text.",
  },
  {
    pattern: "Illegal key size",
    message: "The key size is not supported. For AES, the key must be 32 characters long.",
  },
];

// Common field defaults for both encrypt and decrypt
export const FIELD_DEFAULTS = {
  algorithm: "Blowfish", // Default value for your app
  mode: "CBC",
  useRandomIV: false,
};
