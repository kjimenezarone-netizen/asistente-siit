// ===============================================================
// 🔗 CONEXIÓN CON EL BACKEND (NODE.JS)
// ===============================================================
// const BACKEND_URL = "http://localhost:5000/chat";
const BACKEND_URL = "https://unspiritually-unparodied-hendrix.ngrok-free.dev";

// NOTA: La variable DB_CONTEXT (instrucciones de IA) ahora vive en tu servidor (Backend)
// para proteger la seguridad de tu prompt.

// Referencias al DOM (Elementos de la pantalla)
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const loader = document.getElementById('loader');
const logContainer = document.getElementById('logContainer');

// BÓVEDA DE DATOS LOCAL (Almacena temporalmente los datos reales)
let dataVault = {}; 

// Escuchar tecla ENTER
userInput.addEventListener('keypress', (e) => { 
    if (e.key === 'Enter') handleSend(); 
});

// ===============================================================
// 🛠️ SISTEMA DE LOGS Y AUDITORÍA VISUAL
// ===============================================================
function addLog(type, text, details = null) {
    if (!logContainer) return;
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    
    let badge = '';
    if(type === 'IN') badge = '<span class="tag-in">>> USER:</span>';
    if(type === 'DLP') badge = '<span class="tag-dlp">!! BLOQUEO:</span>';
    if(type === 'OUT') badge = '<span class="tag-out"><< IA (Cifrado):</span>';
    if(type === 'OK') badge = '<span class="tag-ok">OK:</span>';
    if(type === 'ERR') badge = '<span style="color:red; font-weight:bold">ERROR:</span>';

    let detailBlock = '';
    if (details) {
        detailBlock = `<span class="sensitive-block">${details}</span>`;
    }

    entry.innerHTML = `<span class="log-time">[${time}]</span> ${badge} ${text} ${detailBlock}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// ===============================================================
// 🔒 MOTOR DE PRIVACIDAD (CLIENT-SIDE DLP)
// ===============================================================
function protegerDatos(texto) {
    let seguro = texto;
    let detectedItems = [];
    
    // 1. Limpiar bóveda para el nuevo mensaje (evita mezclar datos de chats previos)
    dataVault = {}; 
    
    let counters = { DNI:0, RUC:0, PER:0, EMP:0, LOC:0, MAIL:0, TELF:0 };

    // Función Helper para reemplazar y guardar en la bóveda
    const tokenize = (match, type, cleanValue) => {
        const token = `{{${type}_${counters[type]}}}`;
        dataVault[token] = cleanValue || match; // Guardamos el valor real asociado al token
        counters[type]++;
        detectedItems.push(`${type}: ${cleanValue || match} -> ${token}`);
        return token;
    };

    // --- REGLAS DE ENCRIPTACIÓN (REGEX) ---

    // 1. EMAILS
    seguro = seguro.replace(/[\w-\.]+@([\w-]+\.)+[\w-]{2,4}/g, (match) => tokenize(match, 'MAIL'));

    // 2. RUC (11 dígitos, empieza con 10 o 20)
    seguro = seguro.replace(/\b(10|20)\d{9}\b/g, (match) => tokenize(match, 'RUC'));

    // 3. DNI (8 dígitos exactos)
    seguro = seguro.replace(/\b\d{8}\b/g, (match) => tokenize(match, 'DNI'));

    // 4. TELÉFONOS (9 dígitos, empieza con 9)
    seguro = seguro.replace(/\b9\d{8}\b/g, (match) => tokenize(match, 'TELF'));

    // 5. DIRECCIONES (Contextual)
    const regexDir = /(?:viv(?:o|e) en|domicilio|direcci[óo]n|calle|av\.|avenida|jr\.|jir[óo]n|psje\.)\s+([a-zA-Z0-9\.\s\-\#]+?)(?=\s*(?:,|$|\.|y la))/gi;
    seguro = seguro.replace(regexDir, (match, captured) => {
        const token = tokenize(captured, 'LOC');
        return match.replace(captured, token);
    });

    // 6. EMPRESAS (Contextual)
    const regexEmp = /(?:empresa|raz[óo]n social|consorcio)\s+([a-zA-Z0-9\.\s]+?)(?=\s*(?:,|$|\.|y el))/gi;
    seguro = seguro.replace(regexEmp, (match, captured) => {
        const token = tokenize(captured, 'EMP');
        return match.replace(captured, token);
    });

    // 7. NOMBRES PROPIOS (Heurístico simple)
    const regexNom = /(?:soy|me llamo|mi nombre es|usuario|señor|sr\.)\s+([A-ZÁÉÍÓÚ][a-zñáéíóú]+(?:\s+[A-ZÁÉÍÓÚ][a-zñáéíóú]+){1,3})/g;
    seguro = seguro.replace(regexNom, (match, captured) => {
        const token = tokenize(captured, 'PER');
        return match.replace(captured, token);
    });

    return { 
        textoProtegido: seguro, 
        logs: detectedItems 
    };
}

// ===============================================================
// 🔓 RESTAURACIÓN DE DATOS (CLIENT-SIDE)
// ===============================================================
function restaurarDatos(textoIA) {
    let textoRestaurado = textoIA;
    
    // Buscamos los tokens en la respuesta de la IA y los reemplazamos por los datos originales de la bóveda
    for (const [token, valorReal] of Object.entries(dataVault)) {
        // Usamos un span especial para resaltar el dato restaurado
        const spanRestaurado = `<span class="restored-data" title="Dato original restaurado: ${valorReal}">${valorReal}</span>`;
        // Reemplazo global del token
        textoRestaurado = textoRestaurado.split(token).join(spanRestaurado);
    }
    return textoRestaurado;
}

// ===============================================================
// 🚀 LÓGICA DE ENVÍO (HACIA EL BACKEND)
// ===============================================================
async function handleSend() {
    const rawText = userInput.value.trim();
    if (!rawText) return;

    // 1. Mostrar mensaje del usuario en pantalla
    addMessage(rawText, 'user');
    userInput.value = '';
    
    // Bloquear UI mientras carga
    userInput.disabled = true;
    sendBtn.disabled = true;
    loader.style.display = 'block';

    addLog('IN', rawText);

    try {
        // 2. ENCRIPTACIÓN LOCAL (DLP)
        // Antes de que salga del navegador, limpiamos los datos.
        const { textoProtegido, logs } = protegerDatos(rawText);
        
        if (logs.length > 0) {
            addLog('DLP', `Se detectaron ${logs.length} datos sensibles.`, logs.join('<br>'));
            addLog('INFO', `Enviando al Backend (Node.js): "${textoProtegido}"`);
        } else {
            addLog('INFO', "No se detectaron datos sensibles. Enviando limpio...");
        }

        // 3. PETICIÓN AL BACKEND (Node.js)
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: textoProtegido // ¡IMPORTANTE! Enviamos la versión con tokens
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            throw new Error(data.error || "Error desconocido en el servidor");
        }
        
        const aiResponseRaw = data.reply;
        addLog('OUT', aiResponseRaw); 

        // 4. DESENCRIPTACIÓN LOCAL
        // La IA responde con tokens (ej: "Hola {{PER_0}}"). Aquí los volvemos texto real.
        const textoFinalUsuario = restaurarDatos(aiResponseRaw);
        
        // Verificamos si hubo cambios para loguearlo
        if (aiResponseRaw !== textoFinalUsuario) {
            addLog('OK', "Datos sensibles re-inyectados en el navegador del cliente.");
        }

        // 5. Renderizar respuesta con formato
        const formatted = textoFinalUsuario
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Negritas Markdown
            .replace(/\n/g, '<br>'); // Saltos de línea

        addMessage(formatted, 'bot');

    } catch (error) {
        console.error(error);
        addMessage(`<strong>Error de Conexión:</strong> ${error.message}`, 'bot');
        addLog('ERR', error.message);
    } finally {
        // Restaurar estado del input
        loader.style.display = 'none';
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// Función auxiliar para agregar burbujas al chat visual
function addMessage(html, type) {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.innerHTML = html;
    if (type === 'bot' && !html.includes("Error")) {
        div.innerHTML += '<div class="source-ref">Soporte SIIT-SDAN-DINI</div>';
    }
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}