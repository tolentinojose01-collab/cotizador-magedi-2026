let productos = [];
let catalogoProductos = JSON.parse(localStorage.getItem('magedi_catalogo')) || [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('fecha-actual').valueAsDate = new Date();
    // Esperar un segundo a que Firebase cargue
    setTimeout(mostrarHistorial, 1500);
    setupBuscador();
});

function setupBuscador() {
    const inputNom = document.getElementById('db-nom');
    const sugerenciasBox = document.getElementById('sugerencias');

    inputNom.addEventListener('input', () => {
        const busca = inputNom.value.toUpperCase();
        sugerenciasBox.innerHTML = "";
        if (busca.length > 0) {
            const filtrados = catalogoProductos.filter(p => p.nom.includes(busca));
            filtrados.forEach(p => {
                const div = document.createElement('div');
                div.className = 'sugerencia-item';
                div.innerHTML = `<strong>${p.nom}</strong> - $${p.pu}`;
                div.onclick = () => {
                    document.getElementById('db-nom').value = p.nom;
                    document.getElementById('db-desc').value = p.desc;
                    document.getElementById('db-pu').value = p.pu;
                    sugerenciasBox.style.display = 'none';
                };
                sugerenciasBox.appendChild(div);
            });
            sugerenciasBox.style.display = filtrados.length > 0 ? 'block' : 'none';
        } else {
            sugerenciasBox.style.display = 'none';
        }
    });
}

function agregarFila() {
    const nom = document.getElementById('db-nom').value;
    const desc = document.getElementById('db-desc').value;
    const m3 = parseFloat(document.getElementById('db-m3').value);
    const pu = parseFloat(document.getElementById('db-pu').value);

    if (!nom || !m3 || !pu) return alert("Completa los campos del producto");

    const importe = m3 * pu;
    productos.push({ nom, desc, m3, pu, importe });
    renderTabla();
    limpiarCamposConcepto();
}

function renderTabla() {
    const tabla = document.getElementById('cuerpo-tabla');
    tabla.innerHTML = "";
    let subtotal = 0;

    productos.forEach((p, index) => {
        subtotal += p.importe;
        tabla.innerHTML += `
            <tr>
                <td>${p.nom}</td>
                <td>${p.desc}</td>
                <td>${p.m3}</td>
                <td>$${p.pu.toFixed(2)}</td>
                <td>$${p.importe.toFixed(2)}</td>
                <td class="no-print"><button onclick="eliminarFila(${index})" style="background:red; color:white; border:none; border-radius:3px;">X</button></td>
            </tr>`;
    });

    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    document.getElementById('st').innerText = `$${subtotal.toFixed(2)}`;
    document.getElementById('iv').innerText = `$${iva.toFixed(2)}`;
    document.getElementById('tt').innerText = `$${total.toFixed(2)}`;
}

function eliminarFila(i) {
    productos.splice(i, 1);
    renderTabla();
}

function limpiarCamposConcepto() {
    ['db-nom', 'db-desc', 'db-m3', 'db-pu'].forEach(id => document.getElementById(id).value = "");
}

// FUNCIONES FIREBASE HUB
async function finalizarYGuardar() {
    if (!window.dbRefs) return alert("Esperando conexión con el Hub...");
    
    const { ref, push, set } = window.dbRefs;
    const cotizacionesRef = ref(window.db, 'cotizaciones');
    const nuevaCotRef = push(cotizacionesRef);

    const datos = {
        cliente: document.getElementById('c-nom').value || "Cliente Genérico",
        obra: document.getElementById('c-obra').value || "No especificada",
        total: document.getElementById('tt').innerText,
        vendedor: document.getElementById('v-nombre').value,
        items: productos,
        fecha: document.getElementById('fecha-actual').value
    };

    try {
        await set(nuevaCotRef, datos);
        alert("Sincronizado con el Hub de Magedi");
    } catch (e) {
        alert("Error de conexión");
    }
}

function mostrarHistorial() {
    if (!window.dbRefs) return;
    const { ref, onValue } = window.dbRefs;
    const div = document.getElementById('lista-historial');

    onValue(ref(window.db, 'cotizaciones'), (snapshot) => {
        div.innerHTML = "<h4>Cotizaciones en el Hub (Nube):</h4>";
        const data = snapshot.val();
        if (data) {
            Object.keys(data).reverse().forEach(key => {
                const c = data[key];
                div.innerHTML += `
                    <div class="historial-item" style="border-bottom:1px solid #eee; padding:5px; display:flex; justify-content:space-between;">
                        <span><strong>${c.cliente}</strong> - ${c.total}</span>
                        <button onclick="borrarDelHub('${key}')" style="color:red; background:none; border:none; cursor:pointer;">Eliminar</button>
                    </div>`;
            });
        }
    });
}

function borrarDelHub(id) {
    if(confirm("¿Eliminar del Hub central?")) {
        window.dbRefs.remove(window.dbRefs.ref(window.db, 'cotizaciones/' + id));
    }
}

function generarPDF() {
    const { jsPDF } = window.jspdf;
    const noPrint = document.querySelectorAll('.no-print');
    noPrint.forEach(el => el.style.display = 'none');
    
    html2canvas(document.getElementById('cotizacion-final'), { scale: 2, useCORS: true }).then(canvas => {
        const img = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'pt', 'a4');
        const width = pdf.internal.pageSize.getWidth();
        const height = (canvas.height * width) / canvas.width;
        pdf.addImage(img, 'PNG', 0, 0, width, height);
        pdf.save(`Magedi_${document.getElementById('c-nom').value}.pdf`);
        noPrint.forEach(el => el.style.display = 'block');
    });
}

function nuevaCotizacion() {
    if(confirm("¿Limpiar todo?")) location.reload();
}