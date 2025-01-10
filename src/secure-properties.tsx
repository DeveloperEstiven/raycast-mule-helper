import { Action, ActionPanel, Clipboard, closeMainWindow, Form, showHUD, showToast, Toast } from "@raycast/api";
import { FormValidation, runAppleScript, useForm } from "@raycast/utils";
import fs from "fs";
import { IncomingMessage } from "http";
import https from "https";
import os from "os";
import path from "path";
import { pipeline } from "stream/promises";
import { promisify } from "util";

const unlinkAsync = promisify(fs.unlink);
const HOME_DIR = os.homedir();
const JAR_NAME = "secure-properties-tool.jar";
const JAR_PATH = path.join(HOME_DIR, JAR_NAME);
const JAVA_COMMAND = "java -cp";
const MAIN_CLASS = "com.mulesoft.tools.SecurePropertiesTool";
const ENCRYPTION_PARAMS = "string encrypt Blowfish CBC password";
const JAR_DOWNLOAD_URL = "https://docs.mulesoft.com/mule-runtime/latest/_attachments/secure-properties-tool-j17.jar";

interface SecurePropertiesForm {
  prompt: string;
}

const runShellScript = async (command: string): Promise<string> => {
  try {
    const escapedCommand = command.replace(/(["\n\\])/g, "\\$1");
    const script = `do shell script "${escapedCommand}"`;
    const output = await runAppleScript(script);
    return output;
  } catch (error) {
    console.error("Shell script execution error:", error);
    throw new Error("Failed to execute shell script.");
  }
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred.";
};

const doesJarExist = async (): Promise<boolean> => {
  return fs.promises
    .access(JAR_PATH, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
};

const downloadJar = async (): Promise<void> => {
  const fileStream = fs.createWriteStream(JAR_PATH);

  try {
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
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

export default function Command() {
  const { handleSubmit, itemProps, reset } = useForm<SecurePropertiesForm>({
    async onSubmit(values) {
      const { prompt } = values;

      if (!prompt) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: "Prompt value is required.",
        });
        return;
      }

      try {
        const jarExists = await doesJarExist();

        if (!jarExists) {
          await showToast({
            style: Toast.Style.Animated,
            title: "Downloading JAR",
            message: "secure-properties-tool.jar is missing. Downloading...",
          });

          await downloadJar();

          await showToast({
            style: Toast.Style.Success,
            title: "Download Complete",
            message: "secure-properties-tool.jar has been downloaded successfully.",
          });
        }

        const command = `cd "${HOME_DIR}" && ${JAVA_COMMAND} "${JAR_PATH}" ${MAIN_CLASS} ${ENCRYPTION_PARAMS} "${prompt}"`;
        const output = await runShellScript(command);

        await Clipboard.copy(output);
        console.log("Command output:", output);

        await showHUD("Command executed and result copied to clipboard.");

        reset();
        await closeMainWindow();
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Execution Error",
          message: errorMessage,
        });
      }
    },
    validation: {
      prompt: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Encrypt Prompt" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Prompt String" placeholder="Enter the string to encrypt" {...itemProps.prompt} />
    </Form>
  );
}
