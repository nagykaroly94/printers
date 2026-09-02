let timer = null;
let isRunning = false;
let rowState = {};

/* -------------------------
INIT
------------------------- */
window.onload = function () {
    if (window.location.pathname == "/index") {
        loadInitial();
        document.getElementById("bar").style.width = "0%";
    }
};


/* -------------------------
SSE (Server-Sent Events)
------------------------- */
const events = new EventSource("/events");

events.onmessage = (event) => {
    showToast(event.data);
};

function showToast(message) {
    const container = document.getElementById("toast-container");
    
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Remove it after the animation finishes
    setTimeout(() => {
        toast.remove();
    }, 3100);
}

/* -------------------------
START
------------------------- */

function start() {
    if (window.location.pathname !== "/index") {
        window.location.href = "/index?autostart=1";
        return;
    }
    
    fetch("/start");
    
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
    
    isRunning = true;
    
    document.getElementById("bar").style.width = "0%";
    
    loadInitial();
    
    timer = setInterval(update, 1000);
}

window.addEventListener("load", function () {
    const params = new URLSearchParams(window.location.search);
    
    if (params.get("autostart") === "1") {
        start();
    }
});

function formatDate(dt) {
    if (!dt || dt === "N/A") return "N/A";
    
    const d = new Date(dt);
    
    if (isNaN(d.getTime())) return "N/A";
    
    return d.toLocaleString('hu-HU', {
        timeZone: 'Europe/Budapest'
    });
}
/* -------------------------
INITIAL LOAD
------------------------- */
function loadInitial() {
    fetch("/get_printers")
    .then(r => r.json())
    .then(rows => {
        let fakeResults = {};
        
        rows.forEach(r => {
            fakeResults[r.azonosito] = {
                id: r.azonosito,
                name: r.gep_helye,
                ip: r.ip,
                type: r.tipus,
                serial: r.gyari_szam,
                pages: r.oldalszam,
                cim: r.cim,
                uzemelteto: r.uzemelteto,
                tablazat: r.tablazat,
                rogzitve: r.rogzitve,
                status: r.status
            };
        });
        
        renderTables(fakeResults);
    });
}

/* -------------------------
STATUS POLLING
------------------------- */
function update() {
    fetch("/status")
    .then(r => r.json())
    .then(data => {
        
        let count = data.processed || 0;
        let total = data.total ?? 1;
        
        let percent = total > 0
        ? Math.min(100, Math.round((count / total) * 100))
        : 0;
        
        document.getElementById("bar").style.width = percent + "%";
        
        if (data.updates) {
            data.updates.forEach(u => updateRow(u));
        }
        
        if (!data.running || count >= total) {
            clearInterval(timer);
            timer = null;
            isRunning = false;
            loadInitial();
            return;
        }
    });
}

