#!/usr/bin/env python3

# Skrypt do naprawienia app.py - wyjęcie blueprintów z bloku except

with open('backend/app.py', 'r') as f:
    content = f.read()

# Znajdź miejsce gdzie jest błąd i napraw
lines = content.split('\n')
new_lines = []
inside_except = False
except_indent = 0

for i, line in enumerate(lines):
    # Jeśli to jest linia "except Exception as e:" dla coupons
    if "❌ Błąd coupons blueprint:" in line:
        inside_except = True
        except_indent = len(line) - len(line.lstrip())
        new_lines.append(line)
        continue
    
    # Jeśli jesteśmy w except i widzimy "# Potem reszta"
    if inside_except and "# Potem reszta" in line:
        # Zakończ except i dodaj kod poza nim
        new_lines.append('')
        new_lines.append('    # Potem reszta - poza except')
        inside_except = False
        continue
    
    # Jeśli jesteśmy w except, ale to kod blueprintów, zmień wcięcie
    if inside_except and ("from api." in line or "app.register_blueprint" in line or "print(\"✅" in line):
        # Usuń dodatkowe wcięcie (4 spacje)
        if line.startswith('        '):
            new_lines.append(line[4:])
        else:
            new_lines.append(line)
        continue
    
    # Jeśli to jest "# Dodaj nowe blueprinty" w except, zakończ except
    if inside_except and "# Dodaj nowe blueprinty" in line:
        new_lines.append('')
        new_lines.append('    # Dodaj nowe blueprinty z obsługą błędów')
        inside_except = False
        continue
        
    new_lines.append(line)

# Zapisz naprawiony plik
with open('backend/app_fixed.py', 'w') as f:
    f.write('\n'.join(new_lines))

print("✅ Plik naprawiony: backend/app_fixed.py")
