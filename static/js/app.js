let isRunning = false;
let rowState = {};

/* -------------------------
INIT
------------------------- */
window.onload = function () {
    if (window.location.pathname == "/") {
        loadInitial();
        document.getElementById("bar").style.width = "0%";
    }
};

/* -------------------------
SSE (Server-Sent Events)
------------------------- */
const events = new EventSource("/events");

events.onmessage = (event) => {
    let data;

    try {
        data = JSON.parse(event.data);
    } catch {
        showToast(event.data);
        return;
    }

    switch (data.type) {

        case "snmp_status":
            updatePrinterStatus(data);
            break;

        case "progress":
            updateProgress(data);
            break;

        case "finished":
            isRunning = false;

            const bar = document.getElementById("bar");
            if (bar) {
                bar.style.width = "100%";
            }

            break;

        default:
            console.warn(
                "Ismeretlen SSE üzenettípus:",
                data
            );
    }
};

function updateProgress(data) {
    const processed = data.processed || 0;
    const total = data.total || 1;

    const percent = Math.min(
        100,
        Math.round((processed / total) * 100)
    );

    const bar = document.getElementById("bar");

    if (bar) {
        bar.style.width = percent + "%";
    }
}

function updatePrinterStatus(data) {
    console.log(
        "SNMP update:",
        data.id,
        data.status,
        data.count
    );

    if (data.status === "success") {

        updateRow({
            id: data.id,
            status: "ok",
            pages: data.count,
            type: data.type_name,
            serial: data.serial
        });

        return;
    }

    if (data.status === "timeout") {

        updateRow({
            id: data.id,
            status: "error"
        });

        return;
    }
}



function showToast(message) {
    const container = document.getElementById("toast-container");
    
    const toast = document.createElement("div");
    toast.className = "toast";

    if (typeof message === "string" && message.startsWith("HIBA! ")) {
        toast.classList.add("error");
    }

    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3100);
}

/* -------------------------
START
------------------------- */

function start() {
    if (window.location.pathname !== "/") {
        window.location.href = "/?autostart=1";
        return;
    }

    fetch("/start");

    isRunning = true;

    document.getElementById("bar").style.width = "0%";

    loadInitial();
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
                cim_id: r.cim_id,
                
                uzemelteto: r.uzemelteto,
                uzemelteto_id: r.uzemelteto_id,
                
                tablazat: r.tablazat,
                rogzitve: r.updated_at,
                status: r.status
            };
        });
        
        renderTables(fakeResults);
    });
}

function populateSelect(
    selectElem,
    options,
    valueField,
    textField,
    selectedValue = null
) {
    if (!selectElem) return;
    
    selectElem.innerHTML =
    `<option value="">Nincs megadva</option>`;
    
    options.forEach(item => {
        const option = document.createElement("option");
        
        option.value = item[valueField];
        option.textContent =
        item[textField] || item[valueField];
        
        if (
            selectedValue !== null &&
            String(option.value) === String(selectedValue)
        ) {
            option.selected = true;
        }
        
        selectElem.appendChild(option);
    });
}

