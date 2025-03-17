import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Form,
  getPreferenceValues,
  openExtensionPreferences,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import {
  ALGORITHMS,
  ERROR_MESSAGES,
  FIELD_DEFAULTS,
  HOME_DIR,
  JAR_PATH,
  JAVA_COMMAND,
  MAIN_CLASS,
  MODES,
  Preferences,
  SUCCESS_MESSAGES,
} from "./constants";
import { buildCommandParams, doesJarExist, downloadJar, handleOperationError, runShellScript } from "./utils";

interface EncryptionForm {
  prompt: string;
  password?: string;
  algorithm: string;
  mode: string;
  useRandomIV: boolean;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { handleSubmit, itemProps, values, reset } = useForm<EncryptionForm>({
    initialValues: {
      algorithm: FIELD_DEFAULTS.algorithm,
      mode: FIELD_DEFAULTS.mode,
      useRandomIV: FIELD_DEFAULTS.useRandomIV,
    },
    async onSubmit(values) {
      const { prompt, password, algorithm, mode, useRandomIV } = values;

      if (!prompt) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: ERROR_MESSAGES.REQUIRED_INPUT,
        });
        return;
      }

      try {
        const jarExists = await doesJarExist();

        if (!jarExists) {
          await downloadJar();

          await showToast({
            style: Toast.Style.Success,
            title: "Download Complete",
            message: SUCCESS_MESSAGES.JAR_DOWNLOADED,
          });
        }

        const encryptionPassword = password || preferences.defaultPassword;

        if (!encryptionPassword) {
          await showHUD(ERROR_MESSAGES.PASSWORD_NOT_SET);
          await openExtensionPreferences();
          return;
        }

        // Build command parameters using the helper function
        const encryptionParams = buildCommandParams(
          "encrypt",
          prompt,
          encryptionPassword,
          algorithm,
          mode,
          useRandomIV,
        );

        const command = `cd "${HOME_DIR}" && ${JAVA_COMMAND} "${JAR_PATH}" ${MAIN_CLASS} ${encryptionParams}`;
        const output = await runShellScript(command);

        await Clipboard.copy(output);
        console.log("Encryption output:", output);

        await showHUD(`👌 ${SUCCESS_MESSAGES.ENCRYPT_SUCCESS} ${output}`);

        reset();
        await closeMainWindow();
      } catch (error) {
        await handleOperationError(error, "Encryption");
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
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <Action
            title="View Encryption Help"
            onAction={() => {
              showToast({
                style: Toast.Style.Animated,
                title: "Encryption Help",
                message: "Enter text to encrypt. The result will be copied to your clipboard.",
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Text to Encrypt" placeholder="Enter the string to encrypt" {...itemProps.prompt} />

      <Form.TextField
        title="Password"
        placeholder={preferences.defaultPassword ? "Using default password if empty" : "Enter encryption password"}
        {...itemProps.password}
      />

      <Form.Dropdown
        title="Encryption Algorithm"
        info="Select the algorithm to use for encryption"
        {...itemProps.algorithm}
      >
        {ALGORITHMS.map((algo) => (
          <Form.Dropdown.Item key={algo.value} value={algo.value} title={algo.label} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Encryption Mode" info="Select the mode to use for encryption" {...itemProps.mode}>
        {MODES.map((mode) => (
          <Form.Dropdown.Item key={mode.value} value={mode.value} title={mode.label} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        label="Use Random Initialization Vector (IV)"
        info="When enabled, a random IV will be used for encryption (recommended for better security)"
        {...itemProps.useRandomIV}
      />

      <Form.Description
        title="Configuration Summary"
        text={`Algorithm: ${values.algorithm} | Mode: ${values.mode} | Random IV: ${values.useRandomIV ? "Yes" : "No"}`}
      />

      <Form.Separator />

      <Form.Description
        title="Note"
        text="The encrypted string will be copied to your clipboard. For decryption, use the entire encrypted string exactly as generated."
      />
    </Form>
  );
}
