const API_BASE = String(window.RYANDEV_API_BASE || "").replace(/\/+$/, "");

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const messageList = document.getElementById("messageList");
const messageDetail = document.getElementById("messageDetail");

const TOKEN_KEY = "ryandev_admin_token";
let token = sessionStorage.getItem(TOKEN_KEY) || "";
let messages = [];
let selectedId = null;

function saveToken(value) {
  token = value;
  if (value) sessionStorage.setItem(TOKEN_KEY, value);
  else sessionStorage.removeItem(TOKEN_KEY);
}

function apiUrl(path) {
  if (!API_BASE) throw new Error("The messaging API has not been configured.");
  return `${API_BASE}${path}`;
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(apiUrl(path), {
    ...options,
    headers
  });

  const data = response.status === 204
    ? {}
    : await response.json().catch(() => ({}));

  if (response.status === 401 && path !== "/api/admin/login") {
    saveToken("");
  }

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function showLogin() {
  loginView.hidden = false;
  dashboardView.hidden = true;
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function prettyDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function renderStats(stats = {}) {
  const safeStats = stats && typeof stats === "object" ? stats : {};

  const isRead = (message) =>
    message.is_read === true ||
    message.is_read === 1 ||
    message.is_read === "true";

  const totalFallback = messages.length;
  const unreadFallback = messages.filter((message) => !isRead(message)).length;
  const readFallback = messages.filter(isRead).length;

  const getCount = (value, fallback) =>
    value !== undefined &&
    value !== null &&
    Number.isFinite(Number(value))
      ? Number(value)
      : fallback;

  const total = getCount(safeStats.total, totalFallback);
  const unread = getCount(safeStats.unread, unreadFallback);
  const read = getCount(safeStats.read, readFallback);

  const totalElement = document.getElementById("totalCount");
  const unreadElement = document.getElementById("unreadCount");
  const readElement = document.getElementById("readCount");

  if (totalElement) totalElement.textContent = String(total);
  if (unreadElement) unreadElement.textContent = String(unread);
  if (readElement) readElement.textContent = String(read);
}

function renderList() {
  messageList.replaceChildren();

  if (!messages.length) {
    messageList.append(el(
      "p",
      "admin-empty",
      "No messages yet. New contact form submissions will appear here."
    ));
    return;
  }

  messages.forEach((message) => {
    const button = el(
      "button",
      `admin-message-item${message.is_read ? "" : " unread"}${message.id === selectedId ? " selected" : ""}`
    );

    button.type = "button";
    button.append(
      el("strong", "", message.name),
      el("small", "", message.subject),
      el("small", "", prettyDate(message.created_at))
    );
    button.addEventListener("click", () => selectMessage(message.id));
    messageList.append(button);
  });
}

function renderDetail(message) {
  messageDetail.replaceChildren();
  messageDetail.append(el("p", "eyebrow", `MESSAGE #${message.id}`));
  messageDetail.append(el("h2", "", message.subject));

  const meta = el("div", "admin-detail-meta");
  meta.append(
    el("span", "", message.name),
    el("span", "", message.email),
    el("span", "", message.phone),
    el("span", "", prettyDate(message.created_at))
  );
  messageDetail.append(meta);

  const body = el("p", "", message.message);
  body.style.marginTop = "24px";
  messageDetail.append(body);

  const label = el("label", "", "WHATSAPP REPLY");
  label.style.cssText =
    "display:block;color:var(--gold-light);font:10px 'Space Mono',monospace;margin-top:22px";

  const reply = document.createElement("textarea");
  reply.className = "admin-input";
  reply.rows = 4;
  reply.value =
    `Hi ${message.name}, thanks for contacting RyanDev about "${message.subject}". I've received your message and would be happy to discuss it further.`;

  label.append(reply);
  messageDetail.append(label);

  const actions = el("div", "admin-detail-actions");
  const whatsapp = el("a", "btn btn-gold", "Open WhatsApp ↗");
  const digits = message.phone.replace(/\D/g, "");

  whatsapp.href =
    `https://wa.me/${digits}?text=${encodeURIComponent(reply.value)}`;
  whatsapp.target = "_blank";
  whatsapp.rel = "noopener noreferrer";

  reply.addEventListener("input", () => {
    whatsapp.href =
      `https://wa.me/${digits}?text=${encodeURIComponent(reply.value)}`;
  });

  const copyEmail = el("a", "admin-btn", "Email visitor ↗");
  copyEmail.href =
    `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent("Re: " + message.subject)}`;

  const remove = el("button", "admin-btn", "Delete message");
  remove.type = "button";

  remove.addEventListener("click", async () => {
    if (!window.confirm("Permanently delete this message?")) return;

    try {
      await api(`/api/admin/messages/${message.id}`, { method: "DELETE" });
      selectedId = null;
      await loadMessages();
      messageDetail.replaceChildren(el("p", "admin-empty", "Message deleted."));
    } catch (error) {
      window.alert(error.message);
    }
  });

  actions.append(whatsapp, copyEmail, remove);
  messageDetail.append(actions);
}

async function selectMessage(id) {
  selectedId = id;
  let message = messages.find((item) => item.id === id);
  if (!message) return;

  if (!message.is_read) {
    try {
      await api(`/api/admin/messages/${id}/read`, { method: "PATCH" });
      message.is_read = true;

      const data = await api("/api/admin/messages");
      messages = data.messages;
      renderStats(data.stats);
    } catch (error) {
      console.error(error);
    }
  }

  renderList();
  message = messages.find((item) => item.id === id);
  if (message) renderDetail(message);
}

async function loadMessages() {
  const data = await api("/api/admin/messages");
  messages = data.messages;
  renderStats(data.stats);
  renderList();

  if (selectedId && messages.some((item) => item.id === selectedId)) {
    renderDetail(messages.find((item) => item.id === selectedId));
  } else if (!selectedId) {
    messageDetail.replaceChildren(
      el("p", "eyebrow", "MESSAGE DETAILS"),
      el("h2", "", "Select a message"),
      el("p", "", "Choose a message from your inbox to read it and prepare a reply.")
    );
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";

  const button = document.getElementById("loginButton");
  button.disabled = true;

  try {
    const data = await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("username").value,
        password: document.getElementById("password").value
      })
    });

    if (!data.token) throw new Error("The server did not return an authentication token.");

    saveToken(data.token);
    selectedId = null;
    await loadMessages();
    showDashboard();
  } catch (error) {
    saveToken("");
    loginError.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

document.getElementById("refreshButton").addEventListener("click", () => {
  loadMessages().catch((error) => window.alert(error.message));
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  try {
    await api("/api/admin/logout", { method: "POST" });
  } catch (error) {
    console.warn(error);
  }

  saveToken("");
  selectedId = null;
  messages = [];
  loginForm.reset();
  showLogin();
});

(async function init() {
  if (!token) {
    showLogin();
    return;
  }

  try {
    await loadMessages();
    showDashboard();
  } catch (_) {
    saveToken("");
    showLogin();
  }
})();
