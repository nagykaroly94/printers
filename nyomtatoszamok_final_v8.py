import asyncio
from openpyxl import Workbook
import io
from flask import Flask, Response, jsonify
from pysnmp.hlapi.v3arch.asyncio import (
    SnmpEngine, CommunityData, UdpTransportTarget, ContextData,
    ObjectType, ObjectIdentity, get_cmd
)
import threading
import json
from flask import render_template

app = Flask(__name__)

results = {}
running = False

# Nyomtatók lekérdezése JSON file-ból
with open("config/printers.json", "r", encoding="utf-8") as f:
    ip_locations = json.load(f)

# SNMP lekérdezés
async def snmp_get(ip, oid):
    transport = await UdpTransportTarget.create((ip,161), timeout=2, retries=1)
    errorIndication, errorStatus, errorIndex, varBinds = await get_cmd(
        SnmpEngine(),
        CommunityData('public', mpModel=0),
        transport,
        ContextData(),
        ObjectType(ObjectIdentity(oid))
    )
    if errorIndication or errorStatus:
        return None
    for varBind in varBinds:
        return varBind[1]

async def get_printer_data(ip):
    """Lekérdezi a nyomtató típusát, oldalszámát és sorozatszámát"""

    type_result = await snmp_get(ip, '1.3.6.1.2.1.1.1.0')
    if type_result is None:
        return (
            "Nem sikerült a lekérdezés",
            "Nem sikerült a lekérdezés",
            "Nem sikerült a lekérdezés"
        )

    full_type = type_result.prettyPrint()
    if not full_type.strip():
        printer_type = "Nem sikerült a lekérdezés"
    else:
        printer_type = " ".join(full_type.split()[:3])

    # alap OID-ok
    page_oid = '1.3.6.1.2.1.43.10.2.1.4.1.1'
    type_oid = None
    serial_oid = '1.3.6.1.2.1.43.5.1.1.17.1'

    # Canon imageRUNNER1133 kivétel
    if "Canon imageRUNNER1133" in full_type:
        page_oid = '1.3.6.1.4.1.1602.1.11.1.3.1.4.113'

    # Canon iR-ADV 525 III kivétel
    if "Canon iR-ADV 525 III" in full_type:
        page_oid = '1.3.6.1.2.1.43.10.2.1.4.1.1'
        type_oid = '1.3.6.1.2.1.25.3.2.1.3.1'
        serial_oid = '1.3.6.1.2.1.43.5.1.1.17.1'

    # típus lekérdezés speciális OID-dal ha kell
    if type_oid:
        type_result = await snmp_get(ip, type_oid)
        if type_result:
            full_type = type_result.prettyPrint()
            if full_type.strip():
                printer_type = full_type
            else:
                printer_type = "Nem sikerült a lekérdezés"

    # oldalszám lekérdezés
    page_result = await snmp_get(ip, page_oid)
    pages = page_result if page_result is not None else "Nem sikerült a lekérdezés"

    # sorozatszám lekérdezés
    serial_result = await snmp_get(ip, serial_oid)
    serial = serial_result.prettyPrint() if serial_result is not None else "Nem sikerült a lekérdezés"

    return printer_type, pages, serial

# Lekérdezés futtatása
async def run_query():
    global running, results
    running = True
    results = {}

    for ip,(printer_id,location,table_name,order) in ip_locations.items():
        try:
            printer_type, page_count, serial = await get_printer_data(ip)
            
            # JSON kompatibilis típus
            if page_count is None:
                page_count = "Nem sikerült a lekérdezés"
            else:
                page_count = int(page_count)  # Counter32 -> int
            
            if serial is None:
                serial = "Nem sikerült a lekérdezés"
            else:
                serial = str(serial)  # Counter32 vagy OctetString -> str

            results[ip] = {
                "id": printer_id,
                "name": location,
                "type": printer_type,
                "pages": page_count,
                "serial": serial,
                "table": table_name,
                "order": order,
                "ip": ip
            }
        except Exception:
            results[ip] = {
                "id": printer_id,
                "name": location,
                "type": "Nem sikerült a lekérdezés",
                "pages": "Nem sikerült a lekérdezés",
                "serial": "Nem sikerült a lekérdezés",
                "table": table_name,
                "order": order,
                "ip": ip
            }
    running = False

# Flask útvonalak
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/start")
def start():
    global running
    if not running:
        thread = threading.Thread(target=lambda: asyncio.run(run_query()))
        thread.start()
    return "ok"

@app.route("/status")
def status():
    return jsonify({"results": results, "total": len(ip_locations), "running": running})

@app.route("/printer_pages/<table_name>.xlsx")
def download_table_xlsx(table_name):
    wb = Workbook()
    ws = wb.active
    ws.title = "Nyomtatók"
    ws.append(["Azonosító","Hely","IP cím","Típus","Sorozatszám","Oldalszám"])
    for r in results.values():
        if r.get("table") == table_name:
            ws.append([r["id"], r["name"], r["ip"], r["type"], r["serial"], r["pages"]])
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    headers = {
        "Content-Disposition": f"attachment; filename={table_name}.xlsx",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-Content-Type-Options": "nosniff"  # Chrome biztonságosabbnak látja
    }

    return Response(output, headers=headers)

@app.route("/printer_pages.xlsx")
def download_all_xlsx():
    wb = Workbook()
    ws = wb.active
    ws.title = "Nyomtatók"
    ws.append(["Azonosító","Hely","IP cím","Típus","Sorozatszám","Oldalszám","Táblázat"])
    for r in results.values():
        ws.append([r["id"], r["name"], r["ip"], r["type"], r["serial"], r["pages"], r["table"]])
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    headers = {
        "Content-Disposition": "attachment; filename=Teljes_tablazat.xlsx",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-Content-Type-Options": "nosniff"  # Chrome biztonságosabbnak látja
    }

    return Response(output, headers=headers)

if __name__=="__main__":
    app.run(host="0.0.0.0", port=5000)