/* -------------------------
RENDER TABLES
------------------------- */
function renderTables(results) {
    let tables_div = document.getElementById("tables");
    tables_div.innerHTML = "";
    
    let grouped = {};
    
    for (let id in results) {
        let r = results[id];
        let key = r.tablazat || "Nincs táblázat";
        
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
    }
    
    Object.keys(grouped)
    .sort((a, b) => {
        if (a === "Nincs táblázat") return -1;
        if (b === "Nincs táblázat") return 1;
        return a.localeCompare(b, 'hu');
    })
    .forEach(key => {
        
        grouped[key].sort((a, b) =>
            (a.id || "").localeCompare(b.id || "", 'hu')
    );
    
    let h2 = document.createElement("h2");
    h2.textContent = key;
    
    let table = document.createElement("table");
    
    table.innerHTML = `
                <tr>
                    <th>ID</th>
                    <th>Hely</th>
                    <th>IP</th>
                    <th>Típus</th>
                    <th>Sorozatszám</th>
                    <th>Oldalszám</th>
                    <th>Üzemeltető</th>
                    <th>Cím</th>
                    <th>Rögzítve</th>
                    <th>Művelet</th>
                </tr>
            `;
    
    grouped[key].forEach(r => {
        
        let color = "#3b82f6";
        let extraClass = "";
        
        if (r.status === "ok") {
            color = "#22c55e";
        } else if (r.status === "error") {
            color = "#ef4444";
        }
        
        if (isRunning) {
            extraClass = "blink";
        }
        
        let rowClass = "";
        
        if (r.rogzitve) {
            const rogzitveDate = new Date(r.rogzitve);
            const now = new Date();
            const diffDays =
            (now - rogzitveDate) / (1000 * 60 * 60 * 24);
            
            if (diffDays > 7) {
                rowClass = "error-row";
                color = "#ffffff";
            }
        }
        
        rowState[r.id] = {
            extraClass: extraClass,
            status: r.status,
            ip: r.ip
        };
        
        table.innerHTML += `
                <tr class="${rowClass}" data-id="${r.id}">
                    <td data-field="id">${r.id}</td>
                    <td data-field="name">${r.name}</td>
                    <td data-field="ip">
                        <a href="http://${r.ip}" target="_blank"
                        class="${extraClass}"
                        style="color:${color};text-decoration:none;">
                        ${r.ip}
                        </a>
                    </td>
                    <td data-field="type">${r.type}</td>
                    <td data-field="serial">${r.serial}</td>
                    <td data-field="pages">${r.pages}</td>
                    <td data-field="uzemelteto">${r.uzemelteto}</td>
                    <td data-field="cim">${r.cim}</td>
                    <td data-field="rogzitve">${r.rogzitve ? new Date(r.rogzitve).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' }) : "N/A"}</td>
                    <!--Itt hozza létre dinamikusan a gombot-->
                    <td>
                        <button style="mfctnr button" title="Oldalszám módosítása" onclick="updatePageCount(${r.id})">📃</button>
                        <button style="mfctnr button" title="Oldalszám módosítása" onclick="editPrinterInline(${r.id}, this)">🔧</button>
                        <button style="mfctnr button" title="Nyomtató törlése" onclick="deleteRow(${r.id})">❌</button>
                    </td>
                </tr>
                `;
    });
    
    let btn = document.createElement("button");
    btn.textContent = "Táblázat letöltés";
    btn.style.marginBottom = "10px";
    
    btn.onclick = function () {
        const safeKey = key
        .split('/')
        .map(encodeURIComponent)
        .join('/');
        
        window.location.href = `/printer_pages/${safeKey}.xlsx`;
    };
    
    tables_div.appendChild(h2);
    tables_div.appendChild(btn);
    tables_div.appendChild(table);
    
    let hr = document.createElement("hr");
    hr.className = "separator";
    tables_div.appendChild(hr);
});
}
/* -------------------------
UPDATE PAGE COUNT
------------------------- */
async function updatePageCount(printer_id) {
    const count = Number.parseInt(window.prompt("Add meg az oldalszámot:", "1"), 10);
    if (Number.isInteger(count)) {
        await fetch("/api/update_printer_count", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({ "printer_id" : printer_id, "page_count": count })
        });
        loadInitial();
    } else {
        alert("Az oldalszámnak egész számnak kell lennie!")
    }
}

