let timer = null
function start(){
    fetch("/start")
    if(timer !== null){ clearInterval(timer) }
    timer = setInterval(update,1000)
}
function update(){
    fetch("/status").then(r=>r.json()).then(data=>{
        let tables_div = document.getElementById("tables")
        tables_div.innerHTML = ""
        let grouped = {}
        for(let ip in data.results){
            let r = data.results[ip]
            if(!grouped[r.table]) grouped[r.table] = []
            grouped[r.table].push(r)
        }
        for(let table_name in grouped){
            grouped[table_name].sort((a,b)=>a.order-b.order)
            let table = document.createElement("table")
            table.innerHTML = `<tr><th>ID</th><th>Hely</th><th>IP</th><th>Típus</th><th>Oldalszám</th><th>Sorozatszám</th></tr>`
            grouped[table_name].forEach(r=>{
                table.innerHTML += `<tr>
                    <td>${r.id}</td>
                    <td>${r.name}</td>
                    <td><a href="http://${r.ip}" target="_blank" style="color:#22c55e;text-decoration:none;">${r.ip}</a></td>
                    <td>${r.type}</td>
                    <td>${r.pages}</td>
                    <td>${r.serial}</td>
                </tr>`
            })
            let h = document.createElement("h2")
            h.textContent = table_name
            let btn = document.createElement("button")
            btn.textContent = "Táblázat letöltés"
            btn.style.marginBottom = "10px"
            btn.onclick = function() {
                window.location.href = `/printer_pages/${table_name}.xlsx`
            }
            tables_div.appendChild(h)
            tables_div.appendChild(btn)
            tables_div.appendChild(table)
            let hr = document.createElement("hr")
            hr.className = "separator"
            tables_div.appendChild(hr)
        }
        let percent = Math.round(Object.keys(data.results).length / data.total * 100)
        document.getElementById("bar").style.width = percent+"%"
        if(data.running===false){ clearInterval(timer) }
    })
}