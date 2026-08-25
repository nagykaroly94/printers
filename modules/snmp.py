from pysnmp.hlapi.v3arch.asyncio import (
    SnmpEngine,
    CommunityData,
    UdpTransportTarget,
    ContextData,
    ObjectType,
    ObjectIdentity,
    get_cmd,
)

DEFAULT_OLDALSZAM_OID = "1.3.6.1.2.1.43.10.2.1.4.1.1"

DEFAULT_SOROZATSZAM_OID = [
    "1.3.6.1.2.1.43.5.1.1.17.1",
]

CANON_SERIAL_OIDS = [
    # Real serial for LBP6650/P
    "1.3.6.1.4.1.1602.1.2.1.4.0",

    # Engine/controller ID
    "1.3.6.1.4.1.1602.1.3.1.1.1.1.1",

    # Other Canon
    "1.3.6.1.4.1.1602.1.11.1.1.3.1.1",

    # Model
    "1.3.6.1.4.1.1602.1.1.1.2.0",
]

HP_DESCRIPTION_OID = "1.3.6.1.2.1.25.3.2.1.3.1"

CANON_1133_PAGE_OID = "1.3.6.1.4.1.1602.1.11.1.3.1.4.113"



async def snmp_get(ip: str, oid: str):
    """Egyetlen SNMP OID olvasása a nyomtatóról."""

    try:
        transport = await UdpTransportTarget.create((ip, 161), timeout=5, retries=2,)
        error_indication, error_status, _, var_binds = await get_cmd(SnmpEngine(), CommunityData("public", mpModel=0), transport, ContextData(), ObjectType(ObjectIdentity(oid)), )
        if error_indication or error_status or not var_binds: return ""
        return var_binds[0][1].prettyPrint().strip()

    except Exception as exc:
        print(f"{ip} SNMP ERROR {oid}: {exc}")
        return ""

def is_valid_serial(value: str) -> bool:
    """Return True if an SNMP value looks like a real serial number."""

    if not value:
        return False

    value_upper = value.upper()

    invalid_values = {
        "NONE",
        "N/A",
        "SN-E2",
        "LBP6650",
    }

    return (
        value_upper not in invalid_values
        and "NOSUCH" not in value_upper
    )


def parse_page_count(value):
    """Convert an SNMP page-count value to int."""

    if value is None:
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


async def get_printer_description(ip: str):
    """Get the printer's standard SNMP system description."""

    result = await snmp_get(
        ip,
        "1.3.6.1.2.1.1.1.0",
    )

    if result is None:
        return None

    return result.prettyPrint().strip()

async def get_printer_vendor_IANA(ip: str):
    result = await snmp_get(ip, "1.3.6.1.2.1.1.2.0")
    print(result)
    if result is None: return None
    oid = result.strip()
    prefix = "SNMPv2-SMI::enterprises."
    if oid.startswith(prefix): return oid[len(prefix):].split(".")[0]
    return None


async def get_printer_data(ip: str):
    """Return (printer_type, page_count, serial_number)."""
    print(f"{ip},")
    description = await get_printer_description(ip)

    if not description:
        return None, None, None

    description_upper = description.upper()

    # Default values
    printer_type = " ".join(description.split()[:3])
    page_oid = DEFAULT_OLDALSZAM_OID
    serial_oids = list(DEFAULT_SOROZATSZAM_OID)

    # ---------------------------------------------------------
    # HP
    # ---------------------------------------------------------

    if "HP" in description_upper and any(
        keyword in description_upper
        for keyword in (
            "JETDIRECT",
            "ETHERNET",
            "MULTI-ENVIRONMENT",
        )
    ):
        hp_result = await snmp_get(ip, HP_DESCRIPTION_OID)

        if hp_result is not None:
            hp_description = hp_result.prettyPrint().strip()

            if hp_description:
                printer_type = hp_description

    # ---------------------------------------------------------
    # Canon
    # ---------------------------------------------------------

    if "CANON" in description_upper:
        if "1133" in description_upper:
            page_oid = CANON_1133_PAGE_OID

        serial_oids.extend(CANON_SERIAL_OIDS)

    # ---------------------------------------------------------
    # Page count
    # ---------------------------------------------------------

    page_result = await snmp_get(ip, page_oid)
    pages = parse_page_count(page_result)

    # ---------------------------------------------------------
    # Serial number
    # ---------------------------------------------------------

    serial = None

    for oid in serial_oids:
        result = await snmp_get(ip, oid)

        if result is None:
            continue

        value = result.prettyPrint().strip()

        if is_valid_serial(value):
            serial = value
            break

    #print(f"{ip}\t{printer_type} ({serial}) - {pages}")

    return printer_type, pages, serial


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
            description = await get_printer_vendor_IANA(ip)
            print(f"{ip}\t{description}")

    import asyncio
    asyncio.run(doit())