/* -------------------------
INLINE PRINTER EDIT
------------------------- */
async function editPrinterInline(printer_id, btn) {
    const row = btn.closest("tr");
    if (!row) return;
    
    const editing = btn.dataset.editing === "true";
    
    // ---------------------------------
    // SZERKESZTÉS ELINDÍTÁSA
    // ---------------------------------
    if (!editing) {
        
        const printer = await fetch("/get_printers")
        .then(r => r.json())
        .then(rows => rows.find(p => String(p.azonosito) === String(printer_id)));
        
        if (!printer) {
            alert("A nyomtató nem található!");
            return;
        }
        
        // Eredeti értékek eltárolása
        row.dataset.originalName = printer.gep_helye || "";
        row.dataset.originalIp = printer.ip || "";
        row.dataset.originalType = printer.tipus || "";
        row.dataset.originalSerial = printer.gyari_szam || "";
        row.dataset.originalUzemelteto = printer.uzemelteto || "";
        row.dataset.originalCim = printer.cim || "";
        
        // Hely
        row.querySelector('[data-field="name"]').innerHTML = `
            <input
                class="mfinput"
                type="text"
                value="${escapeHtml(printer.gep_helye || "")}"
            >
        `;
        
        // IP
        const ipCell = row.querySelector('[data-field="ip"]');
        
        if (ipCell) {
            ipCell.innerHTML = `
        <input
            class="mfinput"
            type="text"
            value="${escapeHtml(printer.ip || "")}"
        >
    `;
        }
        
        // Típus
        row.querySelector('[data-field="type"]').innerHTML = `
            <input
                class="mfinput"
                type="text"
                value="${escapeHtml(printer.tipus || "")}"
            >
        `;
        
        // Sorozatszám
        row.querySelector('[data-field="serial"]').innerHTML = `
            <input
                class="mfinput"
                type="text"
                value="${escapeHtml(printer.gyari_szam || "")}"
            >
        `;
        
        // Üzemeltető
        const uzemCell = row.querySelector('[data-field="uzemelteto"]');
        uzemCell.innerHTML = `
            <select class="mfselect inline-uzemelteto">
                <option value="">Nincs megadva</option>
            </select>
        `;
        
        const uzemSelect = uzemCell.querySelector("select");
        
        const uzemeltetok = await getOptions("/api/list_uzemelteto");
        
        uzemeltetok.forEach(u => {
            const option = document.createElement("option");
            option.value = u.uzemelteto;
            option.textContent = u.uzemelteto;
            
            if (u.uzemelteto === printer.uzemelteto) {
                option.selected = true;
            }
            
            uzemSelect.appendChild(option);
        });
        
        // Cím
        const cimCell = row.querySelector('[data-field="cim"]');
        cimCell.innerHTML = `
            <select class="mfselect inline-cim">
                <option value="">Nincs megadva</option>
            </select>
        `;
        
        const cimSelect = cimCell.querySelector("select");
        
        // Ha van üzemeltető, akkor a hozzá tartozó címeket kérjük le
        let selectedUzemId = printer.uzemelteto_id;
        
        if (!selectedUzemId && printer.uzemelteto) {
            const match = uzemeltetok.find(
                u => u.uzemelteto === printer.uzemelteto
            );
            
            if (match) {
                selectedUzemId = match.id;
            }
        }
        
        if (selectedUzemId) {
            const cimek = await getOptions(
                `/api/get_relations_by_uzem/${selectedUzemId}`
            );
            
            cimek.forEach(c => {
                const option = document.createElement("option");
                option.value = c.cim;
                option.textContent = c.cim;
                
                if (c.cim === printer.cim) {
                    option.selected = true;
                }
                
                cimSelect.appendChild(option);
            });
        }
        
        // Üzemeltető változásakor frissítsük a címeket
        uzemSelect.addEventListener("change", async () => {
            const selectedUzem = parseInt(uzemSelect.value);
            
            cimSelect.innerHTML =
            `<option value="">Nincs megadva</option>`;
            
            if (!selectedUzem) return;
            
            const selectedUzemObject = uzemeltetok.find(
                u => u.uzemelteto === uzemSelect.value
            );
            
            if (!selectedUzemObject) return;
            
            const cimek = await getOptions(
                `/api/get_relations_by_uzem/${selectedUzemObject.id}`
            );
            
            cimek.forEach(c => {
                const option = document.createElement("option");
                option.value = c.cim;
                option.textContent = c.cim;
                cimSelect.appendChild(option);
            });
        });
        
        btn.textContent = "💾";
        btn.dataset.editing = "true";
        
        // Enterrel is menthető
        row.querySelectorAll("input, select").forEach(input => {
            input.addEventListener("keydown", e => {
                if (e.key === "Enter") {
                    btn.click();
                }
                
                if (e.key === "Escape") {
                    loadInitial();
                }
            });
        });
        
        return;
    }
    
    // ---------------------------------
    // MENTÉS
    // ---------------------------------
    
    const nameInput =
    row.querySelector('[data-field="name"] input');
    
    const ipInput =
    row.querySelector('[data-field="ip"] input');
    
    const typeInput =
    row.querySelector('[data-field="type"] input');
    
    const serialInput =
    row.querySelector('[data-field="serial"] input');
    
    const uzemSelect =
    row.querySelector('[data-field="uzemelteto"] select');
    
    const cimSelect =
    row.querySelector('[data-field="cim"] select');
    
    const data = {
        azonosito: String(printer_id),
        gep_helye: nameInput ? nameInput.value.trim() : "",
        ip: ipInput ? ipInput.value.trim() : "",
        tipus: typeInput ? typeInput.value.trim() : "",
        gyari_szam: serialInput ? serialInput.value.trim() : "",
        uzemelteto: uzemSelect ? uzemSelect.value : "",
        cim: cimSelect ? cimSelect.value : ""
    };
    
    
    try {
        
        const response = await fetch("/update_printer", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            alert(result.error || "Hiba a mentés során!");
            return;
        }
        
        // Mentés után újratöltjük a főoldali táblázatot
        btn.textContent = "🔧";
        btn.dataset.editing = "false";
        
        loadInitial();
        
    } catch (error) {
        console.error(error);
        alert("Hálózati hiba a mentés során!");
    }
}


