// Navegação e Controle de Abas Ativas
function switchScreen(screenId) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) targetScreen.classList.add("active");

  const header = document.getElementById("app-header");
  const cameraFab = document.getElementById("camera-fab");

  document.querySelectorAll(".top-nav button").forEach(btn => btn.classList.remove("active-nav"));

  if (screenId === "login-screen" || screenId === "register-screen") {
    header.classList.add("hidden");
    cameraFab.classList.add("hidden");
  } else {
    header.classList.remove("hidden");
    cameraFab.classList.remove("hidden");

    if (screenId === "home-screen") {
      document.getElementById("nav-home").classList.add("active-nav");
    } else if (screenId === "prices-screen") {
      document.getElementById("nav-prices").classList.add("active-nav");
    } else if (screenId === "calendar-screen") {
      document.getElementById("nav-calendar").classList.add("active-nav");
    }
  }
}

// Sidebar
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("active");
  document.getElementById("overlay").classList.toggle("active");
}

function logout() {
  toggleSidebar();
  switchScreen("login-screen");
}

// Salvar Nome do Usuário
function saveUsername() {
  const newName = document.getElementById("input-username").value;
  if (newName.trim() !== "") {
    document.getElementById("user-display-name").textContent = newName;
    alert("Nome atualizado com sucesso!");
    switchScreen("home-screen");
  } else {
    alert("Por favor, digite um nome válido.");
  }
}

// Google Maps Integration
function openGoogleMaps(address) {
  const encodedAddress = encodeURIComponent(address);
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank");
}

// Sistema de Lembretes do Calendário
let reminders = [];

function addReminder() {
  const medName = document.getElementById("med-name").value;
  const medTime = document.getElementById("med-time").value;

  if (!medName || !medTime) {
    alert("Por favor, preencha o nome e o horário do medicamento.");
    return;
  }

  reminders.push({ medName, medTime });
  
  document.getElementById("med-name").value = "";
  document.getElementById("med-time").value = "";

  renderReminders();
}

function removeReminder(index) {
  reminders.splice(index, 1);
  renderReminders();
}

function renderReminders() {
  const list = document.getElementById("reminder-list");
  list.innerHTML = "";
  
  reminders.forEach((item, index) => {
    list.innerHTML += `
      <li>
        <div>
          <i class="fa-solid fa-pills" style="color: var(--primary-green); margin-right: 8px;"></i>
          <span>${item.medTime} - ${item.medName}</span>
        </div>
        <i class="fa-solid fa-trash btn-delete-reminder" onclick="removeReminder(${index})"></i>
      </li>
    `;
  });
}

// Filtro da lista de Preços
function filterPrices() {
  const input = document.getElementById("search-med").value.toLowerCase();
  const priceItems = document.querySelectorAll("#price-list li");

  priceItems.forEach(item => {
    const text = item.textContent.toLowerCase();
    if (text.includes(input)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

// Scanner Câmera
function openScanner() {
  document.getElementById("scanner-modal").classList.remove("hidden");
}

function closeScanner() {
  document.getElementById("scanner-modal").classList.add("hidden");
}

function simulateScan() {
  closeScanner();
  switchScreen("prices-screen");
  document.getElementById("search-med").value = "Amoxilina";
  filterPrices();
}
