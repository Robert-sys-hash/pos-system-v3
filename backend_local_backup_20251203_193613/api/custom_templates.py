"""
API dla edytora customowych szablonów faktur
Pozwala na tworzenie, edycję i zarządzanie szablonami przez interfejs graficzny
"""

from flask import Blueprint, request, jsonify, Response
from datetime import datetime
import sqlite3
import json
import os
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

custom_templates_bp = Blueprint('custom_templates', __name__)

# Rejestracja czcionek UTF-8 do obsługi polskich znaków
def register_utf8_fonts():
    """Rejestruje czcionki obsługujące UTF-8"""
    try:
        # Lista możliwych ścieżek do czcionek DejaVu
        font_paths = [
            # macOS
            '/System/Library/Fonts/DejaVuSans.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            # Linux
            '/usr/share/fonts/dejavu/DejaVuSans.ttf',
            # Windows
            'C:/Windows/Fonts/DejaVuSans.ttf',
        ]
        
        bold_font_paths = [
            # macOS  
            '/System/Library/Fonts/DejaVuSans-Bold.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
            # Linux
            '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf',
            # Windows
            'C:/Windows/Fonts/DejaVuSans-Bold.ttf',
        ]
        
        # Spróbuj znaleźć i zarejestrować czcionki
        font_registered = False
        bold_font_registered = False
        
        for path in font_paths:
            if os.path.exists(path):
                try:
                    pdfmetrics.registerFont(TTFont('DejaVuSans', path))
                    font_registered = True
                    print(f"✅ Zarejestrowano czcionkę DejaVuSans: {path}")
                    break
                except Exception as e:
                    print(f"⚠️ Nie udało się zarejestrować {path}: {e}")
                    
        for path in bold_font_paths:
            if os.path.exists(path):
                try:
                    pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', path))
                    bold_font_registered = True
                    print(f"✅ Zarejestrowano czcionkę DejaVuSans-Bold: {path}")
                    break
                except Exception as e:
                    print(f"⚠️ Nie udało się zarejestrować bold {path}: {e}")
        
        # Jeśli nie ma DejaVu, spróbuj innych czcionek systemowych obsługujących UTF-8
        if not font_registered:
            # macOS - system fonts
            system_fonts = [
                '/System/Library/Fonts/Arial.ttf',
                '/System/Library/Fonts/Helvetica.ttc',
            ]
            
            for path in system_fonts:
                if os.path.exists(path):
                    try:
                        pdfmetrics.registerFont(TTFont('SystemUTF8', path))
                        font_registered = True
                        print(f"✅ Zarejestrowano systemową czcionkę UTF-8: {path}")
                        break
                    except Exception as e:
                        print(f"⚠️ Nie udało się zarejestrować systemowej czcionki {path}: {e}")
        
        if not font_registered:
            print("⚠️ Nie znaleziono żadnej czcionki UTF-8 - polskie znaki mogą się nie wyświetlać poprawnie")
            
        # Zawsze spróbuj zarejestrować rodzinę czcionek Helvetica (domyślnie dostępna)
        try:
            registerFontFamily('Helvetica', normal='Helvetica', bold='Helvetica-Bold', italic='Helvetica-Oblique', boldItalic='Helvetica-BoldOblique')
            print("✅ Zarejestrowano rodzinę czcionek Helvetica")
        except Exception as e:
            print(f"⚠️ Błąd rejestracji rodziny Helvetica: {e}")
            
        # Wyświetl dostępne czcionki
        available_fonts = pdfmetrics.getRegisteredFontNames()
        print(f"🔤 Dostępne czcionki: {available_fonts}")
            
    except Exception as e:
        print(f"❌ Błąd podczas rejestracji czcionek UTF-8: {e}")

# Zarejestruj czcionki przy imporcie modułu
register_utf8_fonts()

