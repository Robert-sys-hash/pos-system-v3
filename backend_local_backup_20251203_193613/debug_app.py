"""
Debug wersja app.py - sprawdzamy co blokuje rejestrację blueprintów
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

print("🔍 Rozpoczynam debug app.py...")

# 1. Test coupons blueprint
print("1️⃣ Testuję coupons blueprint...")
try:
    from api.coupons import coupons_bp
    print("✅ Coupons blueprint import OK")
except Exception as e:
    print(f"❌ Błąd coupons blueprint import: {e}")
    sys.exit(1)

# 2. Test podstawowych blueprintów
print("2️⃣ Testuję podstawowe blueprinty...")
try:
    from api.customers import customers_bp
    print("✅ Customers blueprint import OK")
    from api.products import products_bp  
    print("✅ Products blueprint import OK")
    from api.pos import pos_bp
    print("✅ POS blueprint import OK")
    from api.categories import categories_bp
    print("✅ Categories blueprint import OK")
    print("✅ Wszystkie podstawowe blueprinty załadowane")
except Exception as e:
    print(f"❌ Błąd podstawowych blueprintów: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 3. Test auth blueprint
print("3️⃣ Testuję auth blueprint...")
try:
    from api.auth import auth_bp
    print("✅ Auth blueprint import OK")
except Exception as e:
    print(f"❌ Błąd auth blueprint: {e}")
    import traceback
    traceback.print_exc()

# 4. Test warehouses blueprint
print("4️⃣ Testuję warehouses blueprint...")
try:
    from api.warehouses import warehouses_bp
    print("✅ Warehouses blueprint import OK")
except Exception as e:
    print(f"❌ Błąd warehouses blueprint: {e}")
    import traceback
    traceback.print_exc()

print("🎯 Debug zakończony pomyślnie - wszystkie blueprinty można importować!")
