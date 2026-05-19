import sqlite3
conn = sqlite3.connect("pgease.db")
conn.execute("UPDATE users SET email=? WHERE role=?", ["admin@pgease.com", "super_admin"])
conn.commit()
row = conn.execute("SELECT id, name, email, role FROM users WHERE role=?", ["super_admin"]).fetchone()
print("Admin account:", row)
conn.close()
print("Done. Login: admin@pgease.com / Admin@123")
