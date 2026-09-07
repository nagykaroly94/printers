import mysql.connector

def get_db_connection(config):
    return mysql.connector.connect(
        host=config["mysql"]["host"],
        user=config["mysql"]["user"],
        password=config["mysql"]["password"],
        database=config["mysql"]["database"]
    )

def execute_statement(config, statement, params=()):
    conn = None
    cursor = None

    try:
        conn = get_db_connection(config)
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
