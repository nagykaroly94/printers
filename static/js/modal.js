function openModal() {
    document.getElementById("modal").style.display = "block";
}

function closeModal() {
    document.getElementById("modal").style.display = "none";
}

window.onclick = function(e) {
    const modal = document.getElementById("modal");
    const listModal = document.getElementById("listModal");
    if (e.target === modal) {
        modal.style.display = "none";
    }
    if (e.target === listModal) {
        listModal.style.display = "none";
    }
}

document.addEventListener("DOMContentLoaded", function() {
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
            } else {
                alert("Hiba: " + data.error);
            }
        })
        .catch(() => {
            alert("Hálózati hiba");
        });
    });
});

let allPrinters = [];
let printers = [];
let currentPage = 1;
let rowsPerPage = 8;

function openListModal() {
    document.getElementById("listModal").style.display = "block";
    fetch("/get_printers")
        .then(res => res.json())
        .then(data => {
            allPrinters = data;
            printers = [...allPrinters];
            currentPage = 1;
            renderTable();
        });
}

function closeListModal() {
    document.getElementById("listModal").style.display = "none";
}

function renderTable() {
    const tbody = document.querySelector("#printerTable tbody");
    tbody.innerHTML = "";

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
            <td><input class="mfinput" value="${p.uzemelteto || ""}" disabled></td>
            <td><input class="mfinput" value="${p.cim || ""}" disabled></td>
                    <td class="thfit">
                <button onclick="editRow('${p.azonosito}', this)">🔧</button>
                <button onclick="deleteRow('${p.azonosito}')">❌</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(printers.length / rowsPerPage);
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
    const inputs = row.querySelectorAll("input");

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
                inputs.forEach(input => input.disabled = true);
                btn.textContent = "🔧";
                btn.dataset.editing = "false";
            } else {
                alert("Hiba");
            }
        });
    }
}

function saveRow(id, btn) {
    const row = btn.closest("tr");
    const inputs = row.querySelectorAll("input");

    // Frissítjük a printers tömböt
    const p = printers.find(pr => pr.azonosito === id);
    p.gep_helye = inputs[0].value;
    p.ip = inputs[1].value;
    p.tipus = inputs[2].value;
    p.gyari_szam = inputs[3].value;
    p.uzemelteto = inputs[4].value;
    p.cim = inputs[5].value;

    // Backendnek elküldjük
    fetch("/update_printer", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(p)
    })
    .then(res=>res.json())
    .then(r=>{
        if(r.success){
            renderTable(); // újrarenderel minden sor
        } else {
            alert("Hiba a mentés során");
        }
    });
}

function cancelEdit(id, btn) {
    // Csak újrarendereljük a táblázatot, így visszaáll az eredeti állapot
    renderTable();
}

function deleteRow(id){
    if(!confirm("Biztos törlöd?")) return;
    fetch("/delete_printer/"+id, {method:"DELETE"})
    .then(r=>r.json())
    .then(r=>{ if(r.success){ printers = printers.filter(p=>p.azonosito!==id); renderTable(); } else alert("Hiba"); });
}