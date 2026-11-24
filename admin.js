const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const messageList = document.getElementById("messageList");
const messageDetail = document.getElementById("messageDetail");
let csrfToken = "";
let messages = [];
let selectedId = null;

async function getCsrf() {
  const response = await fetch("/api/csrf", { credentials: "same-origin" });
  if (!response.ok) throw new Error("Could not start a secure session.");
  const data = await response.json();
  csrfToken = data.csrf_token;
}
async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(options.method && options.method !== "GET" ? { "X-CSRF-Token": csrfToken } : {})
    }
  });
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
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
function renderStats(stats) {
  document.getElementById("totalCount").textContent = stats.total;
  document.getElementById("unreadCount").textContent = stats.unread;
  document.getElementById("readCount").textContent = stats.read;
}
function renderList() {
  messageList.replaceChildren();
  if (!messages.length) {
    messageList.append(el("p", "admin-empty", "No messages yet. New contact form submissions will appear here."));
    return;
  }
  messages.forEach((message) => {
    const button = el("button", `admin-message-item${message.is_read ? "" : " unread"}${message.id === selectedId ? " selected" : ""}`);
    button.type = "button";
    button.append(el("strong", "", message.name), el("small", "", message.subject), el("small", "", prettyDate(message.created_at)));
    button.addEventListener("click", () => selectMessage(message.id));
    messageList.append(button);
  });
}
function renderDetail(message) {
  messageDetail.replaceChildren();
  messageDetail.append(el("p", "eyebrow", `MESSAGE #${message.id}`));
  messageDetail.append(el("h2", "", message.subject));
  const meta = el("div", "admin-detail-meta");
  meta.append(el("span", "", message.name), el("span", "", message.email), el("span", "", message.phone), el("span", "", prettyDate(message.created_at)));
  messageDetail.append(meta);
  const body = el("p", "", message.message);
  body.style.marginTop = "24px";
  messageDetail.append(body);
  const label = el("label", "", "WHATSAPP REPLY");
  label.style.cssText = "display:block;color:var(--gold-light);font:10px 'Space Mono',monospace;margin-top:22px";
  const reply = document.createElement("textarea");
  reply.className = "admin-input";
  reply.rows = 4;
  reply.value = `Hi ${message.name}, thanks for contacting RyanDev about "${message.subject}". I've received your message and would be happy to discuss it further.`;
  label.append(reply);
  messageDetail.append(label);
  const actions = el("div", "admin-detail-actions");
  const whatsapp = el("a", "btn btn-gold", "Open WhatsApp ↗");
  const digits = message.phone.replace(/\D/g, "");
  whatsapp.href = `https://wa.me/${digits}?text=${encodeURIComponent(reply.value)}`;
  whatsapp.target = "_blank";
  whatsapp.rel = "noopener noreferrer";
  reply.addEventListener("input", () => {
    whatsapp.href = `https://wa.me/${digits}?text=${encodeURIComponent(reply.value)}`;
  });
  const copyEmail = el("a", "admin-btn", "Email visitor ↗");
  copyEmail.href = `mailto:${encodeURIComponent(message.email)}?subject=${encodeURIComponent("Re: " + message.subject)}`;
  const remove = el("button", "admin-btn", "Delete message");
  remove.type = "button";
  remove.addEventListener("click", async () => {
    if (!window.confirm("Permanently delete this message?")) return;
    try {
      await api(`/api/admin/messages/${message.id}`, { method: "DELETE" });
      selectedId = null;
      await loadMessages();
      messageDetail.replaceChildren(el("p", "admin-empty", "Message deleted."));
    } catch (error) { window.alert(error.message); }
  });
  actions.append(whatsapp, copyEmail, remove);
  messageDetail.append(actions);
}
async function selectMessage(id) {
  selectedId = id;
  const message = messages.find((item) => item.id === id);
  if (!message) return;
  if (!message.is_read) {
    try {
      await api(`/api/admin/messages/${id}/read`, { method: "PATCH" });
      message.is_read = 1;
      const stats = await api("/api/admin/messages");
      messages = stats.messages;
      renderStats(stats.stats);
    } catch (error) { console.error(error); }
  }
  renderList();
  const current = messages.find((item) => item.id === id);
  if (current) renderDetail(current);
}
async function loadMessages() {
  const data = await api("/api/admin/messages");
  messages = data.messages;
  renderStats(data.stats);
  renderList();
  if (selectedId && messages.some((item) => item.id === selectedId)) {
    renderDetail(messages.find((item) => item.id === selectedId));
  } else if (!selectedId) {
    messageDetail.replaceChildren(el("p", "eyebrow", "MESSAGE DETAILS"), el("h2", "", "Select a message"), el("p", "", "Choose a message from your inbox to read it and prepare a reply."));
  }
}
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const button = document.getElementById("loginButton");
  button.disabled = true;
  try {
    await getCsrf();
    await api("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("username").value,
        password: document.getElementById("password").value
      })
    });
    await getCsrf();
    showDashboard();
    await loadMessages();
  } catch (error) {
    loginError.textContent = error.message;
  } finally { button.disabled = false; }
});
document.getElementById("refreshButton").addEventListener("click", () => loadMessages().catch((e) => window.alert(e.message)));
document.getElementById("logoutButton").addEventListener("click", async () => {
  try { await api("/api/admin/logout", { method: "POST" }); } catch (error) { console.warn(error); }
  selectedId = null;
  showLogin();
  loginForm.reset();
});
(async function init() {
  try {
    await getCsrf();
    const data = await api("/api/admin/messages");
    showDashboard();
    messages = data.messages;
    renderStats(data.stats);
    renderList();
  } catch (_) {
    showLogin();
  }
})();
