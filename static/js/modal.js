let allPrinters = [];
let printers = [];
let currentPage = 1;
let rowsPerPage = 5;

let manageType = "";
let manageData = [];
let managePage = 1;
let manageRowsPerPage = 5;

let currentUzemId = null;
let relationsData = [];
let allRelations = [];

let tablazatPage = 1;
let tablazatRowsPerPage = 5;

let csoportData = [];
let csoportPage = 1;
let csoportRowsPerPage = 5;


async function openModal() {
    document.getElementById("modal").style.display = "block";
    const uzemSelect = document.querySelector('#modal select[name="uzemelteto"]');
    const cimSelect = document.querySelector('#modal select[name="cim"]');
    const csoportSelect = document.querySelector(".csoport");
    
    // Csoportok betöltése
    const csoportok = await getOptions("/api/get_csoportok");
    
    populateSelect(
        csoportSelect,
        csoportok,
        "csoport",
        "csoport"
    );
    
    // Üzemeltetők betöltése
    const uzemeltetok = await getOptions("/api/list_uzemelteto");
    
    populateSelect(
        uzemSelect,
        uzemeltetok,
        "id",
        "uzemelteto"
    );
    
    // Alapból üres cím lista
    populateSelect(cimSelect, [], "cim_id", "cim");
    
    // Ha változik az üzemeltető → töltsük a címeket
    uzemSelect.addEventListener("change", async () => {
        const selectedUzem = parseInt(uzemSelect.value);
        
        if (isNaN(selectedUzem)) {
            populateSelect(cimSelect, [], "cim_id", "cim");
            return;
        }
        
        const relatedCims = await getOptions(`/api/get_relations_by_uzem/${selectedUzem}`);
        
        populateSelect(
            cimSelect,
            relatedCims,
            "cim_id",
            "cim"
        );
        
    });
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

function openListModal() {
    document.getElementById("listModal").style.display = "block";
    fetch("/get_printers")
    .then(res => res.json())
    .then(data => {
        allPrinters = data;
        printers = [...allPrinters];
        renderTable();
    });
}

function closeListModal() {
    document.getElementById("listModal").style.display = "none";
}

function populateSelect(selectElem, options, valueField, textField, selectedValue = null) {
    if (!selectElem) return;
    
    const wasDisabled = selectElem.disabled; // remember disabled state
    selectElem.disabled = false;              // enable temporarily
    
    selectElem.innerHTML = `<option value="">Nincs megadva</option>`;
    
    options.forEach(opt => {
        const value = opt[valueField];
        const text = opt[textField] || value;
        
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        
        selectElem.appendChild(option);
    });
    if (selectedValue !== null) {
        selectElem.value = String(selectedValue);
    }
    
    selectElem.disabled = wasDisabled; // restore disabled state
}

async function renderTable() {
    const tbody = document.querySelector("#printerTable tbody");
    tbody.innerHTML = "";
    
    // Lekérjük az összes üzemeltetőt egyszer
    const uzemeltetoOptions = await getOptions("/api/uzemelteto");
    
    let start = (currentPage-1) * rowsPerPage;
    let end = start + rowsPerPage;
    let pageData = printers.slice(start, end);
    
    for (const p of pageData) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
        <td>${p.azonosito}</td>
        <td><input class="mfinput" value="${p.gep_helye}" disabled></td>
        <td><input class="mfinput" value="${p.ip}" disabled></td>
        <td><input class="mfinput" value="${p.tipus || ""}" disabled></td>
        <td><input class="mfinput" value="${p.gyari_szam || ""}" disabled></td>
        <td><select class="mfselect uzemelteto" disabled></select></td>
        <td><select class="mfselect cim" disabled></select></td>
        <td class="thfit">
            <button onclick="editRow('${p.azonosito}', this)">🔧</button>
        </td>
    `;
        tbody.appendChild(tr);
        
        const uzemSelect = tr.querySelector(".uzemelteto");
        const cimSelect = tr.querySelector(".cim");
        
        // ——— Determine selected IDs dynamically ———
        let selectedUzemId = null;
        if (p.uzemelteto_id !== undefined) {
            selectedUzemId = p.uzemelteto_id;
        } else if (p.uzemelteto) {
            // Match name to ID
            const match = uzemeltetoOptions.find(u => u.uzemelteto === p.uzemelteto);
            selectedUzemId = match ? match.id : null;
        }
        
        // Fill uzemelteto select
        populateSelect(uzemSelect, uzemeltetoOptions, "id", "uzemelteto", selectedUzemId);
        
        // Fill cim select only if there’s an uzemelteto
        if (selectedUzemId !== null) {
            const relatedCims = await getOptions(`/api/get_relations_by_uzem/${selectedUzemId}`);
            
            let selectedCimId = null;
            if (p.cim_id !== undefined) {
                selectedCimId = p.cim_id;
            } else if (p.cim) {
                const match = relatedCims.find(c => c.cim === p.cim);
                selectedCimId = match ? match.cim_id : null;
            }
            
            populateSelect(cimSelect, relatedCims, "cim_id", "cim", selectedCimId);
        }
        
        // Update cim select when uzemelteto changes
        uzemSelect.addEventListener("change", async () => {
            const selectedUzem = parseInt(uzemSelect.value);
            if (isNaN(selectedUzem)) {
                populateSelect(cimSelect, [], "cim_id", "cim");
                return;
            }
            const relatedCims = await getOptions(`/api/get_relations_by_uzem/${selectedUzem}`);
            populateSelect(cimSelect, relatedCims, "cim_id", "cim");
        });
    }
    
    renderPagination();
}

// Segédfüggvény a fetchhez
async function getOptions(url) {
    const res = await fetch(url);
    if (!res.ok) {
        console.error("Hiba a lekérés során:", res.status, res.statusText);
        return [];
    }
    const data = await res.json();
    return data;
}

// Modal megnyitása
async function openManageModal(type) {
    manageType = type;
    managePage = 1;
    
    // Backend route kiválasztás
    const url = type === "cim" ? "/api/list_cim" : "/api/list_uzemelteto";
    manageData = await getOptions(url);
    
    const title = document.getElementById("manageModalTitle");
    const input = document.getElementById("manageModalInput");
    
    title.textContent = type === "cim" ? "Címek kezelése" : "Üzemeltetők kezelése";
    input.placeholder = type === "cim" ? "Új cím..." : "Új üzemeltető...";
    input.value = "";
    
    document.getElementById("manageModal").style.display = "block";
    
    renderManageModal();
}

// Render modal lista
function renderManageModal() {
    const tbody = document.getElementById("manageModalTable");
    tbody.innerHTML = "";
    
    let start = (managePage - 1) * manageRowsPerPage;
    let end = start + manageRowsPerPage;
    let pageData = manageData.slice(start, end);
    
    pageData.forEach((item, index) => { // ← index most definiálva
        const value = manageType === "cim" ? item.cim : item.uzemelteto;
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${value}</td>
            <td>
                <button onclick="editManageRow(${start + index}, this)">🔧</button>
                <button onclick="deleteManageRow(${start + index})">❌</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    
    renderManagePagination();
}
// Pagination
function renderManagePagination() {
    const div = document.getElementById("manageModalPagination");
    div.innerHTML = "";
    
    const totalPages = Math.ceil(manageData.length / manageRowsPerPage);
    
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        if (i === managePage) btn.disabled = true;
        btn.onclick = () => {
            managePage = i;
            renderManageModal();
        };
        div.appendChild(btn);
    }
}
// Új elem hozzáadása
async function saveManageModal() {
    const value = document.getElementById("manageModalInput").value;
    if (!value) return alert("Nem lehet üres!");
    
    const url = manageType === "cim" ? "/api/add_cim" : "/api/add_uzemelteto";
    
    await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value })
    });
    
    // újratöltjük az adatokat
    const listUrl = manageType === "cim" ? "/api/list_cim" : "/api/list_uzemelteto";
    manageData = await getOptions(listUrl);
    
    document.getElementById("manageModalInput").value = "";
    renderManageModal();
    
    renderTable(); // frissítjük a fő táblázatot
}
// Bezárás
function closeManageModal() {
    document.getElementById("manageModal").style.display = "none";
}

function getcurrentTotalPages() {
    return Math.ceil(printers.length / rowsPerPage);
}

function renderPagination() {
    createPagination({
        containerId: "pagination",
        totalItems: printers.length,
        currentPage: currentPage,
        rowsPerPage: rowsPerPage,
        onPageChange: (page) => {
            currentPage = page;
            renderTable();
        }
    });
}

function clearSearch(e) {
    e.preventDefault(); // ne vegye el a fókuszt
    
    const input = document.getElementById("searchInput");
    input.value = "";
    filterTable(); // újraszűrés
    input.focus(); // maradjon aktív
}

function filterTable() {
    const filter = document.getElementById("searchInput").value.trim().toLowerCase();
    
    if (!filter) {
        printers = [...allPrinters];
    } else {
        printers = allPrinters.filter(p => {
            if (!p.gep_helye) return false;
            return String(p.gep_helye).toLowerCase().includes(filter);
        });
    }
    
    currentPage = 1;
    renderTable();
}

function editRow(id, btn) {
    const row = btn.closest("tr");
    const inputs = row.querySelectorAll("input, select");
    
    const editing = btn.dataset.editing === "true";
    
    if (!editing) {
        // szerkesztés indítása
        inputs.forEach(input => input.disabled = false);
        btn.textContent = "💾";
        btn.dataset.editing = "true";
    } else {
        // mentés
        const p = printers.find(pr => pr.azonosito === id);
        
        p.gep_helye = inputs[0].value;
        p.ip = inputs[1].value;
        p.tipus = inputs[2].value;
        p.gyari_szam = inputs[3].value;
        p.uzemelteto_id = inputs[4].value;
        p.cim_id = inputs[5].value;
        
        fetch("/update_printer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                azonosito: p.azonosito,
                gep_helye: inputs[0].value,
                ip: inputs[1].value,
                tipus: inputs[2].value,
                gyari_szam: inputs[3].value,
                uzemelteto: inputs[4].options[inputs[4].selectedIndex].text,
                cim: inputs[5].options[inputs[5].selectedIndex].text
            })
        })
        .then(r=>r.json())
        .then(r=>{
            if(r.success){
                inputs[0].value = p.gep_helye;
                inputs[1].value = p.ip;
                inputs[2].value = p.tipus;
                inputs[3].value = p.gyari_szam;
                inputs[4].value = p.uzemelteto; // select
                inputs[5].value = p.cim;        // select
                
                inputs.forEach(input => input.disabled = true);
                btn.textContent = "🔧";
                btn.dataset.editing = "false";
                renderTable(); // frissítjük a táblázatot, hogy látszódjon a változás
                
            } else {
                alert("Hiba");
            }
        });
    }
}

function editManageRow(index, btn) {
    const row = btn.closest("tr");
    const input = row.querySelector("td input, td"); // a cellát szerkesztjük
    const editing = btn.dataset.editing === "true";
    
    if (!editing) {
        // szerkesztés indítása
        const value = input.textContent || input.value;
        input.innerHTML = `<input type="text" value="${value}">`;
        btn.textContent = "💾";
        btn.dataset.editing = "true";
    } else {
        // mentés
        const newValue = row.querySelector("input").value;
        
        // frissítjük a tömböt
        const item = manageData[index];
        if (manageType === "cim") item.cim = newValue;
        else item.uzemelteto = newValue;
        
        fetch(manageType === "cim" ? "/api/update_cim" : "/api/update_uzemelteto", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: item.id, value: newValue })
        })
        .then(r => r.json())
        .then(r => {
            if (r.success) {
                // visszaállítjuk a cellát sima szövegre
                row.querySelector("td").textContent = newValue;
                btn.textContent = "🔧";
                btn.dataset.editing = "false";
            } else {
                alert("Hiba a mentés során");
            }
        })
        .catch(() => alert("Hálózati hiba a mentés során"));
    }
}

function deleteManageRow(index) {
    if (!confirm("Biztos törlöd?")) return;
    
    const item = manageData[index];
    const url = manageType === "cim" ? "/api/delete_cim" : "/api/delete_uzemelteto";
    
    fetch(url, {
        method: "POST", // vagy DELETE, ha a backend támogatja
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id })
    })
    .then(res => res.json())
    .then(r => {
        if (r.success) {
            // töröljük a tömbből
            manageData.splice(index, 1);
            // újrarendereljük a modal táblázatot
            renderManageModal();
        } else {
            alert("Hiba a törlés során");
        }
    })
    .catch(() => alert("Hálózati hiba a törlés során"));
}

function deleteRow(id){
    if(!confirm("Biztos törlöd?")) return;
    fetch("/delete_printer/"+id, {method:"DELETE"})
    .then(r=>r.json())
    .then(r=>{ if(r.success){ printers = printers.filter(p=>p.azonosito!==id); renderTable(); loadInitial(); } else alert("Hiba"); });
}

// Modal megnyitása és adatok betöltése
async function openRelationsModal() {
    document.getElementById("relationsModal").style.display = "block";
    
    // Üzemeltetők betöltése
    const uzemRes = await fetch("/api/list_uzemelteto");
    const uzemData = await uzemRes.json();
    const uzemSelect = document.getElementById("newRelationUzem");
    uzemSelect.innerHTML = `<option value="">Válassz üzemeltetőt...</option>`;
    uzemData.forEach(u => {
        const opt = document.createElement("option");
        opt.value = u.id;
        opt.textContent = u.uzemelteto;
        uzemSelect.appendChild(opt);
    });
    
    // Címek betöltése
    const cimRes = await fetch("/api/list_cim");
    const cimData = await cimRes.json();
    const cimSelect = document.getElementById("newRelationCim");
    cimSelect.innerHTML = `<option value="">Válassz címet...</option>`;
    cimData.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        opt.textContent = c.cim;
        cimSelect.appendChild(opt);
    });
    
    await loadRelations(); // meglévő kapcsolatok betöltése
}

// Modal bezárása
function closeRelationsModal() {
    document.getElementById("relationsModal").style.display = "none";
}

function toggleModal() {
    document.querySelectorAll('.modalinput').forEach(input => { input.value = '';});
    closeListModal();
    closeManageModal();
    closeRelationsModal();
    closeModal();
    closeListModaltabla();
    closeCsoportModal();
    toggleMenu(document.querySelector('.hamburger'));
}

// Meglévő kapcsolatok betöltése
async function loadRelations() {
    const res = await fetch("/api/get_relations");
    relationsData = await res.json();
    
    const tbody = document.getElementById("relationTableBody");
    tbody.innerHTML = "";
    
    relationsData.forEach(rel => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${rel.uzemelteto}</td>
            <td>${rel.cim}</td>
            <td>
                <button onclick="deleteRelation(${rel.id})">❌</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Új kapcsolat mentése
async function saveNewRelation() {
    const uzem_id = document.getElementById("newRelationUzem").value;
    const cim_id = document.getElementById("newRelationCim").value;
    
    if(!uzem_id || !cim_id) return alert("Mindkét értéket ki kell választani!");
    
    await fetch("/api/add_relation", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({uzemelteto_id: uzem_id, cim_id: cim_id})
    });
    
    await loadRelations();
}

// Kapcsolat törlése
async function deleteRelation(rel_id) {
    if(!confirm("Biztos törlöd?")) return;
    
    await fetch("/api/delete_relation", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({relation_id: rel_id})
    });
    
    await loadRelations();
}

// Kapcsolat szerkesztése (cím módosítása)
async function editRelation(relation_id, btn) {
    const row = btn.closest("tr");
    const cell = row.querySelector("td");
    const editing = btn.dataset.editing === "true";
    
    if(!editing) {
        const currentValue = cell.textContent;
        cell.innerHTML = `<input type="text" value="${currentValue}">`;
        btn.textContent = "💾";
        btn.dataset.editing = "true";
    } else {
        const newValue = cell.querySelector("input").value;
        const cimRes = await fetch("/api/list_cim");
        const cimData = await cimRes.json();
        const newCim = cimData.find(c => c.cim === newValue);
        if(!newCim) return alert("Érvénytelen cím!");
        
        await fetch("/api/update_relation", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({relation_id, new_cim_id: newCim.id})
        });
        
        cell.textContent = newValue;
        btn.textContent = "💾";
        btn.dataset.editing = "false";
    }
}

// MODAL MEGNYITÁS
async function openListModaltabla() {
    document.getElementById("listModaltabla").style.display = "block";
    
    tablazatPage = 1;
    
    await loadCsoportokModal();
    await loadPrinters();
    
    renderTablecsoport();
}

// MODAL BEZÁRÁS
function closeListModaltabla() {
    document.getElementById("listModaltabla").style.display = "none";
}

// ADATBETÖLTÉS
async function loadPrinters() {
    const res = await fetch("/get_printers");
    printers = await res.json();
    allPrinters = [...printers];
}

function renderPaginationTabla() {
    createPagination({
        containerId: "tablazatPagination",
        totalItems: printers.length,
        currentPage: tablazatPage,
        rowsPerPage: tablazatRowsPerPage,
        onPageChange: (page) => {
            tablazatPage = page;
            renderTablecsoport();
        }
    });
}

// TÁBLÁZAT RENDER (CSAK 2 ADAT)
function renderTablecsoport() {
    const tbody = document.querySelector("#printerTabletabla tbody");
    tbody.innerHTML = "";
    
    const start = (tablazatPage - 1) * tablazatRowsPerPage;
    const end = start + tablazatRowsPerPage;
    const pageData = printers.slice(start, end);
    
    pageData.forEach((p) => {
        const tr = document.createElement("tr");
        
        tr.innerHTML = `
            <td>${p.azonosito}</td>
            <td>
                <select class="mfselect" disabled></select>
            </td>
            <td>
                <button onclick="editRowtablazat('${p.azonosito}', this)" data-editing="false">🔧</button>
            </td>
        `;
        
        tbody.appendChild(tr);
        
        const select = tr.querySelector("select");
        
        csoportData.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.csoport;
            opt.textContent = c.csoport;
            
            if (c.csoport === p.tablazat) {
                opt.selected = true;
            }
            
            select.appendChild(opt);
        });
    });
    
    renderPaginationTabla();
}
async function loadCsoportokModal() {
    const res = await fetch('/api/get_csoportok');
    csoportData = await res.json();
}
async function init() {
    await loadCsoportokModal();   // 1. DB
    await loadPrinters();    // 2. nyomtatók
    renderTablecsoport();      // 3. UI
}
function filterTabletablazat() {
    const filter = document.getElementById("searchInputtablazat").value.trim().toLowerCase();
    
    if (!filter) {
        printers = [...allPrinters];
    } else {
        printers = allPrinters.filter(p => {
            if (!p.azonosito) return false;
            return String(p.azonosito).toLowerCase().includes(filter);
        });
    }
    
    tablazatPage = 1;
    renderTablecsoport();
}
function clearSearchtablazat(e) {
    e.preventDefault(); // ne vegye el a fókuszt
    
    const input = document.getElementById("searchInputtablazat");
    input.value = "";
    filterTabletablazat(); // újraszűrés
    input.focus(); // maradjon aktív
}
function editRowtablazat(id, btn) {
    const row = btn.closest("tr");
    const inputs = row.querySelectorAll("input, select");
    
    const editing = btn.dataset.editing === "true";
    
    if (!editing) {
        // szerkesztés indítása
        inputs.forEach(input => input.disabled = false);
        btn.textContent = "💾";
        btn.dataset.editing = "true";
    } else {
        // mentés
        const p = printers.find(pr => pr.azonosito === id);
        
        p.tablazat = inputs[0].value;
        
        fetch("/update_printer_tablazat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                azonosito: p.azonosito,
                tablazat: inputs[0].value,
            })
        })
        .then(r=>r.json())
        .then(r=>{
            if(r.success){
                inputs[0].value = p.tablazat;
                
                inputs.forEach(input => input.disabled = true);
                btn.textContent = "🔧";
                btn.dataset.editing = "false";
                renderTablecsoport(); // frissítjük a táblázatot, hogy látszódjon a változás
                
            } else {
                alert("Hiba");
            }
        });
    }
}
/* -------------------------
Csoport Modal
------------------------- */
async function openCsoportModal() {
    document.getElementById("csoportModal").style.display = "block";
    await loadCsoportokApp();
    renderCsoportok();
}
function closeCsoportModal() {
    document.getElementById("csoportModal").style.display = "none";
}
async function loadCsoportokApp() {
    const res = await fetch('/api/get_csoportok');
    csoportData = await res.json();
    csoportPage = 1;
}

function renderPaginationcsoport() {
    createPagination({
        containerId: "csoportPagination",
        totalItems: csoportData.length,
        currentPage: csoportPage,
        rowsPerPage: csoportRowsPerPage,
        onPageChange: (page) => {
            csoportPage = page;
            renderCsoportok();
        }
    });
}

async function renderCsoportok() {
    const tbody = document.getElementById("csoportTableBody");
    tbody.innerHTML = "";
    
    const start = (csoportPage - 1) * csoportRowsPerPage;
    const end = start + csoportRowsPerPage;
    const pageData = csoportData.slice(start, end);
    
    pageData.forEach(csoport => {
        const tr = document.createElement("tr");
        
        tr.innerHTML = `
            <td>
                <input type="text" class="mfinput" value="${csoport.csoport}" disabled>
            </td>
            <td>
                <button onclick="updateCsoport(${csoport.id}, this)" data-editing="false">🔧</button>
                <button onclick="deleteCsoport(${csoport.id})">❌</button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    await loadCsoportokApp();
    renderPaginationcsoport();
}

// Új csoport
function addCsoport() {
    const input = document.getElementById("newCsoportInput");
    const name = input.value.trim();
    
    if (!name) return;
    
    fetch('/api/add_csoport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csoport: name })
    })
    .then(r => r.json())
    .then(r => {
        if (r.success) {
            input.value = "";
            loadCsoportokApp();
        } else {
            alert("Hiba hozzáadáskor");
        }
    })
    .catch(() => alert("Hálózati hiba"));
    
    renderCsoportok();
}
// Inline módosítás
async function updateCsoport(id, btn) {
    const row = btn.closest("tr");
    const input = row.querySelector("input");
    const editing = btn.dataset.editing === "true";
    
    if (!editing) {
        input.disabled = false;
        input.focus();
        
        btn.textContent = "💾";
        btn.dataset.editing = "true";
    } else {
        const newValue = input.value.trim();
        
        const res = await fetch('/api/update_csoport', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, csoport: newValue })
        });
        
        const r = await res.json();
        
        if (r.success) {
            await loadCsoportokApp();
            renderCsoportok();
        } else {
            alert("Hiba mentéskor");
        }
    }
}

