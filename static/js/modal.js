let allPrinters = [];
let printers = [];
let currentPage = 1;
let rowsPerPage = 8;

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

                    <td>
                        <select class="mfselect" disabled>
                            <option value="">Nincs üzemeltető megadva</option>
                            <option value="Kerekes Kft." ${p.uzemelteto === "Kerekes Kft." ? "selected" : ""}>Kerekes Kft.</option>
                            <option value="Mealtrade Kft." ${p.uzemelteto === "Mealtrade Kft." ? "selected" : ""}>Mealtrade Kft.</option>
                            <option value="Forrás Áruház Kft." ${p.uzemelteto === "Forrás Áruház Kft" ? "selected" : ""}>Forrás Áruház Kft</option>        
                        </select>
                    </td>

                    <td>
                        <select class="mfselect" disabled>
                            <option value="">Nincs cím megadva</option>
                            <option value="4211 Ebes Forrás utca 2" ${p.cim === "4211 Ebes Forrás utca 2" ? "selected" : ""}>4211 Ebes Forrás utca 2</option>
                            <option value="3900 Szerencs Rákóczi út 95." ${p.cim === "3900 Szerencs, Rákóczi út 95." ? "selected" : ""}>3900 Szerencs, Rákóczi út 95.</option>
                            <option value="4401 Nyíregyháza Debreceni út 106/b." ${p.cim === "4401 Nyíregyháza, Debreceni út 106/b." ? "selected" : ""}>4401 Nyíregyháza, Debreceni út 106/b.</option>
                            <option value="3527 Miskolc József Attila u. 10." ${p.cim === "3527 Miskolc, József Attila u. 10." ? "selected" : ""}>3527 Miskolc, József Attila u. 10.</option>
                            <option value="3200 Gyöngyös Karácsondi út 11234/36" ${p.cim === "3200 Gyöngyös, Karácsondi út 11234/36" ? "selected" : ""}>3200 Gyöngyös, Karácsondi út 11234/36</option>
                            <option value="5000 Szolnok Széchényi  2" ${p.cim === "5000 Szolnok Széchényi  2" ? "selected" : ""}>5000 Szolnok Széchényi  2</option>
                            <option value="4200 Hajdúszoboszló József Attila utca 5-7" ${p.cim === "4200 Hajdúszoboszló József Attila utca 5-7" ? "selected" : ""}>4200 Hajdúszoboszló József Attila utca 5-7</option>
                        </select>
                    </td>

                    <td class="thfit">
                        <button onclick="editRow('${p.azonosito}', this)">🔧</button>
                        <button onclick="deleteRow('${p.azonosito}')">❌</button>
                    </td>
        `;
        tbody.appendChild(tr);
    });

    renderPagination();
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p)
    })
    .then(res => res.json())
    .then(r => {
        if(r.success){
            renderTable();  // fő táblázat újrarenderelése

            // Biztonságosan frissítjük a list modal táblázatát
            const listModal = document.getElementById("listModal");
            if(listModal) {
                renderTable(); // újrarendereli a modal listát, ha létezik
            }
        } else {
            alert("Hiba a mentés során");
        }
    })
    .catch(err => {
        alert("Hálózati hiba a mentés során");
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
                closeListModal();
                openListModal();
                currentPage = getcurrentTotalPages();
                renderTable();
            } else {
                alert("Hiba: " + data.error);
            }
        })
        .catch((e) => {
            alert("Hálózati hiba" + e.message);
        });
    });
});