/* HTML karakterek biztonságos kezelése */
function escapeHtml(value) {
    return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* -------------------------
LIVE ROW UPDATE
------------------------- */
function updateRow(data) {
    const row = document.querySelector(`tr[data-id="${data.id}"]`);
    if (!row) return;
    
    const link = row.querySelector("a");
    
    let color = "#3b82f6";
    let extraClass = "";
    
    if (data.status === "ok") {
        color = "#22c55e";
    } else if (data.status === "error") {
        color = "#ef4444";
        extraClass = "blink error-blink";
    }
    
    link.className = extraClass;
    link.style.color = color;
    
    row.querySelector('[data-field="type"]').textContent = data.type || "N/A";
    row.querySelector('[data-field="serial"]').textContent = data.serial || "N/A";
    row.querySelector('[data-field="pages"]').textContent = data.pages || "N/A";
    
    row.querySelector('[data-field="rogzitve"]').textContent = formatDate(data.rogzitve) || "N/A";
}

/* -------------------------
SAVE MONTHLY
------------------------- */
function saveMonthly() {
    fetch("/save_monthly", { method: "POST" })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            alert("Mentés kész");
        } else {
            alert("Hiba: " + data.error);
        }
    });
}


/* -------------------------
PAGINATION
------------------------- */
function createPagination({
    containerId,
    totalItems,
    currentPage,
    rowsPerPage,
    onPageChange,
    maxVisible = 7
}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const totalPages = Math.ceil(totalItems / rowsPerPage);
    container.innerHTML = "";
    
    if (totalPages <= 1) return;
    
    function addBtn(label, page, disabled = false, active = false) {
        const btn = document.createElement("button");
        btn.textContent = label;
        btn.disabled = disabled;
        
        if (active) {
            btn.style.fontWeight = "bold";
            btn.style.textDecoration = "underline";
        }
        
        btn.onclick = () => onPageChange(page);
        container.appendChild(btn);
    }
    
    addBtn("‹", Math.max(1, currentPage - 1), currentPage === 1);
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = start + maxVisible - 1;
    
    if (end > totalPages) {
        end = totalPages;
        start = Math.max(1, end - maxVisible + 1);
    }
    
    if (start > 1) {
        addBtn("1", 1, false, currentPage === 1);
        
        if (start > 2) {
            const dots = document.createElement("span");
            dots.textContent = " ... ";
            container.appendChild(dots);
        }
    }
    
    for (let i = start; i <= end; i++) {
        addBtn(i, i, false, i === currentPage);
    }
    
    if (end < totalPages) {
        if (end < totalPages - 1) {
            const dots = document.createElement("span");
            dots.textContent = " ... ";
            container.appendChild(dots);
        }
        
        addBtn(totalPages, totalPages, false, currentPage === totalPages);
    }
    
    addBtn("›", Math.min(totalPages, currentPage + 1), currentPage === totalPages);
}