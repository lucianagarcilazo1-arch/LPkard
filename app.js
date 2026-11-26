const STORAGE_KEY = "mi-sistema-comercial-v01";
const $ = (id) => document.getElementById(id);
let data = loadData();

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const data = JSON.parse(saved);
data.clients = data.clients || [];

data.clients.forEach(client => {
  if (typeof client.visits !== "number") {
    client.visits = 0;
  }

  if (!client.id) {
    client.id = crypto.randomUUID();
  }
});

      data.loyalty = data.loyalty || {
        mode: "points",
        pointsGoal: 10,
        visitsGoal: 5,
        reward: "Premio especial"
      };

      return data;
    }

    return {
      business: "Mi negocio",
      clients: [],
      appointments: [],
      loyalty: {
        mode: "points",
        pointsGoal: 10,
        visitsGoal: 5,
        reward: "Premio especial"
      }
    };

  } catch {
    return {
      business: "Mi negocio",
      clients: [],
      appointments: [],
      loyalty: {
        mode: "points",
        pointsGoal: 10,
        visitsGoal: 5,
        reward: "Premio especial"
      }
    };
  }
}
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  render();
}
function id() { return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random())); }
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2300);
}
function clientName(clientId) {
  return data.clients.find(c => c.id === clientId)?.name || "Cliente eliminado";
}
function render() {
  $("business-title").textContent = data.business;
  $("stat-clients").textContent = data.clients.length;
  $("stat-points").textContent = data.clients.reduce((sum, c) => sum + c.points, 0);
  $("stat-appointments").textContent = data.appointments.length;
  renderClients();
  renderSelects();
  renderLoyalty();
  renderAppointments();
}
function renderClients() {
  const query = $("client-search").value.trim().toLowerCase();
  const clients = data.clients.filter(c => c.name.toLowerCase().includes(query) || c.phone.toLowerCase().includes(query));
  $("clients-list").innerHTML = clients.length ? clients.map(c => `
    <article class="data-row">
      <div><strong>${escapeHTML(c.name)}</strong><small>${escapeHTML(c.phone || "Sin teléfono")} · ${escapeHTML(c.email || "Sin correo")}</small></div>
      <div class="row-actions"><span class="points-pill">${c.points} puntos</span><button class="delete-btn" data-delete-client="${c.id}">Eliminar</button></div>
    </article>`).join("") : `<div class="empty">${query ? "No se encontraron clientes." : "Todavía no hay clientes. Registrá el primero arriba."}</div>`;
}
function renderSelects() {
  const options = `<option value="">Seleccionar cliente</option>` +
    data.clients.map(c =>
      `<option value="${c.id}">${escapeHTML(c.name)}</option>`
    ).join("");

  $("activity-client").innerHTML = options;
  $("appointment-client").innerHTML = options;
}
function renderLoyalty() {
  const goal = Number(data.loyalty.pointsGoal);
  const reward = data.loyalty.reward || "Premio especial";
  const pointsEnabled = data.loyalty.mode !== "visits";

  $("loyalty-list").innerHTML = data.clients.length
    ? data.clients.map(c => {
        const points = Number(c.points || 0);
        const canRedeem = pointsEnabled && points >= goal;

        return `
          <article class="data-row">

            <div>
              <strong>${escapeHTML(c.name)}</strong>
              <small>Tarjeta digital de fidelización · ID interno ${c.id.slice(0,8)}</small>

              ${canRedeem
                ? `<small>¡Recompensa disponible: ${escapeHTML(reward)}!</small>`
                : `<small>${pointsEnabled
                    ? `Te faltan ${Math.max(0, goal - points)} puntos para tu recompensa.`
                    : "Programa configurado por visitas."}</small>`
              }
            </div>

            <span class="points-pill">${points} puntos</span>

            <button class="secondary view-card"
              data-client-id="${escapeHTML(c.id)}">
              Ver tarjeta
            </button>

            ${canRedeem
              ? `<button class="primary redeem-client"
                  data-client-id="${escapeHTML(c.id)}">
                  Canjear recompensa
                </button>`
              : ""
            }

          </article>
        `;
      }).join("")
    : `<div class="empty">Primero registrá clientes en el módulo Clientes.</div>`;

  document.querySelectorAll(".redeem-client").forEach(button => {
    button.addEventListener("click", () => {
      redeemPoints(button.dataset.clientId);
    });
  });

  document.querySelectorAll(".view-card").forEach(button => {
    button.addEventListener("click", () => {
      openLoyaltyCard(button.dataset.clientId);
    });
  });
}

