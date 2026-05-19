import sqlite3
import bcrypt

conn = sqlite3.connect("pgease.db")
rows = conn.execute("SELECT id, name, email, role, password_hash FROM users WHERE id <= 5").fetchall()
for r in rows:
    print(f"ID:{r[0]} | {r[3]} | {r[2]}")
    ok = bcrypt.checkpw(b"Admin@123", r[4].encode())
    ok2 = bcrypt.checkpw(b"Owner@123", r[4].encode())
    ok3 = bcrypt.checkpw(b"Resident@123", r[4].encode())
    if ok:   print("  -> password is Admin@123")
    if ok2:  print("  -> password is Owner@123")
    if ok3:  print("  -> password is Resident@123")
conn.close()
