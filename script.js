let productos = [];

document.addEventListener('DOMContentLoaded', () => {
    // FECHA AUTOMÁTICA AL DÍA
    const f = new Date();
    const hoy = f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') + '-' + String(f.getDate()).padStart(2, '0');
    document.getElementById('fecha-actual').value = hoy;
    
    // Carga historial del Hub después de un momento
    setTimeout(mostrarHistorial, 1500);
});

function agregarFila() {
    const nom = document.getElementById('db-nom').value;
    const m3 = parseFloat(document.getElementById('db-m3').value);
    const pu = parseFloat(document.getElementById('db-pu').value);

    if (!nom || isNaN(m3)) return alert("Por favor, ingresa producto y cantidad");

    const importe = m3 * pu;
    productos.push({ nom, m3, pu, importe });
    renderTabla();
    
    // Limpia campos de entrada
    document.getElementById('db-nom').value = "";
    document.getElementById('db-m3').value = "";
}

function renderTabla() {
    const tabla = document.getElementById('cuerpo-tabla');
    tabla.innerHTML = "";
    let total = 0;

    productos.forEach((p, i) => {
        total += p.importe;
        tabla.innerHTML += `
            <tr>
                <td>${p.nom}</td>
                <td>${p.m3}</td>
                <td>$${p.pu.toFixed(2)}</td>
                <td>$${p.importe.toFixed(2)}</td>
                <td class="no-print"><button onclick="eliminarFila(${i})" style="color:red; border:none; background:none; cursor:pointer;">✕</button></td>
            </tr>`;
    });

    document.getElementById('st').innerText = `$${total.toFixed(2)}`;
    document.getElementById('tt').innerText = `$${total.toFixed(2)}`;
}

function eliminarFila(i) {
    productos.splice(i, 1);
    renderTabla();
}

// FUNCIONES DE SINCRONIZACIÓN FIREBASE
async function finalizarYGuardar() {
    if (!window.dbRefs) return alert("Conectando al Hub...");
    
    const { ref, push, set } = window.dbRefs;
    const datos = {
        cliente: document.getElementById('c-nom').value || "Cliente Nuevo",
        obra: document.getElementById('c-obra').value || "S/U",
        total: document.getElementById('tt').innerText,
        fecha: document.getElementById('fecha-actual').value,
        items: productos
    };

    try {
        await set(push(ref(window.db, 'cotizaciones')), datos);
        alert("¡Cotización guardada y sincronizada en el Hub! ✅");
    } catch (e) {
        alert("Error al conectar con la nube");
    }
}

function mostrarHistorial() {
    if (!window.dbRefs) return;
    const { ref, onValue } = window.dbRefs;
    const div = document.getElementById('lista-historial');

    onValue(ref(window.db, 'cotizaciones'), (snapshot) => {
        div.innerHTML = "<h4>Historial en la Nube (Sincronizado):</h4>";
        const data = snapshot.val();
        if (data) {
            Object.keys(data).reverse().forEach(key => {
                const c = data[key];
                div.innerHTML += `
                    <div style="display:flex; justify-content:space-between; background:#fff; padding:8px; margin-bottom:5px; border:1px solid #ddd; border-radius:4px;">
                        <span>${c.fecha} | <b>${c.cliente}</b> (${c.total})</span>
                        <button onclick="borrarDelHub('${key}')" style="color:red; border:none; background:none; cursor:pointer;">Eliminar</button>
                    </div>`;
            });
        } else {
            div.innerHTML += "<p>No hay cotizaciones guardadas.</p>";
        }
    });
}

function borrarDelHub(id) {
    if(confirm("¿Seguro que quieres borrar esta cotización del Hub central?")) {
        window.dbRefs.remove(window.dbRefs.ref(window.db, 'cotizaciones/' + id));
    }
}

function generarPDF() {
    window.print();
}