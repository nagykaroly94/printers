"""
https://mibs.observium.org/mib/Printer-MIB/
https://mibs.observium.org/mib/SNMPv2-MIB/
"""
import json
import os

from pysnmp.hlapi.v3arch.asyncio import (
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity,
    get_cmd,
)

class SNMPError(Exception):
    """Általános SNMP lekérdezési hiba."""
    def __init__(self, ip: str, oid: str, message: str):
        self.ip = ip
        self.oid = oid
        self.message = message
        super().__init__(f"SNMPError - {ip} ({oid}): {message}")

vendor_oids = {}

with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "snmp_vendor_oids.json"), "r") as f:
    vendor_oids = json.load(f)

vendor_oids["Generic"] = {
    "manufacturer" : "Generic",
    "model_oid" : "1.3.6.1.2.1.1.1.0", #SNMPv2-MIB::sysDescr
    "counter_oid" : "1.3.6.1.2.1.43.10.2.1.4.1.1", #Printer-MIB::prtMarkerLifeCount
    "serial_oid" : "1.3.6.1.2.1.43.5.1.1.17.1" #Printer-MIB::prtGeneralSerialNumber
}

def cleanup_model_name(text:str):
    """Modell nevek végéről lecsípi a szemetet a fv.-ben megadott részlet utáni résztől."""
    trash_suffix = ["/P", "version"]
    for suff in trash_suffix : text = text.split(suff, 1)[0]
    return text.strip()

async def get_printer_vendor_IANA_PEN(ip):
    """Gyártói PEN lekérése, hiba esetén SNMPError kivételt dob."""
    iana_private_prefix = "1.3.6.1.4.1." #SNMPv2-SMI::enterprises IANA-registered Private Enterprises
    sys_object_id = "1.3.6.1.2.1.1.2.0" #SNMPv2-MIB::sysObjectID
    vendor = str(await snmp_get(ip, sys_object_id)).strip()
    if not vendor.startswith(iana_private_prefix): raise SNMPError(ip, sys_object_id, f"Response OID is not an IANA-registered Private Enterprises number")
    return vendor.removeprefix(iana_private_prefix).split(".", 1)[0]

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

async def get_printer_data(ip):
    """Visszaadja a nyomtató típusát, a számlálójának értékét és a gyári sorozatszámát."""
    try:
        vendor = await get_printer_vendor_IANA_PEN(ip)
        if vendor not in vendor_oids: vendor = "Generic"
        model = await snmp_get(ip, vendor_oids[vendor]["model_oid"]) 
        counter = await snmp_get(ip, vendor_oids[vendor]["counter_oid"])
        serial = await snmp_get(ip, vendor_oids[vendor]["serial_oid"])
    
        return cleanup_model_name(model), counter, serial
    except Exception as exc:
        return(exc)