// Törlés
async function deleteCsoport(id) {
    if (!confirm("Biztos törlöd?")) return;
    
    await fetch("/api/delete_csoport", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ id })
    });
    
    await loadCsoportokApp();
    
    const totalPages = Math.ceil(csoportData.length / csoportRowsPerPage);
    if (csoportPage > totalPages) {
        csoportPage = totalPages || 1;
    }
    
    renderCsoportok();
}

document.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
        const active = document.activeElement;
        if (active && active.tagName === "INPUT" && !active.disabled) {
            const row = active.closest("tr");
            const btn = row.querySelector("button[data-editing='true']");
            if (btn) btn.click();
        }
    }
});

document.getElementById("addForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const form = document.getElementById("addForm");
    const inputs = form.querySelectorAll("input, select");
    const formData = new FormData(this);
    
    fetch("/add_printer", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            azonosito: inputs[0].value,
            gep_helye: inputs[1].value,
            ip: inputs[2].value,
            tipus: inputs[3].value,
            gyari_szam: inputs[4].value,
            uzemelteto: inputs[5].options[inputs[5].selectedIndex].text,
            cim: inputs[6].options[inputs[6].selectedIndex].text,
            csoport: inputs[7].value
        })
    })
    
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert("Sikeres mentés!");
            closeModal();
            this.reset();
            
            // Frissítjük az adatokat
            fetch("/get_printers")
            .then(res => res.json())
            .then(printerData => {
                allPrinters = printerData;
                printers = [...allPrinters];
                // Az új elem az utolsó oldalon legyen
                currentPage = Math.ceil(printers.length / rowsPerPage);
                renderTable();
                loadInitial();
            });
            
        } else {
            alert("Hiba: " + data.error);
        }
    })
    .catch((e) => {
        alert("Hálózati hiba" + e.message);
    });
});