class CustomTemplateManager:
    def __init__(self, db_path=None):
        if db_path:
            self.db_path = db_path
        else:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            self.db_path = os.path.join(current_dir, '..', 'kupony.db')
        
        self.init_database()
    
    def init_database(self):
        """Inicjalizacja tabeli dla customowych szablonów"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS custom_invoice_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    description TEXT,
                    config JSON NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    active BOOLEAN DEFAULT 1,
                    anchored BOOLEAN DEFAULT 0
                )
            """)
            
            # Sprawdź czy kolumna anchored istnieje, jeśli nie - dodaj
            cursor.execute("PRAGMA table_info(custom_invoice_templates)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'anchored' not in columns:
                cursor.execute("ALTER TABLE custom_invoice_templates ADD COLUMN anchored BOOLEAN DEFAULT 0")
                print("✅ Dodano kolumnę 'anchored' do tabeli custom_invoice_templates")
            
            conn.commit()
            print("✅ Tabela custom_invoice_templates utworzona/sprawdzona")
            
        except Exception as e:
            print(f"❌ Błąd inicjalizacji bazy danych dla customowych szablonów: {e}")
        finally:
            conn.close()
    
    def save_template(self, template_data):
        """Zapisz nowy customowy szablon"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO custom_invoice_templates (name, description, config)
                VALUES (?, ?, ?)
            """, [
                template_data['name'],
                template_data.get('description', ''),
                json.dumps(template_data['config'])
            ])
            
            template_id = cursor.lastrowid
            conn.commit()
            
            print(f"✅ Customowy szablon '{template_data['name']}' zapisany z ID: {template_id}")
            return template_id
            
        except sqlite3.IntegrityError:
            raise Exception("Szablon o tej nazwie już istnieje")
        except Exception as e:
            print(f"❌ Błąd zapisywania szablonu: {e}")
            raise e
        finally:
            conn.close()
    
    def get_templates(self):
        """Pobierz wszystkie customowe szablony"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, description, config, created_at, updated_at, active, anchored
                FROM custom_invoice_templates
                WHERE active = 1
                ORDER BY created_at DESC
            """)
            
            templates = []
            for row in cursor.fetchall():
                template = dict(row)
                template['config'] = json.loads(template['config'])
                # Convert anchored from int to boolean
                template['anchored'] = bool(template['anchored'])
                templates.append(template)
            
            return templates
            
        except Exception as e:
            print(f"❌ Błąd pobierania customowych szablonów: {e}")
            return []
        finally:
            conn.close()
    
    def update_template(self, template_id, template_data):
        """Aktualizuj istniejący szablon"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Build update query dynamically based on provided fields
            update_fields = []
            update_values = []
            
            if 'name' in template_data:
                update_fields.append("name = ?")
                update_values.append(template_data['name'])
            
            if 'description' in template_data:
                update_fields.append("description = ?")
                update_values.append(template_data.get('description', ''))
            
            if 'config' in template_data:
                update_fields.append("config = ?")
                update_values.append(json.dumps(template_data['config']))
            
            if 'anchored' in template_data:
                update_fields.append("anchored = ?")
                update_values.append(1 if template_data['anchored'] else 0)
            
            if not update_fields:
                raise Exception("Brak danych do aktualizacji")
            
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            update_values.append(template_id)
            
            query = f"""
                UPDATE custom_invoice_templates
                SET {', '.join(update_fields)}
                WHERE id = ? AND active = 1
            """
            
            cursor.execute(query, update_values)
            
            if cursor.rowcount == 0:
                raise Exception("Szablon nie został znaleziony")
            
            conn.commit()
            print(f"✅ Szablon ID {template_id} zaktualizowany")
            
        except Exception as e:
            print(f"❌ Błąd aktualizacji szablonu: {e}")
            raise e
        finally:
            conn.close()
    
    def delete_template(self, template_id):
        """Usuń szablon (soft delete) - tylko jeśli nie jest zakotwiczony"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Check if template is anchored
            cursor.execute("""
                SELECT anchored FROM custom_invoice_templates
                WHERE id = ? AND active = 1
            """, [template_id])
            
            result = cursor.fetchone()
            if not result:
                raise Exception("Szablon nie został znaleziony")
            
            if result[0]:  # Template is anchored
                raise Exception("Nie można usunąć zakotwiczonego szablonu")
            
            cursor.execute("""
                UPDATE custom_invoice_templates
                SET active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, [template_id])
            
            if cursor.rowcount == 0:
                raise Exception("Szablon nie został znaleziony")
            
            conn.commit()
            print(f"✅ Szablon ID {template_id} usunięty")
            
        except Exception as e:
            print(f"❌ Błąd usuwania szablonu: {e}")
            raise e
        finally:
            conn.close()
    
    def duplicate_template(self, template_id, new_name=None):
        """Duplikuj szablon"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get the original template
            cursor.execute("""
                SELECT name, description, config FROM custom_invoice_templates
                WHERE id = ? AND active = 1
            """, [template_id])
            
            result = cursor.fetchone()
            if not result:
                raise Exception("Szablon nie został znaleziony")
            
            original_name, description, config = result
            
            # Create new name if not provided
            if not new_name:
                new_name = f"Kopia - {original_name}"
            
            # Insert the duplicate (not anchored by default)
            cursor.execute("""
                INSERT INTO custom_invoice_templates 
                (name, description, config, active, anchored, created_at, updated_at)
                VALUES (?, ?, ?, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """, [new_name, description, config])
            
            new_template_id = cursor.lastrowid
            conn.commit()
            
            print(f"✅ Szablon zduplikowany - nowy ID: {new_template_id}")
            return new_template_id
            
        except Exception as e:
            print(f"❌ Błąd duplikowania szablonu: {e}")
            raise e
        finally:
            conn.close()
    
    def generate_pdf_with_fields_template(self, invoice_data, positions, template_config):
        """Generuj PDF używając nowej struktury szablonu z polami"""
        try:
            # Pobierz ustawienia szablonu
            settings = template_config.get('settings', {})
            margins = settings.get('margins', {})
            
            buffer = BytesIO()
            
            # Pobierz pola szablonu
            fields = template_config.get('fields', [])
            
            # Sprawdź czy jakiekolwiek pole ma współrzędne X,Y
            has_positioned_fields = any(
                field.get('x') is not None or field.get('y') is not None 
                for field in fields
            )
            
            if has_positioned_fields:
                # Użyj Canvas dla pozycjonowania absolutnego
                return self._generate_pdf_with_canvas(invoice_data, positions, template_config, buffer)
            else:
                # Użyj SimpleDocTemplate dla sekwencyjnego układu
                return self._generate_pdf_with_flowables(invoice_data, positions, template_config, buffer)
                
        except Exception as e:
            print(f"❌ Błąd generowania PDF z polami szablonu: {e}")
            raise e
            
    def _generate_pdf_with_canvas(self, invoice_data, positions, template_config, buffer):
        """Generuj PDF z pozycjonowaniem absolutnym używając Canvas"""
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
        
        def draw_multiline_text(canvas_obj, text, x, y, font_name, font_size, max_width=None, line_height=None):
            """Rysuje tekst wieloliniowy z automatycznym łamaniem linii"""
            if line_height is None:
                line_height = font_size * 1.2
            
            # Sprawdź czy tekst zawiera znaki nowej linii
            lines = text.split('\n')
            final_lines = []
            
            for line in lines:
                if max_width and canvas_obj.stringWidth(line, font_name, font_size) > max_width:
                    # Podziel długą linię na słowa
                    words = line.split(' ')
                    current_line = ''
                    
                    for word in words:
                        test_line = current_line + (' ' if current_line else '') + word
                        if canvas_obj.stringWidth(test_line, font_name, font_size) <= max_width:
                            current_line = test_line
                        else:
                            if current_line:
                                final_lines.append(current_line)
                                current_line = word
                            else:
                                final_lines.append(word)  # Słowo dłuższe niż max_width
                    
                    if current_line:
                        final_lines.append(current_line)
                else:
                    final_lines.append(line)
            
            # Rysuj linie
            current_y = y
            for line in final_lines:
                canvas_obj.drawString(x, current_y, line)
                current_y -= line_height
            
            return current_y  # Zwróć pozycję Y po ostatniej linii

        def draw_styled_multiline_text(canvas_obj, field, x, y, font_name, font_size, max_width=None, line_height=None, replaced_content=None):
            """Rysuje tekst wieloliniowy z indywidualnymi stylami dla każdej linii"""
            if line_height is None:
                line_height = font_size * 1.2
            
            # Pobierz contentLines i lineStyles z pola
            content_lines = field.get('contentLines', [])
            line_styles = field.get('lineStyles', [])
            
            print(f"🔍 DEBUG STYLED TEXT: contentLines={content_lines}")
            print(f"🔍 DEBUG STYLED TEXT: lineStyles={line_styles}")
            
            # Fallback do zwykłego content jeśli brak contentLines
            if not content_lines:
                # WAŻNE: Użyj zastąpiony content jeśli został przekazany
                if replaced_content is not None:
                    content = replaced_content
                else:
                    content = field.get('content', '')
                content_lines = content.split('\n') if content else ['']
            
            current_y = y
            
            for i, line_content in enumerate(content_lines):
                # Pobierz styl dla tej linii
                line_style = line_styles[i] if i < len(line_styles) else {}
                is_bold = line_style.get('bold', False)
                
                print(f"🔍 DEBUG LINIA {i}: content='{line_content}', style={line_style}, is_bold={is_bold}")
                
                # Ustaw czcionkę dla tej linii
                current_font = font_name
                current_size = font_size
                
                if is_bold:
                    # Sprawdź czy istnieje pogrubiona wersja czcionki
                    registered_fonts = pdfmetrics.getRegisteredFontNames()
                    print(f"🔍 DEBUG: Dostępne czcionki: {registered_fonts}")
                    
                    if font_name == 'SystemUTF8':
                        bold_font = 'SystemUTF8-Bold'  # Jeśli jest dostępna
                    elif font_name == 'DejaVuSans':
                        bold_font = 'DejaVuSans-Bold'  # Jeśli jest dostępna
                    elif font_name == 'Helvetica':
                        bold_font = 'Helvetica-Bold'
                    else:
                        bold_font = 'Helvetica-Bold'  # Default fallback
                    
                    # Sprawdź czy pogrubiona czcionka jest zarejestrowana
                    if bold_font in registered_fonts:
                        current_font = bold_font
                        canvas_obj.setFont(bold_font, font_size)
                        print(f"🔍 DEBUG: Używam bold czcionki {bold_font} dla linii {i}")
                    else:
                        # Fallback do zwykłej czcionki z większym rozmiarem
                        current_size = font_size + 1
                        canvas_obj.setFont(font_name, font_size + 1)
                        print(f"🔍 DEBUG: Fallback - bold czcionka {bold_font} nie dostępna, używam {font_name} z rozmiarem {font_size + 1} dla linii {i}")
                else:
                    canvas_obj.setFont(font_name, font_size)
                
                # Rysuj linię
                if max_width and canvas_obj.stringWidth(line_content, current_font, current_size) > max_width:
                    # Obsłuż długie linie (wrap)
                    words = line_content.split(' ')
                    current_line = ''
                    
                    for word in words:
                        test_line = current_line + (' ' if current_line else '') + word
                        if canvas_obj.stringWidth(test_line, current_font, current_size) <= max_width:
                            current_line = test_line
                        else:
                            if current_line:
                                canvas_obj.drawString(x, current_y, current_line)
                                current_y -= line_height
                                current_line = word
                            else:
                                canvas_obj.drawString(x, current_y, word)
                                current_y -= line_height
                    
                    if current_line:
                        canvas_obj.drawString(x, current_y, current_line)
                        current_y -= line_height
                else:
                    canvas_obj.drawString(x, current_y, line_content)
                    current_y -= line_height
            
            return current_y  # Zwróć pozycję Y po ostatniej linii
        
        # Pobierz ustawienia
        settings = template_config.get('settings', {})
        margins = settings.get('margins', {})
        fields = template_config.get('fields', [])
        
        # Utwórz canvas
        c = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4
        
        # Sortuj pola według pozycji Y (od góry do dołu)
        sorted_fields = sorted(fields, key=lambda f: f.get('y', 0))
        
        # Zmienna do śledzenia przesunięcia przez tabele
        y_offset = 0
        table_positions = {}  # Śledź pozycje tabel: {table_y: {'height': X, 'x_start': X, 'x_end': X}}
        cumulative_y_offset = 0  # Globalny offset akumulujący wysokości tabel
        
        # Dodaj pola z pozycjonowaniem progresywnym
        for field in sorted_fields:
            field_type = field.get('type', 'text')
            content = field.get('content', '')
            original_y = field.get('y', margins.get('top', 50))
            original_x = field.get('x', margins.get('left', 50))
            
            # Sprawdź czy to pole powinno być przesunięte przez wcześniejsze tabele
            current_y_offset = 0
            for table_y, table_info in table_positions.items():
                # Pole musi być poniżej tabeli (Y) I w zakresie X tabeli
                if (original_y > table_y and 
                    original_x >= table_info['x_start'] and 
                    original_x <= table_info['x_end']):
                    current_y_offset += table_info['height']
            
            if field_type == 'text':
                print(f"🔍 DEBUG CANVAS TEXT: id={field.get('id')}, textAlign={field.get('style', {}).get('textAlign', 'left')}")
                
                # Zastąp placeholdery w content
                content = self._replace_placeholders(content, invoice_data)
                
                # Zastąp placeholdery w contentLines jeśli istnieją
                if field.get('contentLines'):
                    replaced_content_lines = []
                    for line in field.get('contentLines', []):
                        replaced_line = self._replace_placeholders(line, invoice_data)
                        replaced_content_lines.append(replaced_line)
                    field['contentLines'] = replaced_content_lines
                
                # Pobierz pozycję (domyślnie lewy górny róg)
                x = field.get('x', margins.get('left', 50))
                y = height - original_y - current_y_offset - cumulative_y_offset  # Odwróć Y i dodaj przesunięcie
                
                # Pobierz styl z globalnych ustawień jako domyślne
                # Globalne ustawienia szablonu
                global_font_size = settings.get('font_size', settings.get('globalFontSize', 12))
                global_font_family = settings.get('font_family', settings.get('globalFontFamily', 'SystemUTF8'))
                global_text_case = settings.get('text_case', settings.get('globalTextCase', 'normal'))  # normal, uppercase, lowercase, capitalize
                
                font_size = field.get('style', {}).get('fontSize', global_font_size)
                color = field.get('style', {}).get('color', '#000000')
                text_align = field.get('style', {}).get('textAlign', 'left')
                
                # Zastosuj globalny case dla tekstu
                if global_text_case == 'uppercase':
                    content = content.upper()
                elif global_text_case == 'lowercase':
                    content = content.lower()
                elif global_text_case == 'capitalize':
                    content = content.title()
                
                # Ustaw czcionkę - użyj globalnej lub sprawdź dostępność
                font_name = global_font_family
                registered_fonts = pdfmetrics.getRegisteredFontNames()
                
                # Fallback do dostępnych czcionek jeśli wybrana nie istnieje
                if font_name not in registered_fonts:
                    if "DejaVuSans" in registered_fonts:
                        font_name = "DejaVuSans"
                    elif "SystemUTF8" in registered_fonts:
                        font_name = "SystemUTF8"
                    else:
                        font_name = "Helvetica"
                c.setFont(font_name, font_size)
                if color.startswith('#'):
                    # Konwertuj hex na RGB
                    color_hex = color.lstrip('#')
                    r = int(color_hex[0:2], 16) / 255
                    g = int(color_hex[2:4], 16) / 255
                    b = int(color_hex[4:6], 16) / 255
                    c.setFillColorRGB(r, g, b)
                
                # Wyrównanie tekstu i rysowanie wieloliniowe
                max_width = field.get('style', {}).get('maxWidth', 400)  # Domyślna szerokość
                
                if text_align == 'center':
                    # Dla wyśrodkowanego tekstu, obsłuż styled lines
                    if field.get('contentLines') or field.get('lineStyles'):
                        content_lines = field.get('contentLines', [])
                        line_styles = field.get('lineStyles', [])
                        
                        if not content_lines:
                            content_lines = content.split('\n') if content else ['']
                        
                        current_y = y
                        line_height = font_size * 1.2
                        
                        for i, line_content in enumerate(content_lines):
                            line_style = line_styles[i] if i < len(line_styles) else {}
                            is_bold = line_style.get('bold', False)
                            
                            # Ustaw czcionkę
                            current_font = font_name
                            current_size = font_size
                            if is_bold:
                                if font_name == 'Helvetica':
                                    current_font = 'Helvetica-Bold'
                                else:
                                    current_size = font_size + 1  # Fallback
                            
                            c.setFont(current_font, current_size)
                            text_width = c.stringWidth(line_content, current_font, current_size)
                            line_x = x - text_width / 2
                            c.drawString(line_x, current_y, line_content)
                            current_y -= line_height
                    else:
                        # Standardowe center alignment
                        lines = content.split('\n')
                        current_y = y
                        line_height = font_size * 1.2
                        
                        for line in lines:
                            text_width = c.stringWidth(line, font_name, font_size)
                            line_x = x - text_width / 2
                            c.drawString(line_x, current_y, line)
                            current_y -= line_height
                            
                elif text_align == 'right':
                    # Dla tekstu wyrównanego do prawej, obsłuż styled lines
                    if field.get('contentLines') or field.get('lineStyles'):
                        content_lines = field.get('contentLines', [])
                        line_styles = field.get('lineStyles', [])
                        
                        if not content_lines:
                            content_lines = content.split('\n') if content else ['']
                        
                        current_y = y
                        line_height = font_size * 1.2
                        
                        for i, line_content in enumerate(content_lines):
                            line_style = line_styles[i] if i < len(line_styles) else {}
                            is_bold = line_style.get('bold', False)
                            
                            # Ustaw czcionkę
                            current_font = font_name
                            current_size = font_size
                            if is_bold:
                                if font_name == 'Helvetica':
                                    current_font = 'Helvetica-Bold'
                                else:
                                    current_size = font_size + 1  # Fallback
                            
                            c.setFont(current_font, current_size)
                            text_width = c.stringWidth(line_content, current_font, current_size)
                            line_x = x - text_width
                            c.drawString(line_x, current_y, line_content)
                            current_y -= line_height
                    else:
                        # Standardowe right alignment
                        lines = content.split('\n')
                        current_y = y
                        line_height = font_size * 1.2
                        
                        for line in lines:
                            text_width = c.stringWidth(line, font_name, font_size)
                            line_x = x - text_width
                            c.drawString(line_x, current_y, line)
                            current_y -= line_height
                else:
                    # Tekst wyrównany do lewej - użyj funkcji wieloliniowej ze stylami
                    # Sprawdź czy pole ma contentLines lub lineStyles
                    has_content_lines = bool(field.get('contentLines'))
                    has_line_styles = bool(field.get('lineStyles'))
                    print(f"🔍 DEBUG FIELD: id={field.get('id')}, has_contentLines={has_content_lines}, has_lineStyles={has_line_styles}")
                    
                    if has_content_lines or has_line_styles:
                        print(f"🔍 DEBUG: Używam draw_styled_multiline_text dla pola {field.get('id')}")
                        draw_styled_multiline_text(c, field, x, y, font_name, font_size, max_width, None, content)
                    else:
                        print(f"🔍 DEBUG: Używam draw_multiline_text dla pola {field.get('id')}")
                        # Użyj standardowej funkcji dla prostego tekstu
                        draw_multiline_text(c, content, x, y, font_name, font_size, max_width)
                
            elif field_type == 'table':
                # Implementacja tabeli w Canvas
                table_config = field.get('tableConfig', {})
                columns = table_config.get('columns', [])
                
                # Sprawdź czy to tabela VAT (na podstawie kolumn)
                is_vat_table = self._is_vat_summary_table(columns)
                
                if is_vat_table and invoice_data.get('vat_summary'):
                    # Renderuj tabelę VAT
                    print(f"Rendering VAT summary table in Canvas. VAT data: {invoice_data.get('vat_summary')}")
                    print(f"🔍 DEBUG: Przed renderowaniem tabeli VAT, cumulative_y_offset = {cumulative_y_offset}")
                    table_height = self._render_vat_table_canvas(c, field, invoice_data['vat_summary'], table_config, margins, height, cumulative_y_offset, settings)
                    # Aktualizuj globalny offset o wysokość tabeli + odstęp
                    cumulative_y_offset += table_height + 5  # 5 punktów odstępu między tabelami
                    print(f"🔍 DEBUG: Po renderowaniu tabeli VAT, cumulative_y_offset = {cumulative_y_offset}")
                elif positions and columns:
                    # Renderuj standardową tabelę produktów
                    print(f"🔍 DEBUG: Przed renderowaniem tabeli produktów, cumulative_y_offset = {cumulative_y_offset}")
                    table_height = self._render_products_table_canvas(c, field, positions, invoice_data, table_config, margins, height, cumulative_y_offset, settings)
                    # Aktualizuj globalny offset o wysokość tabeli + odstęp
                    cumulative_y_offset += table_height + 5  # 5 punktów odstępu między tabelami
                    print(f"🔍 DEBUG: Po renderowaniu tabeli produktów, cumulative_y_offset = {cumulative_y_offset}")
                else:
                    print(f"No data to render table: positions={len(positions) if positions else 0}, columns={len(columns)}")
        
        c.save()
        buffer.seek(0)
        return buffer.getvalue()
        
    def _generate_pdf_with_flowables(self, invoice_data, positions, template_config, buffer):
        """Generuj PDF z układem sekwencyjnym używając SimpleDocTemplate"""
        # Oryginalny kod dla SimpleDocTemplate
        settings = template_config.get('settings', {})
        margins = settings.get('margins', {})
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=margins.get('right', 50),
            leftMargin=margins.get('left', 50), 
            topMargin=margins.get('top', 50),
            bottomMargin=margins.get('bottom', 50)
        )
        
        elements = []
        fields = template_config.get('fields', [])
        
        # Twórz elementy na podstawie pól
        for field in fields:
            field_type = field.get('type', 'text')
            content = field.get('content', '')
            
            if field_type == 'text':
                # Zastąp placeholdery danymi faktury
                content = self._replace_placeholders(content, invoice_data)
                
                # Pobierz globalne ustawienia
                global_font_size = settings.get('globalFontSize', 12)
                global_font_family = settings.get('globalFontFamily', 'SystemUTF8')
                global_text_case = settings.get('globalTextCase', 'normal')
                
                # Zastosuj globalny case dla tekstu
                if global_text_case == 'uppercase':
                    content = content.upper()
                elif global_text_case == 'lowercase':
                    content = content.lower()
                elif global_text_case == 'capitalize':
                    content = content.title()
                
                # Użyj globalnej czcionki lub fallback
                font_family = global_font_family
                registered_fonts = pdfmetrics.getRegisteredFontNames()
                
                # Fallback do dostępnych czcionek
                if font_family not in registered_fonts:
                    if "DejaVuSans" in registered_fonts:
                        font_family = "DejaVuSans"
                    elif "SystemUTF8" in registered_fonts:
                        font_family = "SystemUTF8"
                    else:
                        font_family = "Helvetica"
                
                style = ParagraphStyle(
                    f'field_{field.get("id", "default")}',
                    fontSize=field.get('style', {}).get('fontSize', global_font_size),
                    fontName=font_family,
                    textColor=colors.HexColor(field.get('style', {}).get('color', '#000000')),
                    alignment=self._get_alignment(field.get('style', {}).get('textAlign', 'left'))
                )
                
                # Dodaj paragraf
                para = Paragraph(content, style)
                elements.append(para)
                elements.append(Spacer(1, 12))
                    
            elif field_type == 'table':
                # Sprawdź czy to tabela VAT czy produktów
                table_type = field.get('tableType', 'products')  # domyślnie produkty
                
                if table_type == 'vat_summary':
                    # Tabela podsumowania VAT
                    print(f"Rendering VAT summary table. Invoice data VAT summary: {invoice_data.get('vat_summary')}")
                    if invoice_data.get('vat_summary'):
                        vat_data = [['Stawka VAT', 'Podstawa netto', 'Kwota VAT', 'Wartość brutto']]
                        for vat_row in invoice_data['vat_summary']:
                            row = [
                                f"{vat_row.get('stawka_vat', 0)}%",
                                f"{vat_row.get('podstawa_netto', 0):.2f} zł",
                                f"{vat_row.get('kwota_vat', 0):.2f} zł",
                                f"{vat_row.get('wartosc_brutto', 0):.2f} zł"
                            ]
                            vat_data.append(row)
                            print(f"Added VAT row: {row}")
                        
                        # Twórz tabelę VAT
                        vat_table = Table(vat_data, colWidths=[80, 100, 100, 100])
                        vat_table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('FONTSIZE', (0, 0), (-1, 0), 10),
                            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                            ('GRID', (0, 0), (-1, -1), 1, colors.black)
                        ]))
                        elements.append(vat_table)
                        elements.append(Spacer(1, 20))
                        print(f"VAT table added with {len(vat_data)-1} data rows")
                    else:
                        print("No VAT summary data found in invoice data")
                elif table_type == 'products':
                    # Tabela produktów (istniejący kod)
                    if positions:
                        table_data = [['Lp.', 'Nazwa produktu', 'Ilość', 'Cena jedn.', 'Wartość']]
                        for i, pos in enumerate(positions, 1):
                            row = [
                                str(i),
                                pos.get('nazwa_produktu', ''),
                                str(pos.get('ilosc', '')),
                                f"{pos.get('cena_jednostkowa_netto', 0):.2f} zł",
                                f"{pos.get('wartosc_brutto', 0):.2f} zł"
                            ]
                            table_data.append(row)
                        
                        # Twórz tabelę
                        table = Table(table_data, colWidths=[30, 200, 50, 80, 80])
                        table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('FONTSIZE', (0, 0), (-1, 0), 12),
                            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                            ('GRID', (0, 0), (-1, -1), 1, colors.black)
                        ]))
                        elements.append(table)
                        elements.append(Spacer(1, 20))
                else:
                    # Tabela z customowymi kolumnami (istniejący kod dla produktów jako fallback)
                    if positions:
                        table_data = [['Lp.', 'Nazwa produktu', 'Ilość', 'Cena jedn.', 'Wartość']]
                        for i, pos in enumerate(positions, 1):
                            row = [
                                str(i),
                                pos.get('nazwa_produktu', ''),
                                str(pos.get('ilosc', '')),
                                f"{pos.get('cena_jednostkowa_netto', 0):.2f} zł",
                                f"{pos.get('wartosc_brutto', 0):.2f} zł"
                            ]
                            table_data.append(row)
                        
                        # Twórz tabelę
                        table = Table(table_data, colWidths=[30, 200, 50, 80, 80])
                        table.setStyle(TableStyle([
                            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                            ('FONTSIZE', (0, 0), (-1, 0), 12),
                            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                            ('GRID', (0, 0), (-1, -1), 1, colors.black)
                        ]))
                        elements.append(table)
                        elements.append(Spacer(1, 20))
        
        # Jeśli brak pól, dodaj podstawowe elementy
        if not fields:
            # Użyj UTF-8 czcionki jeśli dostępna
            registered_fonts = pdfmetrics.getRegisteredFontNames()
            if "DejaVuSans" in registered_fonts:
                title_font = "DejaVuSans"
                normal_font = "DejaVuSans"
            elif "SystemUTF8" in registered_fonts:
                title_font = "SystemUTF8"
                normal_font = "SystemUTF8"
            else:
                title_font = "Helvetica"
                normal_font = "Helvetica"
                
            title_text = "FAKTURA"
            title_text = self._replace_placeholders(title_text, invoice_data)
            title = Paragraph(title_text, ParagraphStyle('Title', fontSize=16, alignment=1, fontName=title_font))
            elements.append(title)
            elements.append(Spacer(1, 20))
            
            info_text = f"Numer: {invoice_data.get('numer_faktury', 'N/A')}"
            info_text = self._replace_placeholders(info_text, invoice_data)
            info = Paragraph(info_text, ParagraphStyle('Normal', fontSize=12, fontName=normal_font))
            elements.append(info)
            elements.append(Spacer(1, 20))
        
    def _replace_placeholders(self, content, invoice_data):
        """Zastąp placeholdery w tekście danymi faktury"""
        
        # Debug do pliku
        with open('/Users/robson/Downloads/pos-system-v3/backend/template_debug.log', 'a') as f:
            f.write(f"DEBUG: _replace_placeholders called with content: {content}\n")
            f.write(f"DEBUG: invoice_data in replacements: {invoice_data}\n")
        
        # Oblicz kwotę do zapłaty
        suma_brutto = float(invoice_data.get('suma_brutto', 0))
        kwota_zaplacona = float(invoice_data.get('kwota_zaplacona', 0))
        kwota_do_zaplaty = max(0, suma_brutto - kwota_zaplacona)
        
        # Konwersja kwoty na słownie (podstawowa implementacja)
        def kwota_slownie(amount):
            """Konwertuje kwotę na słownie - podstawowa implementacja"""
            if amount == 0:
                return "zero złotych"
            
            # Uproszczona implementacja - w pełnej wersji potrzebny byłby bardziej zaawansowany konwerter
            grosze = int((amount - int(amount)) * 100)
            zlote = int(amount)
            
            if zlote == 1:
                zlote_str = "jeden złoty"
            elif zlote < 5:
                zlote_str = f"{zlote} złote"
            else:
                zlote_str = f"{zlote} złotych"
            
            return f"{zlote_str} {grosze:02d}/100"
        
        # Oblicz VAT według stawek z vat_summary
        vat_rates = {
            23: {'netto': 0, 'vat': 0, 'brutto': 0},
            8: {'netto': 0, 'vat': 0, 'brutto': 0},
            5: {'netto': 0, 'vat': 0, 'brutto': 0},
            0: {'netto': 0, 'vat': 0, 'brutto': 0},
            'zw': {'netto': 0, 'vat': 0, 'brutto': 0}
        }
        
        # Pobierz dane VAT z vat_summary
        vat_summary = invoice_data.get('vat_summary', [])
        for vat_row in vat_summary:
            stawka = vat_row.get('stawka_vat')
            if stawka in vat_rates:
                vat_rates[stawka]['netto'] = float(vat_row.get('podstawa_netto', 0))
                vat_rates[stawka]['vat'] = float(vat_row.get('kwota_vat', 0))
                vat_rates[stawka]['brutto'] = float(vat_row.get('wartosc_brutto', 0))
        
        replacements = {
            # Podstawowe dane faktury
            '{numer_faktury}': invoice_data.get('numer_faktury', ''),
            '{numer_paragonu}': invoice_data.get('paragon_numer', ''),  # Mapowanie z widoku: paragon_numer -> numer_paragonu
            '{data_wystawienia}': invoice_data.get('data_wystawienia', ''),
            '{data_sprzedazy}': invoice_data.get('data_sprzedazy', ''),
            '{termin_platnosci}': invoice_data.get('termin_platnosci', ''),
            '{sposob_platnosci}': invoice_data.get('forma_platnosci', ''),  # Mapowanie forma_platnosci -> sposob_platnosci
            
            # Dane sprzedawcy
            '{sprzedawca_nazwa}': invoice_data.get('sprzedawca_nazwa', ''),
            '{sprzedawca_adres}': invoice_data.get('sprzedawca_adres', ''),
            '{sprzedawca_nip}': invoice_data.get('sprzedawca_nip', ''),
            '{sprzedawca_regon}': invoice_data.get('sprzedawca_regon', ''),
            '{sprzedawca_telefon}': invoice_data.get('sprzedawca_telefon', ''),
            '{sprzedawca_email}': invoice_data.get('sprzedawca_email', ''),
            
            # Dane nabywcy
            '{nabywca_nazwa}': invoice_data.get('nabywca_nazwa', ''),
            '{nabywca_adres}': invoice_data.get('nabywca_adres', ''),
            '{nabywca_nip}': invoice_data.get('nabywca_nip', ''),
            '{nabywca_regon}': invoice_data.get('nabywca_regon', ''),
            '{nabywca_telefon}': invoice_data.get('nabywca_telefon', ''),
            '{nabywca_email}': invoice_data.get('nabywca_email', ''),
            
            # Podsumowania finansowe
            '{suma_netto}': str(invoice_data.get('suma_netto', 0)),
            '{suma_vat}': str(invoice_data.get('suma_vat', 0)),
            '{suma_brutto}': str(invoice_data.get('suma_brutto', 0)),
            '{kwota_slownie}': kwota_slownie(suma_brutto),
            
            # Płatności warunkowe
            '{kwota_zaplacona}': str(kwota_zaplacona),
            '{kwota_do_zaplaty}': str(kwota_do_zaplaty),
            '{status_platnosci}': invoice_data.get('status_platnosci', ''),
            
            # Oblicz VAT według stawek z vat_summary
            '{vat_23_netto}': str(vat_rates[23]['netto']),
            '{vat_23_vat}': str(vat_rates[23]['vat']), 
            '{vat_23_brutto}': str(vat_rates[23]['brutto']),
            '{vat_8_netto}': str(vat_rates[8]['netto']),
            '{vat_8_vat}': str(vat_rates[8]['vat']),
            '{vat_8_brutto}': str(vat_rates[8]['brutto']),
            '{vat_5_netto}': str(vat_rates[5]['netto']),
            '{vat_5_vat}': str(vat_rates[5]['vat']),
            '{vat_5_brutto}': str(vat_rates[5]['brutto']),
            '{vat_0_netto}': str(vat_rates[0]['netto']),
            '{vat_0_vat}': str(vat_rates[0]['vat']),
            '{vat_0_brutto}': str(vat_rates[0]['brutto']),
            '{vat_zw_netto}': str(vat_rates['zw']['netto']),
            '{vat_zw_vat}': str(vat_rates['zw']['vat']),
            '{vat_zw_brutto}': str(vat_rates['zw']['brutto']),
            
            # Dodatkowe pola
            '{uwagi}': invoice_data.get('uwagi', ''),
            '{miejsce_wystawienia}': invoice_data.get('miejsce_wystawienia', ''),
            '{waluta}': invoice_data.get('waluta', 'PLN'),
            '{kurs_waluty}': str(invoice_data.get('kurs_waluty', 1.0)),
            
            # Dodatkowe pola sprzedawcy
            '{sprzedawca_kod_pocztowy}': invoice_data.get('sprzedawca_kod_pocztowy', ''),
            '{sprzedawca_miasto}': invoice_data.get('sprzedawca_miasto', ''),
            '{sprzedawca_wojewodztwo}': invoice_data.get('sprzedawca_wojewodztwo', ''),
            '{sprzedawca_krs}': invoice_data.get('sprzedawca_krs', ''),
            '{sprzedawca_bank}': invoice_data.get('sprzedawca_bank', ''),
            '{sprzedawca_konto}': invoice_data.get('sprzedawca_konto', ''),
            '{sprzedawca_numer_konta}': invoice_data.get('sprzedawca_numer_konta', invoice_data.get('sprzedawca_konto', '')),
            
            # Dodatkowe pola nabywcy  
            '{nabywca_kod_pocztowy}': invoice_data.get('nabywca_kod_pocztowy', ''),
            '{nabywca_miasto}': invoice_data.get('nabywca_miasto', ''),
            '{nabywca_wojewodztwo}': invoice_data.get('nabywca_wojewodztwo', ''),
            '{nabywca_krs}': invoice_data.get('nabywca_krs', ''),
            
            # Daty w różnych formatach
            '{dzisiejsza_data}': invoice_data.get('dzisiejsza_data', ''),
            '{rok}': invoice_data.get('rok', ''),
            '{miesiac}': invoice_data.get('miesiac', ''),
            '{dzien}': invoice_data.get('dzien', ''),
            
            # Pola produktowe dla kolumn tabeli
            'lp': 'lp',  # Numer porządkowy
            'nazwa_produktu': 'nazwa_produktu',
            'kod_produktu': 'kod_produktu', 
            'ilosc': 'ilosc',
            'jednostka': 'jednostka',
            'cena_jednostkowa_netto': 'cena_jednostkowa_netto',
            'cena_jednostkowa_brutto': 'cena_jednostkowa_brutto',
            'wartosc_netto': 'wartosc_netto',
            'wartosc_brutto': 'wartosc_brutto',
            'stawka_vat': 'stawka_vat',
            'kwota_vat': 'kwota_vat'
        }
        
        for placeholder, value in replacements.items():
            content = content.replace(placeholder, str(value))
        
        # Debug wyniku
        with open('/Users/robson/Downloads/pos-system-v3/backend/template_debug.log', 'a') as f:
            f.write(f"DEBUG: final replaced content: {content}\n")
            if "{sprzedawca_nazwa}" in content:
                f.write(f"ERROR: sprzedawca_nazwa nie został zamieniony! Wartość: {invoice_data.get('sprzedawca_nazwa', 'BRAK')}\n")
            f.write("=== END REPLACEMENT ===\n")
        
        return content
    
    def _get_alignment(self, align):
        """Konwertuj alignment z CSS na ReportLab"""
        align_map = {
            'left': TA_LEFT,
            'center': TA_CENTER, 
            'right': TA_RIGHT
        }
        return align_map.get(align, TA_LEFT)

    def generate_pdf_with_custom_template(self, invoice_data, positions, template_config):
        """Generuj PDF używając customowej konfiguracji"""
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=A4,
                rightMargin=template_config.get('spacing', {}).get('margin', 20) * mm,
                leftMargin=template_config.get('spacing', {}).get('margin', 20) * mm,
                topMargin=template_config.get('spacing', {}).get('margin', 20) * mm,
                bottomMargin=template_config.get('spacing', {}).get('margin', 20) * mm
            )
            
            elements = []
            styles = self._create_custom_styles(template_config)
            
            # Tytuł
            if template_config.get('elements', {}).get('showInvoiceNumber', True):
                title_text = f"FAKTURA SPRZEDAŻY nr {invoice_data.get('numer_faktury', '')}"
                # Obsługa placeholderów w tytule
                title_text = self._replace_placeholders(title_text, invoice_data)
                title = Paragraph(title_text, styles['title'])
                elements.append(title)
                elements.append(Spacer(1, 20))
            
            # Informacje o fakturze
            if template_config.get('elements', {}).get('showDates', True):
                invoice_info = self._create_invoice_info_section(invoice_data, template_config, styles)
                elements.append(invoice_info)
                elements.append(Spacer(1, 20))
            
            # Dane stron
            if template_config.get('elements', {}).get('showSellerBuyer', True):
                parties = self._create_parties_section(invoice_data, template_config, styles)
                elements.append(parties)
                elements.append(Spacer(1, 30))
            
            # Customowe pola
            if template_config.get('customFields'):
                custom_section = self._create_custom_fields_section(template_config, styles, invoice_data)
                elements.append(custom_section)
                elements.append(Spacer(1, 20))
            
            # Tabela pozycji
            if template_config.get('elements', {}).get('showItemsTable', True) and positions:
                items_table = self._create_custom_items_table(positions, template_config, styles)
                elements.append(items_table)
                elements.append(Spacer(1, 20))
            
            # Podsumowanie
            if template_config.get('elements', {}).get('showSummary', True):
                summary = self._create_custom_summary(invoice_data, template_config, styles)
                elements.append(summary)
                elements.append(Spacer(1, 20))
            
            # Podpisy
            if template_config.get('elements', {}).get('showSignatures', True):
                signatures = self._create_signatures_section(template_config, styles, invoice_data)
                elements.append(signatures)
            
            doc.build(elements)
            buffer.seek(0)
            return buffer.getvalue()
            
        except Exception as e:
            print(f"❌ Błąd generowania PDF z customowym szablonem: {e}")
            raise e
    
    def _create_custom_styles(self, config):
        """Twórz style na podstawie konfiguracji"""
        base_styles = getSampleStyleSheet()
        
        # Użyj UTF-8 czcionki jeśli dostępna
        registered_fonts = pdfmetrics.getRegisteredFontNames()
        if "DejaVuSans" in registered_fonts:
            main_font = "DejaVuSans"
        elif "SystemUTF8" in registered_fonts:
            main_font = "SystemUTF8"
        else:
            main_font = "Helvetica"
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=base_styles['Heading1'],
            fontSize=config.get('fonts', {}).get('size', {}).get('title', 20),
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor(config.get('colors', {}).get('primary', '#007bff')),
            fontName=config.get('fonts', {}).get('main', main_font)
        )
        
        section_style = ParagraphStyle(
            'CustomSection',
            parent=base_styles['Heading2'],
            fontSize=config.get('fonts', {}).get('size', {}).get('section', 14),
            spaceBefore=20,
            spaceAfter=10,
            textColor=colors.HexColor(config.get('colors', {}).get('primary', '#007bff')),
            fontName=config.get('fonts', {}).get('main', main_font)
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=base_styles['Normal'],
            fontSize=config.get('fonts', {}).get('size', {}).get('normal', 10),
            fontName=config.get('fonts', {}).get('main', main_font)
        )
        
        return {
            'title': title_style,
            'section': section_style,
            'normal': normal_style
        }
    
    def _create_invoice_info_section(self, invoice, config, styles):
        """Twórz sekcję informacji o fakturze z obsługą placeholderów"""
        # Etykiety z możliwością customizacji przez placeholdery
        labels = config.get('labels', {})
        date_issued_label = self._replace_placeholders(labels.get('date_issued', 'Data wystawienia:'), invoice)
        date_sale_label = self._replace_placeholders(labels.get('date_sale', 'Data sprzedaży:'), invoice)
        due_date_label = self._replace_placeholders(labels.get('due_date', 'Termin płatności:'), invoice)
        payment_method_label = self._replace_placeholders(labels.get('payment_method', 'Forma płatności:'), invoice)
        
        data = [
            [date_issued_label, invoice.get('data_wystawienia', '')],
            [date_sale_label, invoice.get('data_sprzedazy', '')],
            [due_date_label, invoice.get('termin_platnosci', '')],
            [payment_method_label, invoice.get('forma_platnosci', 'gotówka')]
        ]
        
        table = Table(data, colWidths=[4*mm*10, 6*mm*10])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTSIZE', (0, 0), (-1, -1), config.get('fonts', {}).get('size', {}).get('normal', 10)),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor(config.get('colors', {}).get('border', '#dee2e6')))
        ]))
        
        return table
    
    def _create_parties_section(self, invoice, config, styles):
        """Twórz sekcję danych stron z obsługą placeholderów"""
        # Etykiety z możliwością customizacji
        labels = config.get('labels', {})
        seller_label = self._replace_placeholders(labels.get('seller', 'Sprzedawca'), invoice)
        buyer_label = self._replace_placeholders(labels.get('buyer', 'Nabywca'), invoice)
        
        # Formatowanie danych z placeholderami
        seller_template = config.get('templates', {}).get('seller', 
            '{sprzedawca_nazwa}\n{sprzedawca_adres}\n{sprzedawca_kod_pocztowy} {sprzedawca_miasto}\nNIP: {sprzedawca_nip}')
        buyer_template = config.get('templates', {}).get('buyer', 
            '{nabywca_nazwa}\n{nabywca_adres}\n{nabywca_kod_pocztowy} {nabywca_miasto}\nNIP: {nabywca_nip}')
        
        seller_info = self._replace_placeholders(seller_template, invoice)
        buyer_info = self._replace_placeholders(buyer_template, invoice)
        
        data = [
            [seller_label, buyer_label],
            [seller_info, buyer_info]
        ]
        
        table = Table(data, colWidths=[8*mm*10, 8*mm*10])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTSIZE', (0, 0), (-1, -1), config.get('fonts', {}).get('size', {}).get('normal', 10)),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(config.get('colors', {}).get('border', '#dee2e6'))),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor(config.get('colors', {}).get('border', '#dee2e6'))),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(config.get('colors', {}).get('headerBg', '#f8f9fa')))
        ]))
        
        return table
    
    def _create_custom_fields_section(self, config, styles, invoice_data=None):
        """Twórz sekcję customowych pól z obsługą placeholderów"""
        custom_fields = config.get('customFields', [])
        if not custom_fields:
            return Spacer(1, 0)
        
        data = []
        for field in custom_fields:
            # Obsługa placeholderów w label i value
            label = field.get('label', '')
            if invoice_data:
                label = self._replace_placeholders(label, invoice_data)
            
            # Obsługa różnych typów pól z placeholderami
            field_type = field.get('type', 'text')
            field_content = field.get('content', field.get('value', ''))
            
            if invoice_data and field_content:
                field_content = self._replace_placeholders(field_content, invoice_data)
            elif not field_content:
                field_content = f"[{field_type}]"  # Fallback jeśli brak zawartości
            
            data.append([f"{label}:", field_content])
        
        table = Table(data, colWidths=[4*mm*10, 6*mm*10])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTSIZE', (0, 0), (-1, -1), config.get('fonts', {}).get('size', {}).get('small', 8)),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        return table
    
    def _create_custom_items_table(self, positions, config, styles):
        """Twórz customową tabelę pozycji"""
        table_config = config.get('tableConfig', {})
        show_row_numbers = table_config.get('showRowNumbers', True)
        
        # Nagłówki
        headers = []
        if show_row_numbers:
            headers.append("Lp.")
        headers.extend(["Nazwa", "Ilość", "Cena", "Wartość"])
        
        data = [headers]
        
        # Dane
        for i, pos in enumerate(positions, 1):
            row = []
            if show_row_numbers:
                row.append(str(i))
            row.extend([
                pos.get('nazwa_produktu', ''),
                f"{pos.get('ilosc', 0):.0f}",
                f"{pos.get('cena_jednostkowa_netto', 0):.2f}",
                f"{pos.get('wartosc_brutto', 0):.2f}"
            ])
            data.append(row)
        
        # Szerokości kolumn
        col_widths = []
        if show_row_numbers:
            col_widths.append(1*mm*10)
        col_widths.extend([8*mm*10, 2*mm*10, 2*mm*10, 2*mm*10])
        
        table = Table(data, colWidths=col_widths)
        
        # Style tabeli
        table_style = [
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('FONTSIZE', (0, 0), (-1, -1), config.get('fonts', {}).get('size', {}).get('normal', 10)),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(config.get('colors', {}).get('border', '#dee2e6'))),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor(config.get('colors', {}).get('border', '#dee2e6'))),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(config.get('colors', {}).get('headerBg', '#f8f9fa')))
        ]
        
        # Przemienne kolory wierszy
        if table_config.get('alternateRowColors', False):
            for i in range(2, len(data), 2):
                table_style.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor('#f8f9fa')))
        
        table.setStyle(TableStyle(table_style))
        return table
    
    def _create_custom_summary(self, invoice, config, styles):
        """Twórz customowe podsumowanie z obsługą placeholderów"""
        # Etykiety z możliwością customizacji
        labels = config.get('labels', {})
        total_label = self._replace_placeholders(labels.get('total', 'SUMA DO ZAPŁATY'), invoice)
        
        # Template dla kwoty z obsługą placeholderów
        amount_template = config.get('templates', {}).get('total_amount', '{suma_brutto:.2f} PLN')
        amount_text = self._replace_placeholders(amount_template, invoice)
        
        data = [
            [total_label, amount_text]
        ]
        
        table = Table(data, colWidths=[6*mm*10, 4*mm*10])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), config.get('fonts', {}).get('size', {}).get('section', 14)),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOX', (0, 0), (-1, -1), 2, colors.HexColor(config.get('colors', {}).get('primary', '#007bff'))),
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(config.get('colors', {}).get('headerBg', '#f8f9fa')))
        ]))
        
        return table
    
    def _create_signatures_section(self, config, styles, invoice_data=None):
        """Twórz sekcję podpisów z obsługą placeholderów"""
        # Domyślne teksty z możliwością customizacji
        issuer_text = config.get('signatures', {}).get('issuer', 'Osoba wystawiająca')
        receiver_text = config.get('signatures', {}).get('receiver', 'Osoba odbierająca')
        
        # Obsługa placeholderów
        if invoice_data:
            issuer_text = self._replace_placeholders(issuer_text, invoice_data)
            receiver_text = self._replace_placeholders(receiver_text, invoice_data)
        
        data = [
            ["", ""],
            [issuer_text, receiver_text]
        ]
        
        table = Table(data, colWidths=[8*mm*10, 8*mm*10])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTSIZE', (0, 0), (-1, -1), config.get('fonts', {}).get('size', {}).get('small', 8)),
            ('LINEABOVE', (0, 0), (0, 0), 1, colors.black),
            ('LINEABOVE', (1, 0), (1, 0), 1, colors.black),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4)
        ]))
        
        return table

    def _is_vat_summary_table(self, columns):
        """Sprawdź czy tabela to tabela podsumowania VAT na podstawie kolumn"""
        if not columns:
            return False
        
        vat_fields = ['stawka_vat', 'wartosc_netto', 'podstawa_netto', 'kwota_vat', 'wartosc_brutto']
        column_fields = [col.get('dataField', '') for col in columns]
        
        # Sprawdź czy większość kolumn to pola VAT
        vat_column_count = sum(1 for field in column_fields if field in vat_fields)
        return vat_column_count >= 3  # Minimum 3 kolumny VAT
    
    def _render_vat_table_canvas(self, c, field, vat_data, table_config, margins, height, current_y_offset, settings=None):
        """Renderuj tabelę VAT w Canvas"""
        if settings is None:
            settings = {}
        columns = table_config.get('columns', [])
        
        # Pozycja tabeli
        x_start = field.get('x', margins.get('left', 50))
        table_original_y = field.get('y', margins.get('top', 50))
        table_y = height - table_original_y - current_y_offset
        
        # Szerokości kolumn - używaj indywidualnych szerokości z konfiguracji
        total_width = field.get('width', 400)
        col_widths = []
        total_configured_width = 0
        
        for column in columns:
            width = column.get('width', 100)  # Domyślna szerokość 100
            col_widths.append(width)
            total_configured_width += width
        
        # Jeśli brak kolumn, użyj domyślnej szerokości
        if not col_widths:
            col_widths = [100]
            total_configured_width = 100
        
        # Przeskaluj szerokości aby pasowały do dostępnej przestrzeni
        scale_factor = total_width / total_configured_width if total_configured_width > 0 else 1
        col_widths = [width * scale_factor for width in col_widths]
        
        print(f"🔍 DEBUG COLUMN WIDTHS VAT: total_width={total_width}, configured_widths={[col.get('width', 100) for col in columns]}, final_widths={col_widths}")
        
        # Ustawienia czcionki - użyj globalnych ustawień lub domyślnych
        global_font_family = settings.get('font_family', settings.get('globalFontFamily', 'SystemUTF8'))
        global_font_size = settings.get('font_size', settings.get('globalFontSize', 9))
        global_text_case = settings.get('text_case', settings.get('globalTextCase', 'normal'))
        
        registered_fonts = pdfmetrics.getRegisteredFontNames()
        font_name = global_font_family
        
        # Fallback do dostępnych czcionek
        if font_name not in registered_fonts:
            if "DejaVuSans" in registered_fonts:
                font_name = "DejaVuSans"
            elif "SystemUTF8" in registered_fonts:
                font_name = "SystemUTF8"
            else:
                font_name = "Helvetica"
        
        print(f"🔍 DEBUG VAT TABLE: Używana czcionka: {font_name}, dostępne czcionki: {registered_fonts}")
        print(f"🔍 DEBUG: Przed renderowaniem tabeli VAT, cumulative_y_offset = {current_y_offset}")
        
        # Użyj globalnego rozmiaru czcionki
        header_font_size = max(global_font_size - 1, 8)  # Nieco mniejszy dla nagłówka
        data_font_size = max(global_font_size - 2, 7)    # Jeszcze mniejszy dla danych
        
        row_height = 20
        current_y = table_y
        
        # Nagłówki tabeli VAT
        current_x = x_start
        for i, column in enumerate(columns):
            col_width = col_widths[i] if i < len(col_widths) else 100
            header_text = column.get('header', column.get('dataField', ''))
            
            # Zastosuj globalny case dla nagłówków VAT
            if global_text_case == 'uppercase':
                header_text = header_text.upper()
            elif global_text_case == 'lowercase':
                header_text = header_text.lower()
            elif global_text_case == 'capitalize':
                header_text = header_text.title()
            
            # Tło nagłówka
            c.setFillColor(HexColor('#f0f0f0'))
            c.rect(current_x, current_y - row_height, col_width, row_height, fill=1, stroke=1)
            
            # Tekst nagłówka
            c.setFillColor(colors.black)
            c.setFont(font_name, header_font_size)
            c.drawString(current_x + 5, current_y - row_height + 6, header_text)
            
            current_x += col_width
        
        current_y -= row_height
        
        # Dane VAT
        for vat_index, vat_row in enumerate(vat_data):
            current_x = x_start
            for i, column in enumerate(columns):
                col_width = col_widths[i] if i < len(col_widths) else 100
                data_field = column.get('dataField', '')
                
                # Specjalna obsługa dla kolumny LP (numer porządkowy)
                if data_field == 'lp':
                    value = str(vat_index + 1)
                # Pobierz wartość
                elif data_field == 'stawka_vat':
                    value = f"{vat_row.get('stawka_vat', 0)}%"
                elif data_field == 'wartosc_netto' or data_field == 'podstawa_netto':
                    value = f"{vat_row.get('podstawa_netto', 0):.2f} zł"
                elif data_field == 'kwota_vat':
                    value = f"{vat_row.get('kwota_vat', 0):.2f} zł"
                elif data_field == 'wartosc_brutto':
                    value = f"{vat_row.get('wartosc_brutto', 0):.2f} zł"
                else:
                    value = str(vat_row.get(data_field, ''))
                
                # Zastosuj globalny case dla pól tekstowych (nie dla kwot)
                if data_field not in ['stawka_vat', 'podstawa_netto', 'kwota_vat', 'wartosc_brutto', 'wartosc_netto', 'lp'] and global_text_case != 'normal':
                    if global_text_case == 'uppercase':
                        value = value.upper()
                    elif global_text_case == 'lowercase':
                        value = value.lower()
                    elif global_text_case == 'capitalize':
                        value = value.title()
                
                # Tło komórki
                c.setFillColor(colors.white)
                c.rect(current_x, current_y - row_height, col_width, row_height, fill=1, stroke=1)
                
                # Tekst komórki
                c.setFillColor(colors.black)
                c.setFont(font_name, data_font_size)
                c.drawString(current_x + 5, current_y - row_height + 6, value)
                
                current_x += col_width
            
            current_y -= row_height
        
        print(f"🔍 DEBUG: Renderowana tabela VAT na pozycji ({x_start}, {table_y}) z {len(vat_data)} wierszami")
        
        # Zwróć wysokość tabeli (od pozycji początkowej do końcowej)
        table_height = table_y - current_y + row_height  # +row_height bo current_y jest na dole ostatniego wiersza
        print(f"🔍 DEBUG: Tabela VAT ma wysokość {table_height} (od {table_y} do {current_y})")
        return table_height
    
    def _render_products_table_canvas(self, c, field, positions, invoice_data, table_config, margins, height, current_y_offset, settings=None):
        """Renderuj tabelę produktów w Canvas"""
        if settings is None:
            settings = {}
        columns = table_config.get('columns', [])
        
        # Pozycja tabeli
        x_start = field.get('x', margins.get('left', 50))
        table_original_y = field.get('y', margins.get('top', 50))
        table_y = height - table_original_y - current_y_offset
        
        # Szerokości kolumn - używaj indywidualnych szerokości z konfiguracji
        total_width = field.get('width', 400)
        col_widths = []
        total_configured_width = 0
        
        for column in columns:
            width = column.get('width', 100)  # Domyślna szerokość 100
            col_widths.append(width)
            total_configured_width += width
        
        # Jeśli brak kolumn, użyj domyślnej szerokości
        if not col_widths:
            col_widths = [100]
            total_configured_width = 100
        
        # Przeskaluj szerokości aby pasowały do dostępnej przestrzeni
        scale_factor = total_width / total_configured_width if total_configured_width > 0 else 1
        col_widths = [width * scale_factor for width in col_widths]
        
        print(f"🔍 DEBUG COLUMN WIDTHS PRODUCTS: total_width={total_width}, configured_widths={[col.get('width', 100) for col in columns]}, final_widths={col_widths}")
        
        # Ustawienia czcionki - użyj globalnych ustawień lub domyślnych
        global_font_family = settings.get('font_family', settings.get('globalFontFamily', 'SystemUTF8'))
        global_font_size = settings.get('font_size', settings.get('globalFontSize', 9))
        global_text_case = settings.get('text_case', settings.get('globalTextCase', 'normal'))
        
        registered_fonts = pdfmetrics.getRegisteredFontNames()
        font_name = global_font_family
        
        # Fallback do dostępnych czcionek
        if font_name not in registered_fonts:
            if "DejaVuSans" in registered_fonts:
                font_name = "DejaVuSans"
            elif "SystemUTF8" in registered_fonts:
                font_name = "SystemUTF8"
            else:
                font_name = "Helvetica"
        
        print(f"🔍 DEBUG PRODUCTS TABLE: Używana czcionka: {font_name}, dostępne czcionki: {registered_fonts}")
        print(f"🔍 DEBUG: Przed renderowaniem tabeli produktów, cumulative_y_offset = {current_y_offset}")
        
        # Użyj globalnego rozmiaru czcionki
        header_font_size = max(global_font_size - 1, 8)  # Nieco mniejszy dla nagłówka
        data_font_size = max(global_font_size - 2, 7)    # Jeszcze mniejszy dla danych
        
        row_height = 20
        current_y = table_y
        
        # Nagłówki tabeli produktów
        current_x = x_start
        for i, column in enumerate(columns):
            col_width = col_widths[i] if i < len(col_widths) else 100
            header_text = column.get('header', column.get('dataField', ''))
            
            # Zastosuj globalny case dla nagłówków produktów
            if global_text_case == 'uppercase':
                header_text = header_text.upper()
            elif global_text_case == 'lowercase':
                header_text = header_text.lower()
            elif global_text_case == 'capitalize':
                header_text = header_text.title()
            
            # Tło nagłówka
            c.setFillColor(HexColor('#f0f0f0'))
            c.rect(current_x, current_y - row_height, col_width, row_height, fill=1, stroke=1)
            
            # Tekst nagłówka
            c.setFillColor(colors.black)
            c.setFont(font_name, header_font_size)
            c.drawString(current_x + 5, current_y - row_height + 6, header_text)
            
            current_x += col_width
        
        current_y -= row_height
        
        # Dane produktów
        for pos_index, position in enumerate(positions):
            current_x = x_start
            for i, column in enumerate(columns):
                col_width = col_widths[i] if i < len(col_widths) else 100
                data_field = column.get('dataField', '')
                
                # Specjalna obsługa dla kolumny LP (numer porządkowy)
                if data_field == 'lp':
                    value = str(pos_index + 1)
                # Formatowanie wartości pieniężnych
                elif data_field in ['cena_jednostkowa_netto', 'cena_jednostkowa_brutto', 'wartosc_netto', 'wartosc_brutto']:
                    raw_value = position.get(data_field, 0)
                    value = f"{raw_value:.2f} zł"
                elif data_field == 'kwota_vat':
                    raw_value = position.get(data_field, 0)
                    value = f"{raw_value:.2f} zł"
                elif data_field == 'stawka_vat':
                    raw_value = position.get(data_field, 0)
                    value = f"{raw_value}%"
                elif data_field == 'ilosc':
                    raw_value = position.get(data_field, 0)
                    value = f"{raw_value:.0f}"  # Ilość bez miejsc po przecinku
                else:
                    # Pobierz wartość z pozycji
                    value = str(position.get(data_field, ''))
                
                # Zastosuj globalny case dla tekstu (tylko dla pól tekstowych)
                if data_field in ['nazwa_produktu', 'kod_produktu', 'jednostka'] and global_text_case != 'normal':
                    if global_text_case == 'uppercase':
                        value = value.upper()
                    elif global_text_case == 'lowercase':
                        value = value.lower()
                    elif global_text_case == 'capitalize':
                        value = value.title()
                
                # Tło komórki
                c.setFillColor(colors.white)
                c.rect(current_x, current_y - row_height, col_width, row_height, fill=1, stroke=1)
                
                # Tekst komórki
                c.setFillColor(colors.black)
                c.setFont(font_name, data_font_size)
                c.drawString(current_x + 5, current_y - row_height + 6, value)
                
                current_x += col_width
            
            current_y -= row_height
        
        print(f"🔍 DEBUG: Renderowana tabela produktów na pozycji ({x_start}, {table_y}) z {len(positions)} pozycjami")
        
        # Zwróć wysokość tabeli (od pozycji początkowej do końcowej)
        table_height = table_y - current_y + row_height  # +row_height bo current_y jest na dole ostatniego wiersza
        print(f"🔍 DEBUG: Tabela produktów ma wysokość {table_height} (od {table_y} do {current_y})")
        return table_height