/* -------------------------
RENDER TABLES
------------------------- */
async function renderTables(results) {
    let tables_div = document.getElementById("tables");
    tables_div.innerHTML = "";
    
    let grouped = {};
    
    for (let id in results) {
        let r = results[id];
        let key = r.tablazat || "Nincs táblázat";
        
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
    }
    
    const uzemeltetoOptions =
        await getOptions("/api/list_uzemelteto");

    const sortedKeys = Object.keys(grouped)
        .sort((a, b) => {
            if (a === "Nincs táblázat") return -1;
            if (b === "Nincs táblázat") return 1;
            return a.localeCompare(b, "hu");
        });

    for (const key of sortedKeys) {

        grouped[key].sort((a, b) =>
            (a.id || "").localeCompare(b.id || "", "hu")
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
    
    for (const r of grouped[key]) {
        
/*
        console.log("NYOMTATÓ:", r.id);
        console.log("UZEMELTETO:", r.uzemelteto);
        console.log("UZEMELTETO_ID:", r.uzemelteto_id);
        console.log("CIM:", r.cim);
        console.log("CIM_ID:", r.cim_id);
        console.log("OPCIOK:", uzemeltetoOptions);*/
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
        const tr = document.createElement("tr");
        
        tr.className = rowClass;
        tr.dataset.id = r.id;
        
        tr.innerHTML = `
                    <td data-field="id"onclick="window.open('http://${escapeHtml(r.ip)}', '_blank')"style="cursor:pointer;">${r.id}</td>
                    <td data-field="name"><input class="mfinput" type="text" value="${escapeHtml(r.name || "")}" disabled></td>
                    <td data-field="ip"><input class="mfinput" type="text" value="${escapeHtml(r.ip || "")}" disabled></td>
                    <td data-field="type"><input class="mfinput" type="text" value="${escapeHtml(r.type || "")}" disabled></td>
                    <td data-field="serial"><input class="mfinput" type="text" value="${escapeHtml(r.serial || "")}" disabled></td>
                    <td data-field="pages"><input class="mfinput" type="text" value="${escapeHtml(r.pages || "")}" disabled></td>
                    <td data-field="uzemelteto"><select class="mfselect uzemelteto" disabled><option value="">Nincs megadva</option></select></td>
                    <td data-field="cim"><select class="mfselect cim" disabled><option value="">Nincs megadva</option></select></td>
                    <td data-field="rogzitve">${r.rogzitve ? new Date(r.rogzitve).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest' }) : "N/A"}</td>
                    <td>
                        <button style="mfctnr button" title="Nyomtató adatainak módosítása" onclick="editPrinterInline(${r.id}, this)">🔧</button>
                        <button style="mfctnr button" title="Nyomtató törlése" onclick="deleteRow(${r.id})">❌</button>
                    </td>
                `;
        table.appendChild(tr);
            const uzemSelect = tr.querySelector(".uzemelteto");
            const cimSelect = tr.querySelector(".cim");

            // Üzemeltető ID meghatározása
            let selectedUzemId = null;

            if (r.uzemelteto_id !== undefined && r.uzemelteto_id !== null) {
                selectedUzemId = r.uzemelteto_id;
            } else if (r.uzemelteto) {
                const match = uzemeltetoOptions.find(
                    u => String(u.uzemelteto).trim() === String(r.uzemelteto).trim()
                );

                selectedUzemId = match ? match.id : null;
            }

            // Üzemeltető feltöltése
            populateSelect(
                uzemSelect,
                uzemeltetoOptions,
                "id",
                "uzemelteto",
                selectedUzemId
            );

            // Cím feltöltése
            if (selectedUzemId !== null) {

                const cimek = await getOptions(
                    `/api/get_relations_by_uzem/${selectedUzemId}`
                );

                // Cím ID meghatározása
                let selectedCimId = null;

                if (r.cim_id !== undefined && r.cim_id !== null) {
                    selectedCimId = r.cim_id;
                } else if (r.cim) {
                    const match = cimek.find(
                        c => String(c.cim).trim() === String(r.cim).trim()
                    );

                    selectedCimId = match ? match.cim_id : null;
                }

                populateSelect(
                    cimSelect,
                    cimek,
                    "cim_id",
                    "cim",
                    selectedCimId
                );
            }
    }
    
    
        tables_div.appendChild(h2);
        tables_div.appendChild(table);
    
    let hr = document.createElement("hr");
    hr.className = "separator";
    tables_div.appendChild(hr);
}
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

            option.value = u.id;
            option.textContent = u.uzemelteto;

            if (String(u.id) === String(printer.uzemelteto_id)) {
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

            option.value = c.cim_id;
            option.textContent = c.cim;

            if (String(c.cim_id) === String(printer.cim_id)) {
                option.selected = true;
            }

            cimSelect.appendChild(option);
        });
        }
        
        // Üzemeltető változásakor frissítsük a címeket
        uzemSelect.addEventListener("change", async () => {
            const selectedUzemId = uzemSelect.value;

            cimSelect.innerHTML =
                `<option value="">Nincs megadva</option>`;

            if (!selectedUzemId) return;

            const cimek = await getOptions(
                `/api/get_relations_by_uzem/${selectedUzemId}`
            );

            cimek.forEach(c => {
                const option = document.createElement("option");

                option.value = c.cim_id;
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

    if (!row) {
        console.warn("Nem található sor:", data.id);
        return;
    }

    let color = "#3b82f6";
    let extraClass = "";

    if (data.status === "ok") {
        color = "#22c55e";
    }
    else if (data.status === "error") {
        color = "#ef4444";
        extraClass = "blink error-blink";
    }

    // ID cella
    const idCell = row.querySelector('[data-field="id"]');

    if (idCell) {
        idCell.style.color = color;
        idCell.classList.remove("blink", "error-blink");

        if (extraClass) {
            idCell.classList.add(...extraClass.split(" "));
        }
    }

    // Típus
    if (data.type !== undefined) {
        const cell = row.querySelector('[data-field="type"]');

        if (cell) {
            const input = cell.querySelector("input");

            if (input) {
                input.value = data.type || "";
            } else {
                cell.textContent = data.type || "N/A";
            }
        }
    }

    // Sorozatszám
    if (data.serial !== undefined) {
        const cell = row.querySelector('[data-field="serial"]');

        if (cell) {
            const input = cell.querySelector("input");

            if (input) {
                input.value = data.serial || "";
            } else {
                cell.textContent = data.serial || "N/A";
            }
        }
    }

    // Oldalszám
    if (data.pages !== undefined) {
        const cell = row.querySelector('[data-field="pages"]');

        if (cell) {
            const input = cell.querySelector("input");

            if (input) {
                input.value = data.pages ?? "";
            } else {
                cell.textContent = data.pages ?? "N/A";
            }
        }
    }

    // Rögzítve
    if (data.rogzitve !== undefined) {
        const cell = row.querySelector('[data-field="rogzitve"]');

        if (cell) {
            cell.textContent = formatDate(data.rogzitve);
        }
    }
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