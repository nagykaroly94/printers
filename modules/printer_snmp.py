"""
https://mibs.observium.org/mib/Printer-MIB/
https://mibs.observium.org/mib/SNMPv2-MIB/
https://www.alvestrand.no/objectid/1.3.6.1.4.1.html
"""
import json
import os
from pysnmp.hlapi.v3arch.asyncio import SnmpEngine, CommunityData, UdpTransportTarget, ContextData, ObjectType, ObjectIdentity, get_cmd

class SNMPError(Exception):
    """Általános SNMP lekérdezési hiba."""
    def __init__(self, ip: str, oid: str, message: str):
        self.ip = ip
        self.oid = oid
        self.message = message
        super().__init__(f"SNMPError - {ip} ({oid}): {message}")

def validate_oid(path, oid):
    """Ellenőrzi, hogy az OID string és numerikus formátumú-e."""
    if not isinstance(oid, str): raise ValueError(f"{path} értékének stringnek kell lennie.")
    if not oid: raise ValueError(f"{path} nem lehet üres.")
    parts = oid.split(".")
    if len(parts) < 2 or any(not part.isdigit() for part in parts): raise ValueError(f"{path} érvénytelen OID: {oid!r}")

def validate_vendor_oids(data):
    """Ellenőrzi az SNMP vendor konfiguráció teljes struktúráját."""
    if not isinstance(data, dict): raise ValueError("A konfiguráció gyökérszintjének objektumnak kell lennie.")
    if "Generic" not in data: raise ValueError('A konfigurációból hiányzik a kötelező "Generic" vendor.')

    for vendor, config in data.items():
        if not isinstance(vendor, str): raise ValueError("A vendor kulcsoknak stringnek kell lenniük.")
        if vendor != "Generic" and not vendor.isdigit(): raise ValueError(f"A vendor kulcsának IANA PEN számnak kell lennie: {vendor!r}")
        if not isinstance(config, dict): raise ValueError(f"A(z) {vendor} vendor konfigurációja objektum kell legyen.")

        required_fields = ("model_oid", "counter_oid", "serial_oid", "models")

        for field in required_fields: 
            if field not in config: raise ValueError(f"A(z) {vendor} vendor konfigurációjából hiányzik: {field}")

        for field in ("model_oid", "counter_oid", "serial_oid"):
            validate_oid(f"{vendor}.{field}", config[field])

        if not isinstance(config["models"], dict): raise ValueError(f"A(z) {vendor}.models mezőnek objektumnak kell lennie.")

        for model, model_config in config["models"].items():
            if not isinstance(model, str): raise ValueError(f"A(z) {vendor}.models kulcsának stringnek kell lennie.")
            if not isinstance(model_config, dict): raise ValueError(f"A(z) {vendor}.models.{model} értékének objektumnak kell lennie.")
            for field in ("counter_oid", "serial_oid"):
                if field in model_config: validate_oid(f"{vendor}.models.{model}.{field}", model_config[field])

async def snmp_query(ip, oid, timeout=5, retries=2):
    """Egyetlen SNMP OID olvasása adott IP-címről, hiba esetén SNMPError kivételt dob."""
    transport = await UdpTransportTarget.create((ip, 161), timeout=timeout, retries=retries,)
    error_indication, error_status, error_index, var_binds = await get_cmd(SnmpEngine(), CommunityData("public", mpModel=0), transport, ContextData(), ObjectType(ObjectIdentity(oid)),)
    if error_indication: raise SNMPError(ip, oid, f"SNMP engine error: {error_indication}")
    if error_status: raise SNMPError(ip, oid, f"SNMP PDU error: {error_status.prettyPrint()}, index={error_index}, var={var_binds[error_index - 1] if error_index and error_index <= len(var_binds) else None}")
    if not var_binds: raise SNMPError(ip, oid, f"SNMP empty response")
    return var_binds[0][1]

async def snmp_get(ip, oid) -> str:
    """String wrapper az snmp_query methódusra"""
    return str(await snmp_query(ip, oid))

async def get_printer_vendor_IANA_PEN(ip):
    """Gyártói PEN lekérése, hiba esetén SNMPError kivételt dob."""
    iana_private_prefix = "1.3.6.1.4.1." #SNMPv2-SMI::enterprises IANA-registered Private Enterprises
    sys_object_id = "1.3.6.1.2.1.1.2.0" #SNMPv2-MIB::sysObjectID
    vendor = str(await snmp_get(ip, sys_object_id)).strip()
    if not vendor.startswith(iana_private_prefix): raise SNMPError(ip, sys_object_id, f"Response OID is not an IANA-registered Private Enterprises number")
    return vendor.removeprefix(iana_private_prefix).split(".", 1)[0]

def cleanup_model_name(text:str):
    """Modell nevek végéről lecsípi a szemetet a fv.-ben megadott részlet utáni résztől."""
    trash_suffix = ["/P", "version"]
    for suff in trash_suffix : text = text.split(suff, 1)[0]
    return text.strip()

async def get_printer_data(ip):
    """Visszaadja a nyomtató típusát, a számlálójának értékét és a gyári sorozatszámát."""
    try:
        with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "snmp_vendor_oids.json"), "r", encoding="utf-8") as f: vendor_oids = json.load(f)
        validate_vendor_oids(vendor_oids)

        vendor_config = vendor_oids.get(await get_printer_vendor_IANA_PEN(ip), vendor_oids["Generic"])
        model = cleanup_model_name(await snmp_get(ip, vendor_config["model_oid"]))
        model_config = vendor_config["models"].get(model, {})

        counter_oid = model_config.get("counter_oid", vendor_config["counter_oid"])
        serial_oid = model_config.get("serial_oid", vendor_config["serial_oid"])

        counter = await snmp_get(ip, counter_oid)
        serial = await snmp_get(ip, serial_oid)
    
        return model, counter, serial
    except FileNotFoundError as exc: raise RuntimeError("Az snmp_vendor_oids.json fájl nem található.") from exc
    except OSError as exc: raise RuntimeError(f"Nem sikerült beolvasni az snmp_vendor_oids.json fájlt: {exc}") from exc
    except json.JSONDecodeError as exc: raise RuntimeError(f"Hibás JSON: {exc.msg} sor: {exc.lineno}, oszlop: {exc.colno}") from exc
    except ValueError as exc: raise RuntimeError(f"Hibás SNMP vendor konfiguráció: {exc}") from exc
    except SNMPError: raise
    except Exception as exc: raise RuntimeError(f"Váratlan hiba a nyomtató lekérdezése közben ({ip}): {exc}") from exc
