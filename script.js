// ===============================================================
// 🔗 CONFIGURACIÓN DE TU API
// ===============================================================
//const BACKEND_URL = "http://localhost:5000/chat";
const BACKEND_URL = "https://lim-cpu2nvx.tail9bc556.ts.net/chat";

// Referencias a los elementos de tu HTML (index.html)
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const loader = document.getElementById('loader');

// ===============================================================
// 👂 ESCUCHADORES DE EVENTOS
// ===============================================================

// Enviar al presionar Enter
userInput.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter') handleSend(); 
});

// Enviar al hacer click en el botón
sendBtn.addEventListener('click', handleSend);

// ===============================================================
// 🚀 LÓGICA PRINCIPAL
// ===============================================================

async function handleSend() {
    const text = userInput.value.trim();
    
    // Si está vacío, no hacemos nada
    if (!text) return;

    // 1. Mostrar mensaje del usuario en pantalla inmediatamente
    addMessage(text, 'user');
    userInput.value = ''; // Limpiar input
    
    // 2. Activar estado de "Pensando..."
    toggleLoading(true);

    try {
        // 3. CONECTAR CON TU API (BACKEND)
        // Enviamos el mensaje crudo. El servidor se encarga de la seguridad.
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: text })
        });

        const data = await response.json();

        if (data.error) {
            // Si el servidor reporta un error controlado
            addMessage(`Error del sistema: ${data.error}`, 'bot');
        } else {
            // 4. MOSTRAR RESPUESTA DE LA IA
            // La respuesta ya viene con los datos sensibles restaurados desde el servidor
            formatAndDisplayBotMessage(data.reply);
        }

    } catch (error) {
        console.error("Error de conexión:", error);
        addMessage("⚠️ Error: No se pudo conectar con el servidor de SUNAFIL. Verifica que el backend esté corriendo (node server.js).", 'bot');
    } finally {
        // 5. Desactivar estado de carga
        toggleLoading(false);
        userInput.focus(); // Devolver el foco al usuario
    }
}

// ===============================================================
// 🎨 FUNCIONES DE INTERFAZ (UI)
// ===============================================================

function toggleLoading(isLoading) {
    if (isLoading) {
        userInput.disabled = true;
        sendBtn.disabled = true;
        loader.style.display = 'block'; // Muestra el indicador de carga
    } else {
        userInput.disabled = false;
        sendBtn.disabled = false;
        loader.style.display = 'none'; // Oculta el indicador
    }
}

// Procesa el texto para que las negritas (**) se vean bien en HTML
function formatAndDisplayBotMessage(rawText) {
    // Convertir **texto** a <strong>texto</strong>
    const htmlFormatted = rawText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
        .replace(/\n/g, '<br>'); // Convertir saltos de línea a <br>

    addMessage(htmlFormatted, 'bot');
}

// Agrega la burbuja de chat al HTML
function addMessage(htmlContent, senderType) {
    const div = document.createElement('div');
    div.className = `message ${senderType}`; // 'user' o 'bot'
    div.innerHTML = htmlContent;

    // Si es el bot, agregamos la firma pequeña
    if (senderType === 'bot' && !htmlContent.includes("Error")) {
        div.innerHTML += '<div style="font-size:0.7em; color:#888; margin-top:8px; border-top:1px solid #eee; padding-top:4px;">Soporte SIIT-SDAN-DINI</div>';
    }

    chatBox.appendChild(div);
    
    // Auto-scroll hacia abajo
    chatBox.scrollTop = chatBox.scrollHeight;
}