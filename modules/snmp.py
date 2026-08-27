"""
https://mibs.observium.org/mib/Printer-MIB/
https://mibs.observium.org/mib/SNMPv2-MIB/
https://www.alvestrand.no/objectid/1.3.6.1.4.1.html
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

if __name__ == "__main__":
    ip_cimek = [
        "192.168.0.159",
        "192.168.2.224",
        "192.168.1.118",
        "192.168.0.100",
        "192.168.2.112",
        "192.168.1.78",
        "192.168.3.60",
        "192.168.0.71",
        "192.168.3.197",
        "192.168.1.151",
        "192.168.0.151",
        "192.168.3.34",
        "192.168.0.181",
        "192.168.3.164",
        "192.168.2.215",
        "192.168.3.125",
        "192.168.2.102",
        "192.168.2.30",
        "192.168.1.220",
        "192.168.0.154",
        "192.168.3.242",
        "192.168.0.177",
        "192.168.2.125",
        "192.168.0.104",
        "192.168.1.28",
        "172.20.6.89",
        "172.20.6.45",
        "192.168.1.50",
        "192.168.3.1",
        "192.168.1.211",
        "192.168.0.184",
        "192.168.2.18",
        "192.168.1.144",
        "192.168.2.144",
        "192.168.0.173",
        "192.168.3.126",
        "192.168.0.208",
        "192.168.5.138",
        "192.168.2.46",
        "192.168.2.149",
        "192.168.2.80",
        "192.168.1.96",
        "192.168.0.155",
        "192.168.1.93",
        "192.168.3.155",
        "192.168.1.123",
        "192.168.1.87",
        "192.168.1.69",
        "192.168.1.110",
        "192.168.0.196",
        "192.168.0.220",
        "192.168.0.103",
        "192.168.0.136",
        "192.168.5.137",
        "192.168.0.172",
        "192.168.1.198",
        "192.168.3.80",
        "192.168.1.167",
        "192.168.1.86",
        "192.168.2.44",
        "192.168.5.136",
        "192.168.5.201",
        "192.168.5.139",
        "192.168.14.154",
        "192.168.1.112",
        "192.168.14.102",
        "192.168.14.144",
        "192.168.14.200",
        "192.168.14.204",
        "192.168.14.202",
        "192.168.11.159",
        "192.168.11.161",
        "192.168.11.162",
        "192.168.11.160",
        "192.168.11.167",
        "192.168.11.165",
        "192.168.11.163",
        "192.168.12.187",
        "192.168.12.191",
        "192.168.12.189",
        "192.168.12.192",
        "192.168.12.194",
        "192.168.12.190",
        "192.168.12.193",
        "192.168.1.53",
        "192.168.13.224",
        "192.168.13.228",
        "192.168.13.229",
        "192.168.13.236",
        "192.168.13.226",
        "192.168.13.237",
        "192.168.13.230",
        "192.168.13.232",
        "192.168.13.235",
        "192.168.13.239",
        "192.168.13.102",
        "192.168.13.199",
        "192.168.14.213",
        "192.168.12.72",
        "192.168.12.201",
        "192.168.12.119",
        "192.168.12.66",
        "192.168.3.119",
        "192.168.22.203",
        "192.168.22.225",
        "192.168.22.151",
        "192.168.3.148",
        "192.168.3.241",
        "192.168.12.58",
        "172.20.14.6",
        "192.168.3.230",
        "192.168.3.117",
        "192.168.3.239",
        "192.168.11.124",
        "192.168.11.128",
        "192.168.13.105",
        "192.168.1.252",
        "192.168.2.57",
        "192.168.1.253",
        "192.168.1.161",
        "192.168.2.37",
        "192.168.2.108"
    ]

    async def doit():
        for ip in ip_cimek:
            print(ip, await get_printer_data(ip))

    import asyncio
    asyncio.run(doit())