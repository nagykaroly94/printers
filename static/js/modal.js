let allPrinters = [];
let printers = [];
let currentPage = 1;
let rowsPerPage = 8;

let manageType = "";
let manageData = [];
let managePage = 1;
let manageRowsPerPage = 5;

let currentUzemId = null;
let relationsData = [];
let allRelations = [];

function openModal() {
    document.getElementById("modal").style.display = "block";
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

async function getOptions(url) {
    const res = await fetch(url);
    return await res.json();
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
    console.log(selectedValue)
    if (selectedValue !== null) {
        console.log(selectedValue)
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
            <button onclick="deleteRow('${p.azonosito}')">❌</button>
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
    const totalPages = getcurrentTotalPages();
    const container = document.getElementById("pagination");
    container.innerHTML = "";
    
    // Első oldal gomb
    const firstBtn = document.createElement("button");
    firstBtn.textContent = "Első";
    firstBtn.disabled = currentPage === 1;
    firstBtn.onclick = () => { currentPage = 1; renderTable(); };
    container.appendChild(firstBtn);
    
    for(let i=1;i<=totalPages;i++){
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.disabled = i===currentPage;
        btn.onclick = () => { currentPage=i; renderTable(); };
        container.appendChild(btn);
    }
    
    // Utolsó oldal gomb
    const lastBtn = document.createElement("button");
    lastBtn.textContent = "Utolsó";
    lastBtn.disabled = currentPage === totalPages;
    lastBtn.onclick = () => { currentPage = totalPages; renderTable(); };
    container.appendChild(lastBtn);
}

function clearSearch(e) {
    e.preventDefault(); // ne vegye el a fókuszt
    
    const input = document.getElementById("searchInput");
    input.value = "";
    filterTable(); // újraszűrés
    input.focus(); // maradjon aktív
}

function filterTable() {
    const filter = document.getElementById("searchInput").value.toLowerCase();
    if (!filter) {
        // Ha üres, visszaáll a teljes lista
        printers = [...allPrinters];
    } else {
        printers = allPrinters.filter(p =>
            Object.values(p).some(v => String(v).toLowerCase().includes(filter))
        );
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
    .then(r=>{ if(r.success){ printers = printers.filter(p=>p.azonosito!==id); renderTable(); } else alert("Hiba"); });
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

document.getElementById("addForm").addEventListener("submit", function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    fetch("/add_printer", {
        method: "POST",
        body: formData
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
                openListModal(); // most már csak a modal nyitása
            });
            
        } else {
            alert("Hiba: " + data.error);
        }
    })
    .catch((e) => {
        alert("Hálózati hiba" + e.message);
    });
});
