document.addEventListener("DOMContentLoaded", () => {
    // 1. Configuración del horario del consultorio (08:00 a 18:00, intervalos de 30 min)
    const HORA_APERTURA = 8;
    const HORA_CIERRE = 18;
    const INTERVALO_MINUTOS = 30;

    // Elementos del DOM
    const watermarkContainer = document.getElementById("watermark-container");
    const form = document.getElementById("appointment-form");
    const patientInput = document.getElementById("patient-name");
    const specialtySelect = document.getElementById("specialty");
    const dateInput = document.getElementById("appointment-date");
    const timeSelect = document.getElementById("appointment-time");
    const feedbackDiv = document.getElementById("feedback-message");
    const appointmentsList = document.getElementById("appointments-list");
    const counterBadge = document.getElementById("counter");

    // Cargar turnos guardados en LocalStorage o iniciar arreglo vacío
    let turnos = JSON.parse(localStorage.getItem("turnosEsteban")) || [];

    // 2. Generar estampado "ESTEBAN" por toda la pantalla
    function generarEstampado() {
        for (let i = 0; i < 60; i++) {
            const span = document.createElement("span");
            span.classList.add("watermark-text");
            span.textContent = "ESTEBAN";
            watermarkContainer.appendChild(span);
        }
    }

    // 3. Configurar fecha mínima en el calendario (a partir de hoy en adelante)
    function configurarFechaMinima() {
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, "0");
        const dia = String(hoy.getDate()).padStart(2, "0");
        const fechaHoyStr = `${anio}-${mes}-${dia}`;

        dateInput.min = fechaHoyStr;
        dateInput.value = fechaHoyStr;
    }

    // 4. Generar opciones de horarios cada 30 minutos dentro del rango del consultorio
    function generarHorarios() {
        timeSelect.innerHTML = '<option value="" disabled selected>Seleccione horario...</option>';

        for (let hora = HORA_APERTURA; hora < HORA_CIERRE; hora++) {
            for (let min = 0; min < 60; min += INTERVALO_MINUTOS) {
                const horaStr = String(hora).padStart(2, "0");
                const minStr = String(min).padStart(2, "0");
                const horario = `${horaStr}:${minStr}`;

                const option = document.createElement("option");
                option.value = horario;
                option.textContent = `${horario} hs`;
                timeSelect.appendChild(option);
            }
        }
    }

    // Mostrar mensajes de error o éxito
    function mostrarMensaje(texto, tipo) {
        feedbackDiv.textContent = texto;
        feedbackDiv.className = `feedback ${tipo}`;
        setTimeout(() => {
            feedbackDiv.style.display = "none";
            feedbackDiv.className = "feedback";
        }, 4000);
    }

    // 5. Renderizar turnos uno debajo del otro en el panel derecho
    function renderizarTurnos() {
        appointmentsList.innerHTML = "";
        counterBadge.textContent = `${turnos.length} ${turnos.length === 1 ? "turno" : "turnos"}`;

        if (turnos.length === 0) {
            appointmentsList.innerHTML = '<p class="empty-msg">No hay turnos registrados aún.</p>';
            return;
        }

        // Ordenar por fecha y hora más próxima
        turnos.sort((a, b) => {
            const fechaHoraA = new Date(`${a.fecha}T${a.hora}`);
            const fechaHoraB = new Date(`${b.fecha}T${b.hora}`);
            return fechaHoraA - fechaHoraB;
        });

        turnos.forEach((turno) => {
            const card = document.createElement("div");
            card.classList.add("appointment-card");

            // Formatear fecha DD/MM/AAAA para lectura
            const [anio, mes, dia] = turno.fecha.split("-");
            const fechaFormateada = `${dia}/${mes}/${anio}`;

            card.innerHTML = `
                <div class="appointment-info">
                    <h3>${turno.paciente}</h3>
                    <p><strong>Especialidad:</strong> ${turno.especialidad}</p>
                    <p><strong>Fecha:</strong> ${fechaFormateada} | <strong>Horario:</strong> ${turno.hora} hs</p>
                </div>
                <button class="btn-delete" data-id="${turno.id}">Eliminar</button>
            `;

            appointmentsList.appendChild(card);
        });

        // Asignar eventos a los botones de eliminar
        document.querySelectorAll(".btn-delete").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const id = Number(e.target.getAttribute("data-id"));
                eliminarTurno(id);
            });
        });
    }

    // 6. Eliminar turno y liberar el horario
    function eliminarTurno(id) {
        turnos = turnos.filter((turno) => turno.id !== id);
        localStorage.setItem("turnosEsteban", JSON.stringify(turnos));
        renderizarTurnos();
        mostrarMensaje("Turno eliminado. El horario volvió a estar disponible.", "success");
    }

    // 7. Validar y guardar nuevo turno
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const paciente = patientInput.value.trim();
        const especialidad = specialtySelect.value;
        const fecha = dateInput.value;
        const hora = timeSelect.value;

        // Validación A: Campos completos
        if (!paciente || !especialidad || !fecha || !hora) {
            mostrarMensaje("Por favor, complete todos los campos.", "error");
            return;
        }

        // Validación B: Fecha no anterior a hoy
        const hoyStr = dateInput.min;
        if (fecha < hoyStr) {
            mostrarMensaje("No se pueden agendar turnos en fechas pasadas.", "error");
            return;
        }

        // Validación C: Si el turno es hoy, verificar que el horario no haya pasado ya
        if (fecha === hoyStr) {
            const ahora = new Date();
            const [hTurno, mTurno] = hora.split(":").map(Number);
            const horaTurnoDate = new Date();
            horaTurnoDate.setHours(hTurno, mTurno, 0, 0);

            if (horaTurnoDate <= ahora) {
                mostrarMensaje("Ese horario de hoy ya pasó. Seleccione un horario futuro.", "error");
                return;
            }
        }

        // Validación D: Verificar que no exista otro turno en la misma fecha y horario
        const horarioOcupado = turnos.some(
            (turno) => turno.fecha === fecha && turno.hora === hora
        );

        if (horarioOcupado) {
            mostrarMensaje(`El horario ${hora} hs del día seleccionado ya está ocupado.`, "error");
            return;
        }

        // Guardar turno
        const nuevoTurno = {
            id: Date.now(),
            paciente,
            especialidad,
            fecha,
            hora
        };

        turnos.push(nuevoTurno);
        localStorage.setItem("turnosEsteban", JSON.stringify(turnos));

        form.reset();
        configurarFechaMinima();
        renderizarTurnos();
        mostrarMensaje("Turno registrado correctamente.", "success");
    });

    // Inicializar aplicación
    generarEstampado();
    configurarFechaMinima();
    generarHorarios();
    renderizarTurnos();
});