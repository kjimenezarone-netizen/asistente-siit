const SESSION_ID = 'sess-' + Math.random().toString(36).substr(2, 9);
// CONFIGURACIÓN (Asegúrate de que el puerto coincida con tu backend)
//const BACKEND_URL = "http://localhost:7000";
const BACKEND_URL = "https://lim-cpu2nvx.tail9bc556.ts.net";

let SESSION_TOKEN = null;
let CURRENT_USER = null;

// ELEMENTOS DE LA PANTALLA
const loginUser = document.getElementById('loginUser');
const loginPass = document.getElementById('loginPass');
const loginError = document.getElementById('loginError');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatBox = document.getElementById('chatBox');
const loginOverlay = document.getElementById('loginOverlay');

// Tiempo de expiración de sesión en segundos (debe coincidir con el backend)
const SESSION_DURATION = 1800; // 30 minutos (ajusta según tu backend)
let sessionTimeout = null;

// =========================================================
// 1. FUNCIÓN DE LOGIN
// =========================================================
async function iniciarSesion() {
    console.log("🔵 Intentando iniciar sesión...");
    const u = loginUser.value;
    const p = loginPass.value;

    if (!u || !p) {
        mostrarError("Por favor, ingrese usuario y contraseña.");
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // LOGIN EXITOSO
            console.log("🟢 Login correcto:", data.user);
            SESSION_TOKEN = data.token;
            CURRENT_USER = data.user;
            
            // Ocultar pantalla de login
            loginOverlay.style.display = 'none';
            
            // Activar chat
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();

            // Mensaje de bienvenida
            document.getElementById('modalComunicado').style.display = 'flex';

            // Registrar visita (opcional)
            fetch(`${BACKEND_URL}/api/registrar-visita`).catch(e => console.log("Telemetría off"));

            // Iniciar temporizador de expiración de sesión
            if (sessionTimeout) clearTimeout(sessionTimeout);
            sessionTimeout = setTimeout(() => {
                cerrarSesionPorExpiracion();
            }, SESSION_DURATION * 1000);

        } else {
            // ERROR DE CREDENCIALES
            console.warn("🔴 Error login:", data.error);
            mostrarError(data.error || "Credenciales incorrectas");
        }

    } catch (error) {
        console.error("🔥 Error de conexión:", error);
        mostrarError("No se pudo conectar con el servidor. ¿Está encendido?");
    }
}

function mostrarError(msg) {
    loginError.innerText = msg;
    loginError.style.display = 'block';
}

// =========================================================
// 2. FUNCIÓN DE CHAT
// =========================================================
async function handleSend() {
    const text = userInput.value.trim();
    if (!text || !SESSION_TOKEN || sendBtn.disabled) return;
    // bloqueo UI
    sendBtn.disabled = true;
    userInput.disabled = true;
    userInput.value = '';

    // 1. Mostrar mensaje del usuario
    addMessage(text, 'user');

    await new Promise(resolve => setTimeout(resolve, 50));
    

    // 2. Mostrar "Escribiendo..."
    const loadingId = addMessage('... Pensando ...', 'bot');

    try {
        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SESSION_TOKEN}`
            },
            body: JSON.stringify({ message: text, sessionId: SESSION_ID })
        });

        const data = await response.json();

        // Borrar "Pensando..."
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();

        // Manejo de sesión expirada
        if (data.error && data.error.includes('Sesión expirada')) {
            cerrarSesionPorExpiracion();
            return;
        }

        if (data.error) {
            addMessage(`❌ Error: ${data.error}`, 'bot');
        } else {
            addMessage(data.reply, 'bot');
        }

    } catch (error) {
        console.error("🔥 Error detectadoÑ:", error);
        const loader = document.getElementById(loadingId);
        if (loader) loader.remove();
        addMessage("❌ Error de conexión con el servidor.", 'bot');
    } finally {
        sendBtn.disabled = false;
        userInput.disabled = false;
        userInput.focus();
    }
}

// =========================================================
// 3. UTILIDADES VISUALES
// =========================================================
function addMessage(html, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`; // 'message bot' o 'message user'
    div.innerHTML = html;
    const uniqueId = 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    
    div.id = uniqueId;

    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    return uniqueId;
}
function cerrarComunicado() {
    document.getElementById('modalComunicado').style.display = 'none';
    // saludo al chat
    const idGenerado = addMessage(`👋 <b>Hola ${CURRENT_USER}.</b><br>Bienvenido al asistente SIIT.`, 'bot');

    // Aplicamos la Animacion
    const msgElement = document.getElementById(idGenerado);
    if (msgElement){
        msgElement.classList.add('fade-in-message');
    }

}
// Permitir enviar con Enter
if(userInput) {
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}

// Cierra la sesión y muestra el login por expiración
function cerrarSesionPorExpiracion() {
    SESSION_TOKEN = null;
    CURRENT_USER = null;
    loginOverlay.style.display = 'flex';
    userInput.disabled = true;
    sendBtn.disabled = true;
    mostrarError('Sesión expirada. Por favor, inicie sesión nuevamente.');
    if (sessionTimeout) clearTimeout(sessionTimeout);
}
