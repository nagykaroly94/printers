let allPrinters = [];
let printers = [];
let currentPage = 1;
let rowsPerPage = 8;

let manageType = "";
let manageData = [];
let managePage = 1;
let manageRowsPerPage = 5;

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

function populateSelect(selectElem, options, valueField, selectedValue) {
    if (!selectElem) return; // védelem ha nincs elem
    
    selectElem.innerHTML = `<option value="">Nincs megadva</option>`;
    
    options.forEach(opt => {
        const value = opt[valueField];
        
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        
        if (value === selectedValue) {
            option.selected = true;
        }
        
        selectElem.appendChild(option);
    });
}

async function renderTable() {
    const tbody = document.querySelector("#printerTable tbody");
    tbody.innerHTML = "";
    
    // Lekérjük az összes select opciót egyszer
    const [uzemelteto, cim] = await Promise.all([
        getOptions("/api/uzemelteto"), 
        getOptions("/api/cim")
    ]);
    
    let start = (currentPage-1)*rowsPerPage;
    let end = start + rowsPerPage;
    let pageData = printers.slice(start,end);
    
    pageData.forEach(p => {
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
        
        // Feltöltjük a selecteket az adatbázisból
        populateSelect(tr.querySelector(".uzemelteto"), uzemelteto, "uzemelteto", p.uzemelteto);
        populateSelect(tr.querySelector(".cim"), cim, "cim", p.cim);
    });
    
    renderPagination();
}

// Fetch helper
async function getOptions(url) {
    const res = await fetch(url);
    const data = await res.json();
    console.log("Fetch data:", data);  // ← ide teszt
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
        p.uzemelteto = inputs[4].value;
        p.cim = inputs[5].value;
        
        fetch("/update_printer", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify(p)
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