function openLoyaltyCard(clientId) {
  const client = data.clients.find(c => c.id === clientId);

  if (!client) {
    return notify("No se encontró el cliente.");
  }

  const mode = data.loyalty.mode;
  const pointsMode = mode === "points" || mode === "both";
  const visitsMode = mode === "visits" || mode === "both";

  const points = Number(client.points || 0);
  const visits = Number(client.visits || 0);
  const pointsGoal = Number(data.loyalty.pointsGoal) || 0;
  const visitsGoal = Number(data.loyalty.visitsGoal) || 0;

  $("card-business-name").textContent = data.business;
  $("card-client-name").textContent = client.name;

const qrContainer = $("customer-qr-code");
qrContainer.innerHTML = "";

new QRCode(qrContainer, {
  text: JSON.stringify({
    type: "LPKARD_CUSTOMER",
    clientId: client.id
  }),
  width: 180,
  height: 180,
  correctLevel: QRCode.CorrectLevel.H
});

  $("card-points-section").hidden = !pointsMode;
  $("card-visits-section").hidden = !visitsMode;

  if (pointsMode) {
    $("card-points").textContent = `${points} / ${pointsGoal}`;
    $("card-progress").style.width = pointsGoal > 0
      ? `${Math.min((points / pointsGoal) * 100, 100)}%`
      : "0%";
  }

  if (visitsMode) {
    $("card-visits").textContent = `${visits} / ${visitsGoal}`;
    $("card-visits-progress").style.width = visitsGoal > 0
      ? `${Math.min((visits / visitsGoal) * 100, 100)}%`
      : "0%";
  }

  $("card-reward").textContent = data.loyalty.reward || "Premio especial";

  const messages = [];

  if (pointsMode) {
    messages.push(
      pointsGoal > 0 && points >= pointsGoal
        ? "¡Alcanzaste tu meta de puntos!"
        : `Te faltan ${Math.max(pointsGoal - points, 0)} puntos.`
    );
  }

  if (visitsMode) {
    messages.push(
      visitsGoal > 0 && visits >= visitsGoal
        ? "¡Alcanzaste tu meta de visitas!"
        : `Te faltan ${Math.max(visitsGoal - visits, 0)} visitas.`
    );
  }

  $("card-status").textContent = messages.join(" ");
  $("loyalty-card-dialog").showModal();
}
 
$("close-loyalty-card").addEventListener("click", () => {
  $("loyalty-card-dialog").close();
});
function redeemPoints(clientId) {
  const client = data.clients.find(c => c.id === clientId);

  if (!client) return notify("No se encontró el cliente.");

  const goal = Number(data.loyalty.pointsGoal);
  const reward = data.loyalty.reward || "Premio especial";

  if (client.points < goal) {
    return notify("El cliente todavía no alcanzó la meta.");
  }

  if (!confirm(
    `¿Confirmar el canje de ${reward} para ${client.name}?`
  )) return;

  client.points -= goal;

  saveData();

  notify("¡Recompensa canjeada correctamente!");
}
function renderAppointments() {
  const sorted = [...data.appointments].sort((a,b) =>
    (a.date+a.time).localeCompare(b.date+b.time)
  );

  $("appointments-list").innerHTML = sorted.length
    ? sorted.map(a => `
      <article class="data-row">
        <div>
          <strong>${escapeHTML(clientName(a.clientId))}</strong>
          <small>${escapeHTML(a.service)}</small>
          <small class="appointment-date">
            ${formatDate(a.date)} · ${escapeHTML(a.time)}
          </small>
        </div>

        <div class="appointment-actions">
          <button
            class="secondary"
            data-reminder-appointment="${a.id}">
            Enviar recordatorio
          </button>

          <button
            class="delete-btn"
            data-delete-appointment="${a.id}">
            Cancelar turno
          </button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">Todavía no hay turnos agendados.</div>`;
}
function formatDate(date) {
  return new Date(date + "T12:00:00").toLocaleDateString("es-AR", {day:"2-digit",month:"short",year:"numeric"});
}

document.querySelectorAll(".module-card").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".module-card").forEach(b => b.classList.toggle("active", b === button));
    document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === `view-${button.dataset.view}`));
    const labels = {clients:["MÓDULO 01","Clientes"],loyalty:["MÓDULO 02","Fidelización"],agenda:["MÓDULO 03","Agenda"]};
    $("section-eyebrow").textContent = labels[button.dataset.view][0];
    $("section-title").textContent = labels[button.dataset.view][1];
  });
});

