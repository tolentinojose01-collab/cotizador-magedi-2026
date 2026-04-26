let productos = [];
let catalogo = JSON.parse(localStorage.getItem('magedi_catalogo')) || [];

document.addEventListener('DOMContentLoaded', () => {
    const f = new Date();
    document.getElementById('fecha-actual').value = f.toISOString().split('T')[0];
    setupBuscador();
    setTimeout(mostrarHistorial, 1500);
});

function guardarEnCatalogo() {
    const nom = document.getElementById('db-nom').value.toUpperCase();
    const desc = document.getElementById('db-desc').value;
    const pu = parseFloat(document.getElementById('db-pu').value);

    if (!nom || !desc || isNaN(pu)) return alert("Completa los datos del catálogo");

    const index = catalogo.findIndex(p => p.nom === nom);
    if (index > -1) catalogo[index] = { nom, desc, pu };
    else catalogo.push({ nom, desc, pu });

    localStorage.setItem('magedi_catalogo', JSON.stringify(catalogo));
    alert("Producto guardado en catálogo");
}

function setupBuscador() {
    const input = document.getElementById('db-nom');
    const box = document.getElementById('sugerencias');

    input.addEventListener('input', () => {
        const val = input.value.toUpperCase();
        box.innerHTML = "";
        if (val) {
            const sugerencias = catalogo.filter(p => p.nom.includes(val));
            sugerencias.forEach(p => {
                const div = document.createElement('div');
                div.innerHTML = `<b>${p.nom}</b> - ${p.pu}`;
                div.onclick = () => {
                    document.getElementById('db-nom').value = p.nom;
                    document.getElementById('db-desc').value = p.desc;
                    document.getElementById('db-pu').value = p.pu;
                    box.style.display = 'none';
                };
                box.appendChild(div);
            });
            box.style.display = sugerencias.length ? 'block' : 'none';
        }
    });
}

function agregarFila() {
    const nom = document.getElementById('db-nom').value;
    const desc = document.getElementById('db-desc').value;
    const m3 = parseFloat(document.getElementById('db-m3').value);
    const pu = parseFloat(document.getElementById('db-pu').value);

    if (!nom || isNaN(m3)) return alert("Falta cantidad o producto");

    productos.push({ nom, desc, m3, pu, importe: m3 * pu });
    renderTabla();
}

function renderTabla() {
    const tbody = document.getElementById('cuerpo-tabla');
    tbody.innerHTML = "";
    let st = 0;

    productos.forEach((p, i) => {
        st += p.importe;
        tbody.innerHTML += `<tr>
            <td>${p.nom}</td>
            <td style="text-align:left; font-size:0.8rem;">${p.desc}</td>
            <td>${p.m3}</td>
            <td>$${p.pu.toFixed(2)}</td>
            <td>$${p.importe.toFixed(2)}</td>
            <td class="no-print"><button onclick="eliminarFila(${i})">✕</button></td>
        </tr>`;
    });

    const iv = st * 0.16;
    document.getElementById('st').innerText = `$${st.toFixed(2)}`;
    document.getElementById('iv').innerText = `$${iv.toFixed(2)}`;
    document.getElementById('tt').innerText = `$${(st + iv).toFixed(2)}`;
}

function eliminarFila(i) { productos.splice(i, 1); renderTabla(); }

async function finalizarYGuardar() {
    const { ref, push, set } = window.dbRefs;
    const datos = {
        cliente: document.getElementById('c-nom').value || "S/N",
        total: document.getElementById('tt').innerText,
        fecha: document.getElementById('fecha-actual').value,
        items: productos
    };
    try {
        await set(push(ref(window.db, 'cotizaciones')), datos);
        alert("Sincronizado con Magedi Hub ✅");
    } catch (e) { alert("Error de red"); }
}

function mostrarHistorial() {
    const { ref, onValue, remove } = window.dbRefs;
    onValue(ref(window.db, 'cotizaciones'), (snap) => {
        const hist = document.getElementById('lista-historial');
        hist.innerHTML = "<h4>Cotizaciones Sincronizadas:</h4>";
        const data = snap.val();
        if (data) Object.keys(data).reverse().forEach(k => {
            hist.innerHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:5px; border-bottom:1px solid #eee;">
                <span>${data[k].fecha} - <b>${data[k].cliente}</b></span>
                <button onclick="borrarHub('${k}')" style="color:red; border:none; background:none;">Borrar</button>
            </div>`;
        });
    });
}

function borrarHub(id) {
    if (confirm("¿Eliminar?")) window.dbRefs.remove(window.dbRefs.ref(window.db, 'cotizaciones/' + id));
}

function generarPDF() { window.print(); }