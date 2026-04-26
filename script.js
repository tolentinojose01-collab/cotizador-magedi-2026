let productos = [];
let catalogoProductos = JSON.parse(localStorage.getItem('magedi_catalogo')) || [];

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('fecha-actual').valueAsDate = new Date();
    // Esperamos un momento a que Firebase se inicialice
    setTimeout(mostrarHistorial, 1000);
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
        }
    });
}

function agregarFila() {
    const nom = document.getElementById('db-nom').value;
    const desc = document.getElementById('db-desc').value;
    const m3 = parseFloat(document.getElementById('db-m3').value);
    const pu = parseFloat(document.getElementById('db-pu').value);

    if (!nom || isNaN(m3) || isNaN(pu)) return alert("Faltan datos del producto");

    const importe = m3 * pu;
    productos.push({ nom, desc, m3, pu, importe });
    renderTabla();
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
                <td class="no-print"><button onclick="eliminarFila(${index})" style="color:red; border:none; background:none; cursor:pointer;">✕</button></td>
            </tr>`;
    });

    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    document.getElementById('st').innerText = `$${subtotal.toFixed(2)}`;
    document.getElementById('iv').innerText = `$${iva.toFixed(2)}`;
    document.getElementById('tt').innerText = `$${total.toFixed(2)}`;
}

function eliminarFila(index) {
    productos.splice(index, 1);
    renderTabla();
}

// SINCRONIZACIÓN CON FIREBASE HUB
async function finalizarYGuardar() {
    if (!window.dbRefs) return alert("Conectando al Hub...");
    
    const { ref, push, set } = window.dbRefs;
    const cotizacionesRef = ref(window.db, 'cotizaciones');
    const nuevaCotRef = push(cotizacionesRef);

    const datos = {
        cliente: document.getElementById('c-nom').value || "Cliente Nuevo",
        obra: document.getElementById('c-obra').value || "S/U",
        total: document.getElementById('tt').innerText,
        vendedor: document.getElementById('v-nombre').value,
        fecha: document.getElementById('fecha-actual').value,
        items: productos
    };

    try {
        await set(nuevaCotRef, datos);
        alert("Cotización enviada al Hub de Magedi ✅");
    } catch (e) {
        alert("Error al guardar en la nube");
    }
}

function mostrarHistorial() {
    if (!window.dbRefs) return;
    const { ref, onValue } = window.dbRefs;
    const div = document.getElementById('lista-historial');

    onValue(ref(window.db, 'cotizaciones'), (snapshot) => {
        div.innerHTML = "<h4>Cotizaciones Sincronizadas:</h4>";
        const data = snapshot.val();
        if (data) {
            Object.keys(data).reverse().forEach(key => {
                const c = data[key];
                div.innerHTML += `
                    <div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #eee; background:#fff; margin-bottom:5px;">
                        <span><strong>${c.cliente}</strong> (${c.total})</span>
                        <button onclick="borrarDelHub('${key}')" style="color:red; border:none; background:none; cursor:pointer;">Eliminar</button>
                    </div>`;
            });
        } else {
            div.innerHTML += "<p>No hay cotizaciones en el Hub.</p>";
        }
    });
}

function borrarDelHub(id) {
    if(confirm("¿Borrar permanentemente del Hub?")) {
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
        pdf.save(`MAGEDI_${document.getElementById('c-nom').value}.pdf`);
        noPrint.forEach(el => el.style.display = 'block');
    });
}

function nuevaCotizacion() {
    if(confirm("¿Deseas limpiar el formato actual?")) location.reload();
}