$("client-form").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("client-name").value.trim();
  if (!name) return;
  data.clients.push({id:id(),name,phone:$("client-phone").value.trim(),email:$("client-email").value.trim(),points:0});
  event.target.reset(); saveData(); notify("Cliente registrado correctamente.");
});
$("client-search").addEventListener("input", renderClients);
$("clients-list").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-client]");
  if (!button) return;
  const clientId = button.dataset.deleteClient;
  if (!confirm("¿Eliminar este cliente? Sus turnos también se eliminarán.")) return;
  data.clients = data.clients.filter(c => c.id !== clientId);
  data.appointments = data.appointments.filter(a => a.clientId !== clientId);
  saveData(); notify("Cliente eliminado.");
});
// Actualizar las operaciones disponibles según la modalidad
function updateActivityOptions() {
  const mode = $("loyalty-mode").value;
  const type = $("activity-type");

  let options = "";

  if (mode === "points" || mode === "both") {
    options += '<option value="points">Acreditar puntos</option>';
  }

  if (mode === "visits" || mode === "both") {
    options += '<option value="visit">Registrar visita</option>';
  }

  type.innerHTML = options;

  updateActivityAmount();
}

// Mostrar el campo de puntos solo cuando corresponda
function updateActivityAmount() {
  const isPoints = $("activity-type").value === "points";

  $("activity-amount-container").style.display =
    isPoints ? "block" : "none";

  $("activity-amount").required = isPoints;
}

// Actualizar opciones cuando cambia la modalidad
$("loyalty-mode").addEventListener("change", () => {
  updateLoyaltyFields();
  updateActivityOptions();
});

updateActivityOptions();

// Registrar actividad del cliente
$("activity-form").addEventListener("submit", event => {
  event.preventDefault();

  const client = data.clients.find(
    c => c.id === $("activity-client").value
  );

  if (!client) {
    return notify("Seleccioná un cliente.");
  }

  const type = $("activity-type").value;

  if (type === "points") {
    const amount = Number($("activity-amount").value);

    if (!Number.isInteger(amount) || amount < 1) {
      return notify("Ingresá una cantidad válida de puntos.");
    }

    client.points = Number(client.points || 0) + amount;

    saveData();
    event.target.reset();
    updateActivityOptions();

    return notify("Puntos acreditados correctamente.");
  }

  if (type === "visit") {
    client.visits = Number(client.visits || 0) + 1;

    saveData();
    event.target.reset();
    updateActivityOptions();

    return notify("Visita registrada correctamente.");
  }
});
$("appointment-form").addEventListener("submit", event => {
  event.preventDefault();
  const clientId = $("appointment-client").value;
  const date = $("appointment-date").value;
  const time = $("appointment-time").value;
  const service = $("appointment-service").value.trim();
  if (!clientId || !date || !time || !service) return;
  const conflict = data.appointments.some(a => a.date === date && a.time === time);
  if (conflict) return notify("Ya existe un turno en esa fecha y hora.");
  data.appointments.push({id:id(),clientId,date,time,service});
  event.target.reset(); saveData(); notify("Turno agendado.");
});
$("appointments-list").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-appointment]");
  if (!button) return;
  if (!confirm("¿Cancelar este turno?")) return;
  data.appointments = data.appointments.filter(a => a.id !== button.dataset.deleteAppointment);
  saveData(); notify("Turno cancelado.");
});
$("appointments-list").addEventListener("click", event => {
  const button = event.target.closest("[data-reminder-appointment]");
  if (!button) return;

  const appointment = data.appointments.find(
    a => a.id === button.dataset.reminderAppointment
  );

  if (!appointment) return;

  const client = data.clients.find(
    c => c.id === appointment.clientId
  );

  if (!client) return notify("No se encontró el cliente.");

  let phone = String(client.phone || "").replace(/\D/g, "");

  if (phone.startsWith("549")) {
    // Ya tiene el prefijo internacional de celular argentino.
  } else if (phone.startsWith("54")) {
    phone = "549" + phone.slice(2);
  } else {
    if (phone.startsWith("0")) phone = phone.slice(1);

    if (phone.length !== 10) {
      return notify("Revisá el teléfono: debe incluir característica y número completo.");
    }

    phone = "549" + phone;
  }

  if (phone.length !== 13) {
    return notify("El número de celular no tiene el formato esperado.");
  }

  const message =
    `¡Hola, buen día ${client.name}! 👋

Te recordamos tu cita de ${appointment.service} para hoy a las ${appointment.time} en ${data.business}.

💬 Respondé SÍ para confirmar o avisanos si necesitás cambiarla.

¡Te esperamos! 😊`;

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(url, "_blank");
});
$("edit-business").addEventListener("click", () => {
  $("business-name").value = data.business;

  $("theme-primary").value = data.theme?.primary || "#81566f";
  $("theme-background").value = data.theme?.background || "#fbf7fa";
  $("theme-card").value = data.theme?.card || "#ffffff";

  $("business-dialog").showModal();
});
$("business-form").addEventListener("submit", event => {
  if (event.submitter?.value !== "save") return;

  const name = $("business-name").value.trim();

  if (name) {
    data.business = name;

    data.theme = {
      primary: $("theme-primary").value,
      background: $("theme-background").value,
      card: $("theme-card").value
    };

    applyTheme();
    saveData();
    notify("Configuración del negocio actualizada.");
  }
});
function applyTheme() {
  const theme = data.theme || {};

  document.documentElement.style.setProperty(
    "--green",
    theme.primary || "#81566f"
  );

  document.documentElement.style.setProperty(
    "--green2",
    theme.primary ? theme.primary + "22" : "#f4eaf1"
  );

  document.documentElement.style.setProperty(
    "--paper",
    theme.background || "#fbf7fa"
  );

  document.documentElement.style.setProperty(
    "--white",
    theme.card || "#ffffff"
  );
}
$("today-label").textContent = new Date().toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"});
// Configuración del programa de fidelización
$("loyalty-mode").value = data.loyalty.mode;
$("points-goal").value = data.loyalty.pointsGoal;
$("visits-goal").value = data.loyalty.visitsGoal;
$("loyalty-reward").value = data.loyalty.reward;
function updateLoyaltyFields() {
  const mode = $("loyalty-mode").value;

  $("points-goal-container").style.display =
    mode === "points" || mode === "both" ? "block" : "none";

  $("visits-goal-container").style.display =
    mode === "visits" || mode === "both" ? "block" : "none";
}

