const form = document.getElementById("transform-form");
const urlInput = document.getElementById("url-input");
const transformButton = document.getElementById("transform-button");

const resultBox = document.getElementById("result-box");
const resultLink = document.getElementById("result-link");
const resultMessage = document.getElementById("result-message");
const errorMessage = document.getElementById("error-message");
const copyButton = document.getElementById("copy-button");

const STORAGE_KEY = "linkora_transformed_links";

// Read demo mappings saved in this browser.
function getLinks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const links = saved ? JSON.parse(saved) : {};

    return links && typeof links === "object" && !Array.isArray(links)
      ? links
      : {};
  } catch {
    return {};
  }
}

function saveLinks(links) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
    return true;
  } catch {
    return false;
  }
}

// Accept paresh.xyz or a complete HTTP/HTTPS URL.
function normalizeUrl(value) {
  let input = value.trim();

  if (!input) {
    throw new Error("Please enter a website URL.");
  }

  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input)) {
    input = "https://" + input;
  }

  let parsed;

  try {
    parsed = new URL(input);
  } catch {
    throw new Error("That URL doesn't look valid. Please check it.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP and HTTPS website links are supported.");
  }

  if (
    !parsed.hostname.includes(".") ||
    parsed.hostname.startsWith(".") ||
    parsed.hostname.endsWith(".") ||
    !parsed.hostname.includes(" ")
  ) {
    // A hostname containing a space is invalid.
    if (
      !parsed.hostname.includes(".") ||
      parsed.hostname.startsWith(".") ||
      parsed.hostname.endsWith(".") ||
      parsed.hostname.includes(" ")
    ) {
      throw new Error("Please enter a valid website address, such as paresh.xyz.");
    }
  }

  if (parsed.username || parsed.password) {
    throw new Error("URLs containing login credentials aren't supported.");
  }

  return parsed.href;
}

// Generate a random code for the demo.
function generateCode() {
  const characters =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    byte => characters[byte % characters.length]
  ).join("");
}

// Build a link on the current site.
// This is a demo URL, not a hosted redirect service.
function buildTransformedUrl(code) {
  const url = new URL(window.location.href);

  url.search = "";
  url.hash = "";
  url.searchParams.set("go", code);

  return url.href;
}

function displayError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = false;
}

function clearError() {
  errorMessage.textContent = "";
  errorMessage.hidden = true;
}

function resetResult() {
  resultBox.hidden = true;
  resultLink.removeAttribute("href");
  resultLink.textContent = "";
  resultMessage.textContent = "";
  copyButton.textContent = "Copy link";
}

function displayResult(url) {
  resultLink.href = url;
  resultLink.textContent = url;

  resultMessage.textContent =
    "Demo only: this link works in the browser where it was generated. Connect a backend and deploy Linkora to make it shareable.";

  resultBox.hidden = false;
}

// Transform a URL.
form.addEventListener("submit", event => {
  event.preventDefault();

  clearError();
  resetResult();

  let originalUrl;

  try {
    originalUrl = normalizeUrl(urlInput.value);
  } catch (error) {
    displayError(error.message);
    return;
  }

  const links = getLinks();

  let code;

  do {
    code = generateCode();
  } while (Object.prototype.hasOwnProperty.call(links, code));

  links[code] = {
    destination: originalUrl,
    createdAt: new Date().toISOString()
  };

  if (!saveLinks(links)) {
    displayError(
      "Couldn't save the link in this browser. Check your browser storage settings."
    );
    return;
  }

  displayResult(buildTransformedUrl(code));
});

// Copy the transformed URL.
copyButton.addEventListener("click", async () => {
  const value = resultLink.href;

  if (!value) return;

  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Fallback for browsers that don't support the Clipboard API.
    const temporaryInput = document.createElement("textarea");

    temporaryInput.value = value;
    temporaryInput.style.position = "fixed";
    temporaryInput.style.opacity = "0";

    document.body.appendChild(temporaryInput);
    temporaryInput.select();

    const copied = document.execCommand("copy");
    temporaryInput.remove();

    if (!copied) {
      resultMessage.textContent =
        "Automatic copying failed. Select the link and copy it manually.";
      return;
    }
  }

  copyButton.textContent = "Copied ✓";
});

// Handle demo links opened in this same browser.
function handleTransformedLink() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("go");

  if (!code) return;

  const links = getLinks();
  const record = links[code];

  let destination;

  try {
    destination = new URL(record?.destination);
  } catch {
    showUnavailablePage();
    return;
  }

  if (!["http:", "https:"].includes(destination.protocol)) {
    showUnavailablePage();
    return;
  }

  // A real deployment should resolve this code on the backend.
  document.body.replaceChildren();

  const page = document.createElement("main");

  Object.assign(page.style, {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
    background: "#080b0a",
    color: "#f3f5f1"
  });

  const content = document.createElement("div");
  const heading = document.createElement("h1");
  const message = document.createElement("p");
  const continueLink = document.createElement("a");

  heading.textContent = "Opening your destination...";
  heading.style.color = "#c1ff72";

  message.textContent =
    "You're leaving Linkora and opening the original website.";

  message.style.color = "#929a92";
  message.style.margin = "16px 0";

  continueLink.textContent = "Continue to destination";
  continueLink.href = destination.href;
  continueLink.style.color = "#c1ff72";
  continueLink.rel = "noopener noreferrer";

  content.append(heading, message, continueLink);
  page.appendChild(content);
  document.body.appendChild(page);

  window.location.replace(destination.href);
}

function showUnavailablePage() {
  document.body.replaceChildren();

  const page = document.createElement("main");

  Object.assign(page.style, {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
    background: "#080b0a",
    color: "#f3f5f1"
  });

  const content = document.createElement("div");
  const heading = document.createElement("h1");
  const message = document.createElement("p");
  const homeLink = document.createElement("a");

  heading.textContent = "Link unavailable";
  heading.style.color = "#c1ff72";

  message.textContent =
    "This demo link isn't saved in this browser.";

  message.style.margin = "16px 0";
  message.style.color = "#929a92";

  homeLink.textContent = "Back to Linkora";
  homeLink.href = window.location.pathname;
  homeLink.style.color = "#c1ff72";

  content.append(heading, message, homeLink);
  page.appendChild(content);
  document.body.appendChild(page);
}

// Clear previous results when the input changes.
urlInput.addEventListener("input", () => {
  clearError();
  resetResult();
  transformButton.querySelector("span").textContent = "Transform URL";
});

handleTransformedLink();
