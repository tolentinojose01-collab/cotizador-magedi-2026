let productos = [];
let catalogoProductos = JSON.parse(localStorage.getItem('magedi_catalogo')) || [];

document.addEventListener('DOMContentLoaded', () => {
    // Fecha automática ajustada a hoy
    const hoy = new Date();
    const offset = hoy.getTimezoneOffset();
    const fechaLocal = new Date(hoy.getTime() - (offset * 60 * 1000));
    document.getElementById('fecha-actual').value = fechaLocal.toISOString().split('T')[0];
    
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
            const filtrados = catalogoProductos.filter(p => p.nom.includes(busca) || p.desc.toUpperCase().includes(busca));
            filtrados.forEach(p => {
                const div = document.createElement('div');
                div.className = 'sugerencia-item';
                div.innerHTML = `<strong>${p.nom}</strong> - <small>${p.desc}</small>`;
                div.onclick = () => {
                    document.getElementById('db-nom').value = p.nom;
                    document.getElementById('db-desc').value = p.desc;
                    document.getElementById('db-pu').value = p.pu;
                    sugerenciasBox.style.display = 'none';
                };
                sugerenciasBox.appendChild(div);
            });
            sugerenciasBox.style.display = filtrados.length > 0 ? 'block' : 'none';
        } else { sugerenciasBox.style.display = 'none'; }
    });
}

function agregarFila() {
    const nom = document.getElementById('db-nom').value.toUpperCase();
    const desc = document.getElementById('db-desc').value;
    const m3 = parseFloat(document.getElementById('db-m3').value);
    const pu = parseFloat(document.getElementById('db-pu').value);
    if (!nom || isNaN(m3) || isNaN(pu)) return alert("Completa Nomenclatura, m3 y Precio.");
    productos.push({ nom, desc: desc || "-", m3, pu, total: m3 * pu });
    renderTabla();
    limpiarCamposConcepto();
}

function guardarEnCatalogo() {
    const nom = document.getElementById('db-nom').value.toUpperCase();
    const desc = document.getElementById('db-desc').value;
    const pu = parseFloat(document.getElementById('db-pu').value);
    const m3 = parseFloat(document.getElementById('db-m3').value);
    if (!nom || isNaN(pu)) return alert("Nomenclatura y Precio obligatorios.");
    const index = catalogoProductos.findIndex(p => p.nom === nom);
    if (index > -1) { catalogoProductos[index] = { nom, desc: desc || "-", pu }; }
    else { catalogoProductos.push({ nom, desc: desc || "-", pu }); }
    localStorage.setItem('magedi_catalogo', JSON.stringify(catalogoProductos));
    if (!isNaN(m3)) { productos.push({ nom, desc: desc || "-", m3, pu, total: m3 * pu }); renderTabla(); }
    alert("Guardado en catálogo.");
    limpiarCamposConcepto();
}

function renderTabla() {
    const tbody = document.getElementById('cuerpo-tabla');
    tbody.innerHTML = "";
    let subtotal = 0;
    productos.forEach((p, i) => {
        subtotal += p.total;
        tbody.innerHTML += `<tr>
            <td>${p.nom}</td><td>${p.m3}</td><td>${p.desc}</td>
            <td>$${p.pu.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
            <td>$${p.total.toLocaleString('es-MX', {minimumFractionDigits: 2})}</td>
            <td class="no-print"><button onclick="productos.splice(${i},1);renderTabla()" style="background:red; color:white; border:none; padding:2px 8px; border-radius:3px;">X</button></td>
        </tr>`;
    });
    const iva = subtotal * 0.16;
    document.getElementById('st').innerText = `$${subtotal.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
    document.getElementById('iv').innerText = `$${iva.toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
    document.getElementById('tt').innerText = `$${(subtotal + iva).toLocaleString('es-MX', {minimumFractionDigits: 2})}`;
}

async function finalizarYGuardar() {
    if(!window.dbRefs) return alert("Conectando con Firebase...");
    const { ref, push, set } = window.dbRefs;

    const datos = {
        cliente: document.getElementById('c-nom').value || "S/N",
        empresa: document.getElementById('c-empresa').value || "S/N",
        obra: document.getElementById('c-obra').value || "S/N",
        v_nom: document.getElementById('v-nombre').value,
        v_tel: document.getElementById('v-tel').value,
        v_cor: document.getElementById('v-correo').value,
        total: document.getElementById('tt').innerText,
        fecha: document.getElementById('fecha-actual').value,
        items: [...productos]
    };

    try {
        await set(push(ref(window.db, 'cotizaciones')), datos);
        alert("Cotización sincronizada en el Hub ✅");
    } catch (e) {
        alert("Error al sincronizar");
    }
}

function mostrarHistorial() {
    if(!window.dbRefs) return;
    const { ref, onValue } = window.dbRefs;
    const div = document.getElementById('lista-historial');

    onValue(ref(window.db, 'cotizaciones'), (snapshot) => {
        div.innerHTML = "<h4 style='margin-top:20px;'>Historial Hub (PC/Celular):</h4>";
        const data = snapshot.val();
        if (data) {
            Object.keys(data).reverse().forEach(key => {
                const h = data[key];
                div.innerHTML += `
                    <div style="display:flex; justify-content:space-between; background:#fff; padding:8px; border:1px solid #ddd; margin-bottom:5px; border-radius:4px;">
                        <span style="color:var(--azul); cursor:pointer;" onclick='cargarDeHub(${JSON.stringify(h)})'>
                            <strong>${h.cliente}</strong> - ${h.total} (${h.fecha})
                        </span>
                        <button onclick="borrarDeHub('${key}')" style="color:red; border:none; background:none; cursor:pointer;">Eliminar</button>
                    </div>`;
            });
        }
    });
}

function cargarDeHub(h) {
    document.getElementById('c-nom').value = h.cliente;
    document.getElementById('c-empresa').value = h.empresa;
    document.getElementById('c-obra').value = h.obra;
    document.getElementById('v-nombre').value = h.v_nom || "";
    document.getElementById('v-tel').value = h.v_tel || "";
    document.getElementById('v-correo').value = h.v_cor || "";
    document.getElementById('fecha-actual').value = h.fecha;
    productos = h.items;
    renderTabla();
}

function borrarDeHub(id) {
    if(confirm("¿Borrar del Hub central?")) {
        window.dbRefs.remove(window.dbRefs.ref(window.db, 'cotizaciones/' + id));
    }
}

function limpiarCamposConcepto() {
    ['db-nom', 'db-desc', 'db-m3', 'db-pu'].forEach(id => document.getElementById(id).value = "");
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
        pdf.save(`Cot_Magedi_${Date.now()}.pdf`);
        noPrint.forEach(el => el.style.display = 'flex');
    });
}

function capturarImagen() {
    const noPrint = document.querySelectorAll('.no-print');
    noPrint.forEach(el => el.style.display = 'none');
    
    html2canvas(document.getElementById('cotizacion-final'), { scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Cot_Magedi_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        noPrint.forEach(el => el.style.display = 'flex');
    });
}

function nuevaCotizacion() {
    if(confirm("¿Limpiar todo el formato?")) location.reload();
}