$("loyalty-mode").addEventListener("change", updateLoyaltyFields);

updateLoyaltyFields();
$("loyalty-settings-form").addEventListener("submit", event => {
  event.preventDefault();

  data.loyalty = {
    mode: $("loyalty-mode").value,
    pointsGoal: Number($("points-goal").value),
    visitsGoal: Number($("visits-goal").value),
    reward: $("loyalty-reward").value.trim()
  };

  saveData();
  notify("Programa de fidelización actualizado.");
});
$("appointment-date").min = new Date().toISOString().slice(0,10);
applyTheme();
render();
function miPrimeraFuncion() {
    console.log("Estoy aprendiendo a programar mi propio software");
}

miPrimeraFuncion();
function presentarNegocio(nombreNegocio) {
    console.log("Bienvenido a " + nombreNegocio);
}

presentarNegocio("LPKard");

let qrScanner = null;

$("start-qr-scan").addEventListener("click", async () => {
  if (typeof Html5Qrcode === "undefined") {
    $("qr-scan-status").textContent =
      "No se pudo cargar el lector QR.";
    return;
  }

  if (!qrScanner) {
    qrScanner = new Html5Qrcode("qr-reader");
  }

  try {
    $("qr-scan-status").textContent =
      "Solicitando acceso a la cámara...";

    await qrScanner.start(
      { facingMode: "environment" },
      {
        fps: 10,
        qrbox: { width: 220, height: 220 }
      },
      async (decodedText) => {
        try {
          const result = JSON.parse(decodedText);

          if (result.type !== "LPKARD_CUSTOMER") {
            $("qr-scan-status").textContent =
              "Este QR no corresponde a una tarjeta LPkard.";
            return;
          }

          const client = data.clients.find(
            c => c.id === result.clientId
          );

          if (!client) {
            $("qr-scan-status").textContent =
              "No se encontró ese cliente en este comercio.";
            return;
          }

          $("activity-client").value = client.id;

          $("qr-scan-status").textContent =
            `Cliente identificado: ${client.name}`;

          await qrScanner.stop();

        } catch (error) {
          $("qr-scan-status").textContent =
            "No se pudo interpretar el código QR.";
        }
      },
      () => {}
    );

    $("qr-scan-status").textContent =
      "Cámara activa. Enfocá el QR del cliente.";

  } catch (error) {
    $("qr-scan-status").textContent =
      "No se pudo iniciar la cámara. Revisá los permisos.";
  }
});

$("stop-qr-scan").addEventListener("click", async () => {
  if (qrScanner && qrScanner.isScanning) {
    await qrScanner.stop();
    $("qr-scan-status").textContent =
      "Escáner detenido.";
  }
});
