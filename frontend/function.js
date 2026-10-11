/* =========================================================
   Hawkeye login: behaviour
   Demo login: any non-empty User ID + password signs in.
   ========================================================= */

// Where to go after a successful login. Leave "" to stay on this page.
const REDIRECT_URL = "dashboard.html";

const SIGN_IN_DELAY = 1000; // ms, simulated server wait
const TOAST_TIME = 4000;    // ms, how long a toast stays on screen
const REDIRECT_DELAY = 1800; // ms, wait so the user can read the success toast

const form = document.getElementById("login-form");
const userInput = document.getElementById("user-id");
const passInput = document.getElementById("password");
const peekBtn = document.getElementById("toggle-password");
const iconEye = document.getElementById("icon-eye");
const iconEyeOff = document.getElementById("icon-eye-off");
const submitBtn = document.getElementById("submit-btn");
const submitLabel = document.getElementById("submit-label");
const submitArrow = document.getElementById("submit-arrow");
const spinner = document.getElementById("spinner");
const toastStack = document.getElementById("toast-stack");

/* ---------- Password peek ---------- */
peekBtn.addEventListener("click", () => {
  const show = passInput.type === "password";
  passInput.type = show ? "text" : "password";
  iconEye.hidden = show;
  iconEyeOff.hidden = !show;
  peekBtn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  peekBtn.setAttribute("aria-pressed", String(show));
  passInput.focus();
});

/* ---------- Toast (top right) ---------- */
const ICONS = {
  success:
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  error:
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>',
  close:
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
};

let toastTimer = null;

function removeToast(toast) {
  if (!toast || !toast.isConnected) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    toast.remove();
    return;
  }
  toast.classList.add("leaving");
  toast.addEventListener("animationend", () => toast.remove(), { once: true });
}

function showToast(type, title, message) {
  // Only one toast at a time
  clearTimeout(toastTimer);
  toastStack.replaceChildren();

  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.style.setProperty("--toast-time", TOAST_TIME + "ms");
  toast.setAttribute("role", type === "error" ? "alert" : "status");

  const iconWrap = document.createElement("div");
  iconWrap.className = "toast-icon";
  iconWrap.innerHTML = ICONS[type]; // static markup only

  const body = document.createElement("div");
  const h = document.createElement("p");
  h.className = "toast-title";
  h.textContent = title;
  const p = document.createElement("p");
  p.className = "toast-text";
  p.textContent = message; // textContent keeps user input safe
  body.append(h, p);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "Dismiss notification");
  closeBtn.innerHTML = ICONS.close;
  closeBtn.addEventListener("click", () => {
    clearTimeout(toastTimer);
    removeToast(toast);
  });

  const timer = document.createElement("div");
  timer.className = "toast-timer";

  toast.append(iconWrap, body, closeBtn, timer);
  toastStack.append(toast);

  toastTimer = setTimeout(() => removeToast(toast), TOAST_TIME);
}

/* ---------- Loading state on the Continue button ---------- */
function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  spinner.hidden = !isLoading;
  submitArrow.hidden = isLoading;
  submitLabel.textContent = isLoading ? "Signing in" : "Continue";
}

/* ---------- Submit ---------- */
form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (submitBtn.disabled) return;

  const userId = userInput.value.trim();
  const password = passInput.value;

  if (!userId || !password) {
    showToast("error", "Details missing", "Enter both your User ID and password to continue.");
    (!userId ? userInput : passInput).focus();
    return;
  }

  setLoading(true);

  setTimeout(() => {
    setLoading(false);
    showToast("success", "Login successful", "Welcome back, " + userId + ". Your accounts are ready to review.");

    // Remember who signed in so the dashboard can greet them
    try {
      sessionStorage.setItem("hawkeye_user", userId);
    } catch (err) {
      /* storage can be blocked; the greeting is optional */
    }

    if (REDIRECT_URL) {
      setTimeout(() => {
        window.location.href = REDIRECT_URL;
      }, REDIRECT_DELAY);
    }
  }, SIGN_IN_DELAY);
});
