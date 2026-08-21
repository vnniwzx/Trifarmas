const STORAGE_KEY = "trifarmas_accounts_v2";
const USER_KEY = "trifarmas_current_user_v2";

let selectedMedicineType = "comprimido";
let selectedDate = new Date();
selectedDate.setHours(0, 0, 0, 0);
let calendarDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);

const medicineData = {
  comprimido: [
    { name: "Dipirona 500mg", prices: [["R$18,90", "Pague Menos"], ["R$22,50", "Drogasil"], ["R$24,90", "Droga Raia"]] },
    { name: "Ibuprofeno 600mg", prices: [["R$35,40", "Drogasil"], ["R$37,90", "Panvel"], ["R$39,50", "Pague Menos"]] },
    { name: "Dorflex 36 comprimidos", prices: [["R$35,00", "Ultrafarma"], ["R$38,90", "Drogaria São Paulo"], ["R$41,20", "Droga Raia"]] },
    { name: "Amoxicilina 500mg", prices: [["R$67,09", "Drogasil"], ["R$68,89", "Droga Raia"], ["R$70,19", "Ultrafarma"]] },
    { name: "Paracetamol 750mg", prices: [["R$12,90", "Pague Menos"], ["R$14,50", "Drogasil"], ["R$15,99", "Panvel"]] }
  ],
  liquido: [
    { name: "Dipirona Gotas 500mg/mL", prices: [["R$14,90", "Pague Menos"], ["R$16,50", "Drogasil"], ["R$17,90", "Panvel"]] },
    { name: "Paracetamol Gotas", prices: [["R$11,90", "Drogasil"], ["R$13,40", "Droga Raia"], ["R$14,20", "Ultrafarma"]] },
    { name: "Xarope Expectorante", prices: [["R$28,90", "Drogaria São Paulo"], ["R$30,50", "Panvel"], ["R$32,00", "Pague Menos"]] }
  ],
  pomada: [
    { name: "Nebacetin Pomada", prices: [["R$19,90", "Drogasil"], ["R$21,50", "Droga Raia"], ["R$22,90", "Panvel"]] },
    { name: "Nistatina Pomada", prices: [["R$15,90", "Pague Menos"], ["R$17,30", "Drogasil"], ["R$18,40", "Ultrafarma"]] },
    { name: "Pomada para Assaduras", prices: [["R$22,90", "Panvel"], ["R$24,50", "Drogaria São Paulo"], ["R$26,00", "Drogasil"]] }
  ]
};

function getAccounts() { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
function saveAccounts(accounts) { localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts)); }
function getCurrentUser() { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
function setCurrentUser(user) { localStorage.setItem(USER_KEY, JSON.stringify(user)); }

function validEmail(email) { return /^[^\s@]+@gmail\.com$/i.test(email.trim()); }
function validPassword(password) { return /[0-9]/.test(password) && /[^A-Za-z0-9\s]/.test(password); }

function showMessage(id, text, ok = false) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = "form-message " + (ok ? "success" : "error");
}

function register() {
  const name = document.getElementById("register-name").value.trim() || "Usuário";
  const email = document.getElementById("register-email").value.trim().toLowerCase();
  const password = document.getElementById("register-pass").value;
  if (!validEmail(email)) return showMessage("register-message", "Use obrigatoriamente um endereço terminado em @gmail.com.");
  if (!validPassword(password)) return showMessage("register-message", "A senha precisa ter pelo menos 1 número e 1 caractere especial.");
  const accounts = getAccounts();
  if (accounts.some(a => a.email === email)) return showMessage("register-message", "Esta conta já foi criada. Faça login.");
  accounts.push({ name, email, password, reminders: [] });
  saveAccounts(accounts);
  showMessage("register-message", "Conta criada com sucesso! Agora você já pode entrar.", true);
  document.getElementById("login-email").value = email;
  setTimeout(() => switchScreen("login-screen"), 800);
}

