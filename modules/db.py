import mysql.connector

mysql_config = {}

def db_configure(config):
    global mysql_config
    missing = {"host", "user", "password", "database"} - config.keys()
    if missing: raise RuntimeError(f"Invalid MySQL configuration! Missing config fields: {', '.join(missing)}")
    mysql_config = config

def get_db_connection():
    if not mysql_config: raise RuntimeError("MySQL configuration has not been initialized!")
    return mysql.connector.connect(
        host = mysql_config["host"],
        user = mysql_config["user"],
        password = mysql_config["password"],
        database = mysql_config["database"]
    )

def db_execute_statement(statement, params=()):
    conn = None
    cursor = None

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        if not isinstance(params, (list, tuple, dict)): params = (params,)
        cursor.execute(statement, params)

        if cursor.description is None:
            conn.commit()
            return cursor.rowcount

        return cursor.fetchall()

    except Exception:
        if conn is not None: conn.rollback()
        raise

    finally:
        if cursor is not None: cursor.close()
        if conn is not None: conn.close()