let timer = null
function start(){
    fetch("/start")
    if(timer !== null){ clearInterval(timer) }
    timer = setInterval(update,1000)
}
function update() {
    fetch("/status")
    .then(r => r.json())
    .then(data => {
        let tables_div = document.getElementById("tables");
        tables_div.innerHTML = "";
        
        // csoportosítás cég + cím szerint
        let grouped = {};
        for (let ip in data.results) {
            let r = data.results[ip];
            let company = r.uzemelteto || "Nincs üzemeltető";
            let address = r.cim || "Nincs cím";
            let key = `${company} - ${address}`;  // cég + cím kulcs
            
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(r);
        }
        
        // táblázatok létrehozása cég+cím szerint
        Object.keys(grouped).forEach(key => {
            let table = document.createElement("table");
            table.innerHTML = `
                <tr>
                    <th>ID</th>
                    <th>Hely</th>
                    <th>IP</th>
                    <th>Típus</th>
                    <th>Sorozatszám</th>
                    <th>Oldalszám</th>
                </tr>
            `;
            
            grouped[key].forEach(r => {
                table.innerHTML += `
                    <tr>
                        <td>${r.id}</td>
                        <td>${r.name}</td>
                        <td><a href="http://${r.ip}" target="_blank" style="color:#22c55e;text-decoration:none;">${r.ip}</a></td>
                        <td>${r.type}</td>
                        <td>${r.serial}</td>
                        <td>${r.pages}</td>
                    </tr>
                `;
            });
            
            // blokk fejléc
            let h2 = document.createElement("h2");
            h2.textContent = key; // cég + cím
            
            // letöltés gomb
            let btn = document.createElement("button");
            btn.textContent = "Táblázat letöltés";
            btn.style.marginBottom = "10px";
            btn.onclick = function() {
                window.location.href = `/printer_pages/${encodeURIComponent(key)}.xlsx`;
            };
            
            tables_div.appendChild(h2);
            tables_div.appendChild(btn);
            tables_div.appendChild(table);
            
            let hr = document.createElement("hr");
            hr.className = "separator";
            tables_div.appendChild(hr);
        });
        
        // progress bar frissítés
        let percent = Math.round(Object.keys(data.results).length / data.total * 100);
        document.getElementById("bar").style.width = percent + "%";
        
        if(data.running === false) {
            clearInterval(timer);
        }
    });
}

function saveMonthly(){
    fetch("/save_monthly", {
        method: "POST"
    })
    .then(r => r.json())
    .then(data => {
        if(data.success){
            alert("Mentés kész");
        } else {
            alert("Hiba: " + data.error);
        }
    })
}