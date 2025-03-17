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
import {
  buildCommandParams,
  cleanEncryptedText,
  doesJarExist,
  downloadJar,
  handleOperationError,
  runShellScript,
} from "./utils";

interface DecryptionForm {
  encryptedText: string;
  password?: string;
  algorithm: string;
  mode: string;
  stripWrapper: boolean;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  const { handleSubmit, itemProps, values, reset } = useForm<DecryptionForm>({
    initialValues: {
      algorithm: FIELD_DEFAULTS.algorithm,
      mode: FIELD_DEFAULTS.mode,
      stripWrapper: true,
    },
    async onSubmit(values) {
      const { encryptedText, password, algorithm, mode, stripWrapper } = values;

      if (!encryptedText) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Validation Error",
          message: ERROR_MESSAGES.REQUIRED_INPUT,
        });
        return;
      }

      try {
        // Process the encrypted text based on user preference
        const processedText = stripWrapper ? cleanEncryptedText(encryptedText) : encryptedText;

        const jarExists = await doesJarExist();

        if (!jarExists) {
          await downloadJar();

          await showToast({
            style: Toast.Style.Success,
            title: "Download Complete",
            message: SUCCESS_MESSAGES.JAR_DOWNLOADED,
          });
        }

        const decryptionPassword = password || preferences.defaultPassword;

        if (!decryptionPassword) {
          await showHUD(ERROR_MESSAGES.PASSWORD_NOT_SET);
          await openExtensionPreferences();
          return;
        }

        // Build command parameters using the helper function
        const decryptionParams = buildCommandParams("decrypt", processedText, decryptionPassword, algorithm, mode);

        const command = `cd "${HOME_DIR}" && ${JAVA_COMMAND} "${JAR_PATH}" ${MAIN_CLASS} ${decryptionParams}`;
        const output = await runShellScript(command);

        await Clipboard.copy(output);
        console.log("Decryption output:", output);

        await showHUD(`👌 ${SUCCESS_MESSAGES.DECRYPT_SUCCESS} ${output}`);

        reset();
        await closeMainWindow();
      } catch (error) {
        await handleOperationError(error, "Decryption");
      }
    },
    validation: {
      encryptedText: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decrypt Text" onSubmit={handleSubmit} />
          <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          <Action
            title="View Decryption Help"
            onAction={() => {
              showToast({
                style: Toast.Style.Animated,
                title: "Decryption Help",
                message: "Paste the complete encrypted string. The decrypted result will be copied to your clipboard.",
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Encrypted Text" placeholder="Paste the encrypted text here" {...itemProps.encryptedText} />

      <Form.TextField
        title="Password"
        placeholder={preferences.defaultPassword ? "Using default password if empty" : "Enter decryption password"}
        {...itemProps.password}
      />

      <Form.Dropdown
        title="Decryption Algorithm"
        info="Select the algorithm used during encryption"
        {...itemProps.algorithm}
      >
        {ALGORITHMS.map((algo) => (
          <Form.Dropdown.Item key={algo.value} value={algo.value} title={algo.label} />
        ))}
      </Form.Dropdown>

      <Form.Dropdown title="Decryption Mode" info="Select the mode used during encryption" {...itemProps.mode}>
        {MODES.map((mode) => (
          <Form.Dropdown.Item key={mode.value} value={mode.value} title={mode.label} />
        ))}
      </Form.Dropdown>

      <Form.Checkbox
        label="Automatically Strip ![...] Wrapper"
        info="When enabled, automatically removes the ![...] wrapper from encrypted text if present"
        {...itemProps.stripWrapper}
      />

      <Form.Description
        title="Configuration Summary"
        text={`Algorithm: ${values.algorithm} | Mode: ${values.mode} | Auto-strip Wrapper: ${values.stripWrapper ? "Yes" : "No"}`}
      />

      <Form.Separator />

      <Form.Description
        title="Troubleshooting"
        text="If decryption fails, ensure you're using the same algorithm, mode, and password that were used for encryption. For encrypted properties from Mule files, make sure to use the entire encrypted string."
      />
    </Form>
  );
}