# Inicjalizuj manager
custom_template_manager = CustomTemplateManager()

# ===============================
# ENDPOINTY API
# ===============================

@custom_templates_bp.route('/custom-templates', methods=['GET'])
def get_custom_templates():
    """Pobierz listę customowych szablonów"""
    try:
        templates = custom_template_manager.get_templates()
        return jsonify({
            'success': True,
            'data': templates,
            'message': 'Lista customowych szablonów'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Błąd pobierania customowych szablonów'
        }), 500

@custom_templates_bp.route('/custom-templates', methods=['POST'])
def create_custom_template():
    """Utwórz nowy customowy szablon"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Brak danych',
                'message': 'Nie przekazano danych szablonu'
            }), 400
        
        template_id = custom_template_manager.save_template(data)
        
        return jsonify({
            'success': True,
            'data': {'id': template_id},
            'message': 'Szablon został utworzony'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Błąd tworzenia szablonu'
        }), 500

@custom_templates_bp.route('/custom-templates/<int:template_id>', methods=['PUT'])
def update_custom_template(template_id):
    """Aktualizuj customowy szablon"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Brak danych',
                'message': 'Nie przekazano danych szablonu'
            }), 400
        
        custom_template_manager.update_template(template_id, data)
        
        return jsonify({
            'success': True,
            'message': 'Szablon został zaktualizowany'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Błąd aktualizacji szablonu'
        }), 500

