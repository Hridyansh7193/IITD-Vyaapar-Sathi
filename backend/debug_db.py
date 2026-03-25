import sqlite3

try:
    conn = sqlite3.connect('vyaapar.db')
    cur = conn.cursor()
    
    # 1. Get Tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cur.fetchall()
    print(f"Tables: {tables}")
    
    # 2. For each table, get count
    for (t_name,) in tables:
        cur.execute(f"SELECT COUNT(*) FROM {t_name}")
        count = cur.fetchone()[0]
        print(f"Table {t_name}: {count} rows")
        
        # If it's products, get categories
        if t_name == 'products':
            cur.execute("SELECT category, COUNT(*) FROM products GROUP BY category")
            cats = cur.fetchall()
            print(f"Product Categories: {cats}")
            
    conn.close()
except Exception as e:
    print(f"Error: {e}")