function login() {
  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-pass").value;
  if (!validEmail(email)) return showMessage("login-message", "Digite um e-mail válido terminado em @gmail.com.");
  if (!validPassword(password)) return showMessage("login-message", "A senha precisa ter pelo menos 1 número e 1 caractere especial.");
  const account = getAccounts().find(a => a.email === email && a.password === password);
  if (!account) return showMessage("login-message", "E-mail ou senha incorretos, ou a conta ainda não foi criada.");
  setCurrentUser(account);
  updateUserUI();
  switchScreen("home-screen");
}

function updateUserUI() {
  const user = getCurrentUser();
  if (!user) return;
  document.getElementById("user-display-name").textContent = user.name;
  document.getElementById("input-username").value = user.name;
}

function saveUsername() {
  const name = document.getElementById("input-username").value.trim();
  if (!name) return alert("Digite um nome válido.");
  const user = getCurrentUser(); if (!user) return;
  const accounts = getAccounts();
  const index = accounts.findIndex(a => a.email === user.email);
  accounts[index].name = name;
  saveAccounts(accounts); setCurrentUser(accounts[index]); updateUserUI();
  alert("Nome atualizado com sucesso!");
}

function switchScreen(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(screenId); if (target) target.classList.add("active");
  const header = document.getElementById("app-header"), camera = document.getElementById("camera-fab");
  document.querySelectorAll(".top-nav button").forEach(b => b.classList.remove("active-nav"));
  const auth = screenId === "login-screen" || screenId === "register-screen";
  header.classList.toggle("hidden", auth); camera.classList.toggle("hidden", auth);
  if (screenId === "home-screen") document.getElementById("nav-home").classList.add("active-nav");
  if (screenId === "prices-screen") document.getElementById("nav-prices").classList.add("active-nav");
  if (screenId === "calendar-screen") { document.getElementById("nav-calendar").classList.add("active-nav"); renderCalendar(); renderReminders(); }
}
function toggleSidebar() { document.getElementById("sidebar").classList.toggle("active"); document.getElementById("overlay").classList.toggle("active"); }
function logout() { if (document.getElementById("sidebar").classList.contains("active")) toggleSidebar(); localStorage.removeItem(USER_KEY); switchScreen("login-screen"); }
function openGoogleMaps(address) { window.open("https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(address), "_blank"); }

function setMedicineType(type, button) {
  selectedMedicineType = type;
  document.querySelectorAll(".type-chip").forEach(b => b.classList.remove("active-type")); button.classList.add("active-type");
  document.getElementById("search-med").value = "";
  document.getElementById("suggestions").innerHTML = "";
  document.getElementById("price-card-inner").classList.add("hidden");
  document.getElementById("selected-medicine-title").textContent = "Pesquise um medicamento";
}
function showSuggestions() { searchMedicines(); }
function searchMedicines() {
  const input = document.getElementById("search-med").value.trim().toLowerCase();
  const box = document.getElementById("suggestions");
  const matches = input ? medicineData[selectedMedicineType].filter(m => m.name.toLowerCase().includes(input)) : [];
  box.innerHTML = "";
  if (!input) { box.classList.add("hidden"); return; }
  if (!matches.length) { box.innerHTML = '<div class="no-result">Nenhuma sugestão encontrada.</div>'; box.classList.remove("hidden"); return; }
  matches.forEach(m => {
    const item = document.createElement("button"); item.className = "suggestion-item";
    item.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> ' + m.name;
    item.onclick = () => selectMedicine(m); box.appendChild(item);
  });
  box.classList.remove("hidden");
}
function selectMedicine(medicine) {
  document.getElementById("search-med").value = medicine.name;
  document.getElementById("suggestions").classList.add("hidden");
  document.getElementById("selected-medicine-title").textContent = medicine.name;
  const list = document.getElementById("price-list"); list.innerHTML = "";
  medicine.prices.forEach(([price, pharmacy], i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="price-value">${price}</span><span class="price-name">${i === 0 ? "Melhor preço" : medicine.name}</span><span class="pharmacy-badge"><span class="pharmacy-logo-placeholder">ÍCONE</span>${pharmacy}</span>`;
    list.appendChild(li);
  });
  document.getElementById("price-card-inner").classList.remove("hidden");
}

function dateKey(date) { return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0"); }
function monthName(d) { return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }).replace(/^./, c => c.toUpperCase()); }
function formatDate(d) { return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).replace(/^./, c => c.toUpperCase()); }
function getReminders() { const u = getCurrentUser(); return u?.reminders || []; }
function saveReminders(reminders) {
  const user = getCurrentUser(); if (!user) return;
  user.reminders = reminders; const accounts = getAccounts(); const i = accounts.findIndex(a => a.email === user.email);
  accounts[i] = user; saveAccounts(accounts); setCurrentUser(user);
}
function renderCalendar() {
  document.getElementById("calendar-month").textContent = monthName(calendarDate);
  const grid = document.getElementById("calendar-grid"); grid.innerHTML = "";
  const year = calendarDate.getFullYear(), month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay(), days = new Date(year, month + 1, 0).getDate();
  const reminders = getReminders();
  for (let i = 0; i < firstDay; i++) { const blank = document.createElement("div"); blank.className = "calendar-day empty"; grid.appendChild(blank); }
  for (let day = 1; day <= days; day++) {
    const date = new Date(year, month, day), key = dateKey(date), cell = document.createElement("button");
    cell.className = "calendar-day"; cell.textContent = day;
    if (key === dateKey(new Date())) cell.classList.add("today");
    if (key === dateKey(selectedDate)) cell.classList.add("selected");
    if (reminders.some(r => r.date === key)) { const dot = document.createElement("span"); dot.className = "reminder-dot"; cell.appendChild(dot); }
    cell.onclick = () => { selectedDate = date; selectedDate.setHours(0, 0, 0, 0); document.getElementById("selected-date-label").textContent = formatDate(selectedDate); renderCalendar(); renderReminders(); };
    grid.appendChild(cell);
  }
  document.getElementById("selected-date-label").textContent = formatDate(selectedDate);
}
function changeMonth(amount) { calendarDate.setMonth(calendarDate.getMonth() + amount); renderCalendar(); }
function goToday() { selectedDate = new Date(); selectedDate.setHours(0, 0, 0, 0); calendarDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1); renderCalendar(); renderReminders(); }
function addReminder() {
  const medName = document.getElementById("med-name").value.trim(), medTime = document.getElementById("med-time").value;
  if (!medName || !medTime) return alert("Preencha o nome e o horário do medicamento.");
  const reminders = getReminders(); reminders.push({ id: Date.now(), date: dateKey(selectedDate), medName, medTime });
  reminders.sort((a, b) => a.date.localeCompare(b.date) || a.medTime.localeCompare(b.medTime)); saveReminders(reminders);
  document.getElementById("med-name").value = ""; document.getElementById("med-time").value = "";
  renderCalendar(); renderReminders();
}
function removeReminder(id) { saveReminders(getReminders().filter(r => r.id !== id)); renderCalendar(); renderReminders(); }
function renderReminders() {
  const list = document.getElementById("reminder-list"), key = dateKey(selectedDate), items = getReminders().filter(r => r.date === key).sort((a, b) => a.medTime.localeCompare(b.medTime));
  document.getElementById("reminder-count").textContent = items.length;
  list.innerHTML = items.length ? "" : '<li class="empty-reminder">Nenhum lembrete para este dia.</li>';
  items.forEach(item => { list.innerHTML += `<li><div><i class="fa-solid fa-pills"></i><span><strong>${item.medTime}</strong> · ${item.medName}</span></div><button class="btn-delete-reminder" onclick="removeReminder(${item.id})"><i class="fa-solid fa-trash"></i></button></li>`; });
}
function openScanner() { document.getElementById("scanner-modal").classList.remove("hidden"); }
function closeScanner() { document.getElementById("scanner-modal").classList.add("hidden"); }
function simulateScan() { closeScanner(); switchScreen("prices-screen"); selectedMedicineType = "comprimido"; document.querySelectorAll(".type-chip").forEach((b, i) => b.classList.toggle("active-type", i === 0)); document.getElementById("search-med").value = "Amoxicilina"; searchMedicines(); }

window.addEventListener("DOMContentLoaded", () => {
  updateUserUI(); renderCalendar();
  setTimeout(() => { document.getElementById("splash-screen").classList.add("hide-splash"); const user = getCurrentUser(); if (user) { switchScreen("home-screen"); } else { switchScreen("login-screen"); } }, 3000);
});