@custom_templates_bp.route('/custom-templates/<int:template_id>', methods=['DELETE'])
def delete_custom_template(template_id):
    """Usuń customowy szablon"""
    try:
        custom_template_manager.delete_template(template_id)
        
        return jsonify({
            'success': True,
            'message': 'Szablon został usunięty'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Błąd usuwania szablonu'
        }), 500

@custom_templates_bp.route('/custom-templates/<int:template_id>/duplicate', methods=['POST'])
def duplicate_custom_template(template_id):
    """Duplikuj szablon"""
    try:
        data = request.get_json() or {}
        new_name = data.get('name')  # Optional new name
        
        new_template_id = custom_template_manager.duplicate_template(template_id, new_name)
        
        return jsonify({
            'success': True,
            'message': 'Szablon został zduplikowany',
            'new_template_id': new_template_id
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Błąd duplikowania szablonu'
        }), 500

def get_company_data_for_template():
    """Pobierz dane firmy dla szablonów"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(current_dir, '..', '..', 'kupony.db')
        
        print(f"🔍 TEMPLATE COMPANY: Ścieżka do bazy: {db_path}")
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM firma ORDER BY id DESC LIMIT 1")
        result = cursor.fetchone()
        
        if result:
            company_data = dict(result)
            print(f"🔍 TEMPLATE COMPANY: Pobrano dane: {company_data}")
            return company_data
        else:
            print(f"🔍 TEMPLATE COMPANY: Brak danych w tabeli firma")
            return {}
            
    except Exception as e:
        print(f"❌ TEMPLATE COMPANY: Błąd pobierania danych firmy: {e}")
        return {}
    finally:
        if 'conn' in locals():
            conn.close()

@custom_templates_bp.route('/custom-template-preview', methods=['POST'])
def generate_custom_template_preview():
    """Generuj podgląd customowego szablonu"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'Brak danych',
                'message': 'Nie przekazano danych żądania'
            }), 400
        
        template_config = data.get('template_config')
        invoice_data = data.get('invoice_data')
        
        if not template_config:
            return jsonify({
                'success': False,
                'error': 'Brak konfiguracji szablonu',
                'message': 'Nie przekazano konfiguracji szablonu'
            }), 400
        
        # Użyj danych z żądania lub pobierz rzeczywiste dane firmy
        print(f"🔍 TEMPLATE DEBUG: invoice_data = {invoice_data}")
        print(f"🔍 TEMPLATE DEBUG: bool(invoice_data) = {bool(invoice_data)}")
        print(f"🔍 TEMPLATE DEBUG: not invoice_data = {not invoice_data}")
        
        # Zapisz debug do pliku
        with open('/Users/robson/Downloads/pos-system-v3/backend/template_debug.log', 'a') as f:
            f.write(f"DEBUG: invoice_data = {invoice_data}\n")
            f.write(f"DEBUG: bool(invoice_data) = {bool(invoice_data)}\n")
        
        if not invoice_data:
            print("🔍 TEMPLATE DEBUG: Używam domyślnych danych")
            # Pobierz dane firmy z bazy danych
            company_data = get_company_data_for_template()
            
            # Zapisz company_data do debug
            with open('/Users/robson/Downloads/pos-system-v3/backend/template_debug.log', 'a') as f:
                f.write(f"DEBUG: company_data = {company_data}\n")
            
            def calculate_payment_fields(forma_platnosci, suma_brutto):
                """Oblicz pola płatności w zależności od formy płatności"""
                forma_platnosci = forma_platnosci.lower() if forma_platnosci else 'przelew'
                
                if forma_platnosci in ['gotówka', 'gotowka', 'cash']:
                    return {
                        'kwota_zaplacona': suma_brutto,
                        'kwota_do_zaplaty': 0.00,
                        'status_platnosci': 'ZAPŁACONE'
                    }
                else:  # przelew, karta, inne
                    return {
                        'kwota_zaplacona': 0.00,
                        'kwota_do_zaplaty': suma_brutto,
                        'status_platnosci': 'DO ZAPŁATY'
                    }
            
            suma_brutto_value = 1168.50
            payment_fields = calculate_payment_fields('gotówka', suma_brutto_value)
            
            invoice_data = {
                'numer_faktury': 'FV/001/2025',
                'data_wystawienia': '2025-01-15',
                'data_sprzedazy': '2025-01-15',
                'termin_platnosci': '2025-01-29',
                'forma_platnosci': 'gotówka',
                'sprzedawca_nazwa': company_data.get('nazwa', 'Przykładowa Firma Sp. z o.o.'),
                'sprzedawca_adres': f"{company_data.get('adres_ulica', 'ul. Handlowa 123')}, {company_data.get('adres_kod', '00-001')} {company_data.get('adres_miasto', 'Warszawa')}".strip(', '),
                'sprzedawca_kod_pocztowy': company_data.get('adres_kod', '00-001'),
                'sprzedawca_miasto': company_data.get('adres_miasto', 'Warszawa'),
                'sprzedawca_nip': company_data.get('nip', '1234567890'),
                'sprzedawca_regon': company_data.get('regon', ''),
                'sprzedawca_telefon': company_data.get('telefon', ''),
                'sprzedawca_email': company_data.get('email', ''),
                'sprzedawca_numer_konta': company_data.get('bank_numer_konta', ''),
                'nabywca_nazwa': 'Klient Sp. z o.o.',
                'nabywca_adres': 'ul. Biznesowa 456',
                'nabywca_kod_pocztowy': '00-002',
                'nabywca_miasto': 'Kraków',
                'nabywca_nip': '0987654321',
                'suma_brutto': 1168.50,
                'suma_netto': 1000.00,
                'suma_vat': 168.50,
                'kwota_slownie': 'tysiąc sto sześćdziesiąt osiem złotych 50/100',
                # VAT wg stawek - przykładowe dane
                'vat_23_netto': 800.00,
                'vat_23_vat': 184.00,
                'vat_23_brutto': 984.00,
                'vat_8_netto': 200.00,
                'vat_8_vat': 16.00,
                'vat_8_brutto': 216.00,
                'vat_5_netto': 0.00,
                'vat_5_vat': 0.00,
                'vat_5_brutto': 0.00,
                'vat_0_netto': 0.00,
                'vat_0_vat': 0.00,
                'vat_0_brutto': 0.00,
                'vat_zw_netto': 0.00,
                'vat_zw_vat': 0.00,
                'vat_zw_brutto': 0.00,
                # Płatności warunkowe
                **payment_fields
            }
            
            # Zapisz final invoice_data
            with open('/Users/robson/Downloads/pos-system-v3/backend/template_debug.log', 'a') as f:
                f.write(f"DEBUG: final invoice_data = {invoice_data}\n")
        
        # Konwertuj dane z frontendu na format backendu
        # Pobierz dane firmy jeśli nie ma danych sprzedawcy w invoice_data
        print(f"🔍 TEMPLATE DEBUG: Konwersja danych, invoice_data = {invoice_data}")
        company_data = get_company_data_for_template()
        print(f"🔍 TEMPLATE DEBUG: company_data dla konwersji = {company_data}")
        
        converted_invoice = {
            'numer_faktury': invoice_data.get('invoice_number', invoice_data.get('numer_faktury', 'FV/001/2025')),
            'data_wystawienia': invoice_data.get('invoice_date', invoice_data.get('data_wystawienia', '2025-01-15')),
            'data_sprzedazy': invoice_data.get('invoice_date', invoice_data.get('data_sprzedazy', '2025-01-15')),
            'termin_platnosci': invoice_data.get('due_date', invoice_data.get('termin_platnosci', '2025-01-29')),
            'forma_platnosci': invoice_data.get('forma_platnosci', 'gotówka'),
            'kwota_zaplacona': invoice_data.get('kwota_zaplacona', 0.0),
            'sprzedawca_nazwa': invoice_data.get('seller', {}).get('name', invoice_data.get('sprzedawca_nazwa', company_data.get('nazwa', 'Przykładowa Firma'))),
            'sprzedawca_adres': invoice_data.get('seller', {}).get('address', invoice_data.get('sprzedawca_adres', f"{company_data.get('adres_ulica', 'ul. Handlowa 123')}, {company_data.get('adres_kod', '00-001')} {company_data.get('adres_miasto', 'Warszawa')}".strip(', '))),
            'sprzedawca_kod_pocztowy': invoice_data.get('sprzedawca_kod_pocztowy', company_data.get('adres_kod', '00-001')),
            'sprzedawca_miasto': invoice_data.get('seller', {}).get('city', invoice_data.get('sprzedawca_miasto', company_data.get('adres_miasto', 'Warszawa'))),
            'sprzedawca_nip': invoice_data.get('seller', {}).get('nip', invoice_data.get('sprzedawca_nip', company_data.get('nip', '1234567890'))),
            'sprzedawca_regon': invoice_data.get('sprzedawca_regon', company_data.get('regon', '')),
            'sprzedawca_telefon': invoice_data.get('sprzedawca_telefon', company_data.get('telefon', '')),
            'sprzedawca_email': invoice_data.get('sprzedawca_email', company_data.get('email', '')),
            'sprzedawca_numer_konta': invoice_data.get('sprzedawca_numer_konta', company_data.get('bank_numer_konta', '')),
            'nabywca_nazwa': invoice_data.get('buyer', {}).get('name', invoice_data.get('nabywca_nazwa', 'Klient')),
            'nabywca_adres': invoice_data.get('buyer', {}).get('address', invoice_data.get('nabywca_adres', 'ul. Biznesowa 456')),
            'nabywca_kod_pocztowy': invoice_data.get('nabywca_kod_pocztowy', '00-002'),
            'nabywca_miasto': invoice_data.get('buyer', {}).get('city', invoice_data.get('nabywca_miasto', 'Kraków')),
            'nabywca_nip': invoice_data.get('buyer', {}).get('nip', invoice_data.get('nabywca_nip', '0987654321')),
            'suma_brutto': invoice_data.get('total_gross', invoice_data.get('suma_brutto', 1168.50)),
            'suma_netto': invoice_data.get('total_net', invoice_data.get('suma_netto', 1000.00)),
            'suma_vat': invoice_data.get('total_vat', invoice_data.get('suma_vat', 168.50)),
            'kwota_slownie': invoice_data.get('kwota_slownie', 'tysiąc sto sześćdziesiąt osiem złotych 50/100'),
            # VAT wg stawek
            'vat_23_netto': invoice_data.get('vat_23_netto', 800.00),
            'vat_23_vat': invoice_data.get('vat_23_vat', 184.00),
            'vat_23_brutto': invoice_data.get('vat_23_brutto', 984.00),
            'vat_8_netto': invoice_data.get('vat_8_netto', 200.00),
            'vat_8_vat': invoice_data.get('vat_8_vat', 16.00),
            'vat_8_brutto': invoice_data.get('vat_8_brutto', 216.00),
            'vat_5_netto': invoice_data.get('vat_5_netto', 0.00),
            'vat_5_vat': invoice_data.get('vat_5_vat', 0.00),
            'vat_5_brutto': invoice_data.get('vat_5_brutto', 0.00),
            'vat_0_netto': invoice_data.get('vat_0_netto', 0.00),
            'vat_0_vat': invoice_data.get('vat_0_vat', 0.00),
            'vat_0_brutto': invoice_data.get('vat_0_brutto', 0.00),
            'vat_zw_netto': invoice_data.get('vat_zw_netto', 0.00),
            'vat_zw_vat': invoice_data.get('vat_zw_vat', 0.00),
            'vat_zw_brutto': invoice_data.get('vat_zw_brutto', 0.00)
        }
        
        # Oblicz płatności warunkowe dla converted_invoice
        def calculate_payment_fields_local(forma_platnosci, suma_brutto, kwota_zaplacona_db=None):
            """Oblicz pola płatności w zależności od formy płatności"""
            forma_platnosci = forma_platnosci.lower() if forma_platnosci else 'przelew'
            
            # Użyj rzeczywistej kwoty zapłaconej z bazy, jeśli dostępna
            kwota_zaplacona = kwota_zaplacona_db if kwota_zaplacona_db is not None else 0.0
            
            if forma_platnosci in ['gotówka', 'gotowka', 'cash']:
                # Dla gotówki użyj rzeczywistej kwoty z bazy lub suma_brutto jako fallback
                if kwota_zaplacona_db is None:
                    kwota_zaplacona = suma_brutto
                return {
                    'kwota_zaplacona': kwota_zaplacona,
                    'kwota_do_zaplaty': max(0, suma_brutto - kwota_zaplacona),
                    'status_platnosci': 'ZAPŁACONE' if kwota_zaplacona >= suma_brutto else 'CZĘŚCIOWO ZAPŁACONE'
                }
            else:  # przelew, karta, inne
                return {
                    'kwota_zaplacona': kwota_zaplacona,
                    'kwota_do_zaplaty': max(0, suma_brutto - kwota_zaplacona),
                    'status_platnosci': 'ZAPŁACONE' if kwota_zaplacona >= suma_brutto else 'DO ZAPŁATY'
                }
        
        converted_suma_brutto = converted_invoice.get('suma_brutto', 0)
        converted_forma_platnosci = converted_invoice.get('forma_platnosci', 'przelew')
        converted_kwota_zaplacona = converted_invoice.get('kwota_zaplacona', None)
        converted_payment_fields = calculate_payment_fields_local(converted_forma_platnosci, converted_suma_brutto, converted_kwota_zaplacona)
        converted_invoice.update(converted_payment_fields)
        
        # Konwertuj pozycje faktury
        converted_positions = []
        items = invoice_data.get('items', [])
        for item in items:
            converted_positions.append({
                'nazwa_produktu': item.get('name', 'Produkt'),
                'ilosc': item.get('quantity', 1),
                'cena_jednostkowa_netto': item.get('unit_price', 100.00),
                'wartosc_brutto': item.get('total', 100.00)
            })
        
        # Jeśli brak pozycji, użyj domyślnych
        if not converted_positions:
            converted_positions = [
                {
                    'nazwa_produktu': 'Przykładowy produkt z długą nazwą',
                    'ilosc': 2,
                    'cena_jednostkowa_netto': 100.00,
                    'wartosc_brutto': 246.00
                },
                {
                    'nazwa_produktu': 'Usługa konsultingowa',
                    'ilosc': 5,
                    'cena_jednostkowa_netto': 150.00,
                    'wartosc_brutto': 922.50
                }
            ]
        
        # Sprawdź strukturę szablonu i użyj odpowiedniej metody
        if template_config.get('fields'):
            # Nowa struktura z polami
            pdf_content = custom_template_manager.generate_pdf_with_fields_template(
                converted_invoice, converted_positions, template_config
            )
        else:
            # Stara struktura
            pdf_content = custom_template_manager.generate_pdf_with_custom_template(
                converted_invoice, converted_positions, template_config
            )
        
        return Response(
            pdf_content,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': 'inline; filename=custom_template_preview.pdf'
            }
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Błąd generowania podglądu'
        }), 500

@custom_templates_bp.route('/invoice/<int:invoice_id>/pdf/custom', methods=['POST'])
def generate_invoice_pdf_custom_template(invoice_id):
    """Generuj PDF faktury z customowym szablonem"""
    try:
        config = request.get_json()
        
        if not config:
            return jsonify({
                'success': False,
                'error': 'Brak konfiguracji',
                'message': 'Nie przekazano konfiguracji szablonu'
            }), 400
        
        # Tu trzeba będzie zintegrować z istniejącym SalesInvoiceManager
        # aby pobrać prawdziwe dane faktury
        
        return jsonify({
            'success': False,
            'error': 'Not implemented yet',
            'message': 'Funkcja w trakcie implementacji'
        }), 501
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Błąd generowania PDF'
        }), 500

