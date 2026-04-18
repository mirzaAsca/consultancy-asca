export type FormSubmitStatus = "sent" | "activation_required" | "error";

export type FormSubmitResult = {
  status: FormSubmitStatus;
  message: string;
};

const FORM_SUBMIT_ENDPOINT = "https://formsubmit.co/ajax/mirza@flyrank.com";
const activationPattern = /needs Activation|Activate Form/i;
const CANONICAL_SUBMISSION_URL = "https://www.mirza-asceric.com/";
const supportedSubmissionHosts = new Set([
  "www.mirza-asceric.com",
  "mirza-asceric.com",
  "consultancy-asca.vercel.app",
  "localhost",
  "127.0.0.1",
]);

function appendSubmissionSource(formData: FormData): void {
  if (typeof window === "undefined") {
    return;
  }

  const { hostname, href, origin } = window.location;
  const sourceUrl = supportedSubmissionHosts.has(hostname) ? href : origin;

  if (!formData.has("_url")) {
    formData.append("_url", CANONICAL_SUBMISSION_URL);
  }

  formData.append("Submission domain", hostname);
  formData.append("Submission URL", sourceUrl);
  formData.append("Submission origin", origin);
}

export async function submitFormToInbox(
  fields: Record<string, string>,
): Promise<FormSubmitResult> {
  const formData = new FormData();

  Object.entries(fields).forEach(([key, rawValue]) => {
    const value = rawValue.trim();
    if (value) {
      formData.append(key, value);
    }
  });

  appendSubmissionSource(formData);

  formData.append("_template", "table");

  try {
    const response = await fetch(FORM_SUBMIT_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as
      | { success?: boolean | string; message?: string }
      | null;

    const message =
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message
        : "Unable to submit the form right now.";

    if (activationPattern.test(message)) {
      return {
        status: "activation_required",
        message,
      };
    }

    if (payload?.success === true || payload?.success === "true") {
      return {
        status: "sent",
        message,
      };
    }

    if (!response.ok) {
      return {
        status: "error",
        message,
      };
    }

    return {
      status: "error",
      message,
    };
  } catch {
    return {
      status: "error",
      message:
        "Network error while sending the form. Please try again in a moment.",
    };
  }
}
