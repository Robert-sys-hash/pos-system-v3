"""
Moduł do zarządzania szablonami faktur PDF
Pozwala na łatwe dodawanie i konfigurację różnych układów faktur
"""

from abc import ABC, abstractmethod
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
from io import BytesIO


class InvoiceTemplate(ABC):
    """Abstrakcyjna klasa bazowa dla szablonów faktur"""
    
    def __init__(self):
        self.font_name = 'Helvetica'
        self.page_size = A4
        self.margins = {
            'top': 2*cm,
            'bottom': 2*cm,
            'left': 2*cm,
            'right': 2*cm
        }
        self.colors = {
            'header_bg': colors.lightgrey,
            'border': colors.black,
            'text': colors.black,
            'accent': colors.darkblue
        }
        self.font_sizes = {
            'title': 20,
            'section': 14,
            'normal': 10,
            'small': 8,
            'table': 9
        }
        
    def load_fonts(self):
        """Ładuje niestandardowe fonty"""
        try:
            font_paths = [
                '/System/Library/Fonts/Helvetica.ttc',
                '/System/Library/Fonts/Arial.ttf',
                '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
            ]
            
            for font_path in font_paths:
                if os.path.exists(font_path):
                    try:
                        pdfmetrics.registerFont(TTFont('PolishFont', font_path))
                        self.font_name = 'PolishFont'
                        print(f"✅ Załadowano fontę z: {font_path}")
                        break
                    except Exception as e:
                        print(f"⚠️ Nie można załadować fonty z {font_path}: {e}")
                        continue
        except Exception as e:
            print(f"⚠️ Błąd ładowania fontów: {e}")
    
    def create_styles(self):
        """Tworzy style dla dokumentu"""
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=self.font_sizes['title'],
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=self.colors['accent'],
            fontName=self.font_name + '-Bold' if self.font_name == 'Helvetica' else self.font_name
        )
        
        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=self.font_sizes['section'],
            spaceBefore=20,
            spaceAfter=10,
            textColor=self.colors['accent'],
            fontName=self.font_name + '-Bold' if self.font_name == 'Helvetica' else self.font_name
        )
        
        normal_style = ParagraphStyle(
            'CustomNormal',
            parent=styles['Normal'],
            fontName=self.font_name,
            fontSize=self.font_sizes['normal']
        )
        
        return {
            'title': title_style,
            'section': section_style,
            'normal': normal_style
        }
    
    @abstractmethod
    def generate_pdf(self, invoice_data, positions, vat_summary=None):
        """Generuje PDF faktury - musi być zaimplementowane przez klasy potomne"""
        pass


class ClassicTemplate(InvoiceTemplate):
    """Klasyczny szablon faktury"""
    
    def __init__(self):
        super().__init__()
        self.template_name = "Klasyczny"
        
    def generate_pdf(self, invoice_data, positions, vat_summary=None):
        """Generuje PDF w klasycznym stylu"""
        self.load_fonts()
        styles = self.create_styles()
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=self.page_size,
            rightMargin=self.margins['right'],
            leftMargin=self.margins['left'],
            topMargin=self.margins['top'],
            bottomMargin=self.margins['bottom']
        )
        
        elements = []
        
        # Tytuł
        title = Paragraph("FAKTURA SPRZEDAŻY", styles['title'])
        elements.append(title)
        elements.append(Spacer(1, 20))
        
        # Informacje o fakturze
        invoice_info = self._create_invoice_info_table(invoice_data, styles)
        elements.append(invoice_info)
        elements.append(Spacer(1, 20))
        
        # Dane sprzedawcy i nabywcy
        seller_buyer = self._create_seller_buyer_table(invoice_data, styles)
        elements.append(seller_buyer)
        elements.append(Spacer(1, 30))
        
        # Tabela pozycji
        if positions:
            positions_table = self._create_positions_table(positions, styles)
            elements.append(positions_table)
            elements.append(Spacer(1, 20))
        
        # Podsumowanie
        summary = self._create_summary_table(invoice_data, styles)
        elements.append(summary)
        
        # Stopka
        footer = self._create_footer_table(invoice_data, styles)
        elements.append(Spacer(1, 40))
        elements.append(footer)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    
    def _create_invoice_info_table(self, invoice, styles):
        """Tworzy tabelę z informacjami o fakturze"""
        data = [
            ["Numer faktury:", invoice.get('numer_faktury', '')],
            ["Data wystawienia:", invoice.get('data_wystawienia', '')],
            ["Data sprzedaży:", invoice.get('data_sprzedazy', '')],
            ["Termin płatności:", invoice.get('termin_platnosci', '')],
            ["Forma płatności:", invoice.get('forma_platnosci', 'gotówka')]
        ]
        
        table = Table(data, colWidths=[4*cm, 6*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), self.font_name + '-Bold' if self.font_name == 'Helvetica' else self.font_name),
            ('FONTNAME', (1, 0), (1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, -1), self.font_sizes['normal']),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, self.colors['border'])
        ]))
        
        return table
    
    def _create_seller_buyer_table(self, invoice, styles):
        """Tworzy tabelę sprzedawca/nabywca"""
        data = [
            ["Sprzedawca", "Nabywca"],
            [
                f"{invoice.get('sprzedawca_nazwa', '')}\n" +
                f"{invoice.get('sprzedawca_adres', '')}\n" +
                f"{invoice.get('sprzedawca_kod_pocztowy', '')} {invoice.get('sprzedawca_miasto', '')}\n" +
                f"NIP: {invoice.get('sprzedawca_nip', '')}",
                
                f"{invoice.get('nabywca_nazwa', '')}\n" +
                f"{invoice.get('nabywca_adres', '')}\n" +
                f"{invoice.get('nabywca_kod_pocztowy', '')} {invoice.get('nabywca_miasto', '')}\n" +
                f"NIP: {invoice.get('nabywca_nip', '')}"
            ]
        ]
        
        table = Table(data, colWidths=[8*cm, 8*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (-1, 0), self.font_name + '-Bold' if self.font_name == 'Helvetica' else self.font_name),
            ('FONTNAME', (0, 1), (-1, 1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, -1), self.font_sizes['normal']),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (-1, -1), 1, self.colors['border']),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, self.colors['border']),
            ('BACKGROUND', (0, 0), (-1, 0), self.colors['header_bg'])
        ]))
        
        return table
    
    def _create_positions_table(self, positions, styles):
        """Tworzy tabelę pozycji faktury"""
        data = [
            ["Lp.", "Nazwa", "Ilość", "Jedn.", "Cena netto", "Stawka", "Wartość netto", "Wartość VAT", "Wartość brutto"]
        ]
        
        for i, pos in enumerate(positions, 1):
            data.append([
                str(i),
                pos.get('nazwa_produktu', ''),
                f"{pos.get('ilosc', 0):.0f}",
                pos.get('jednostka', 'szt'),
                f"{pos.get('cena_jednostkowa_netto', 0):.2f}",
                f"{pos.get('stawka_vat', 0)}%",
                f"{pos.get('wartosc_netto', 0):.2f}",
                f"{pos.get('wartosc_vat', 0):.2f}",
                f"{pos.get('wartosc_brutto', 0):.2f}"
            ])
        
        table = Table(data, colWidths=[0.5*cm, 7.5*cm, 0.7*cm, 0.7*cm, 1.8*cm, 0.7*cm, 1.8*cm, 1.8*cm, 2*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), self.font_name + '-Bold' if self.font_name == 'Helvetica' else self.font_name),
            ('FONTNAME', (0, 1), (-1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, -1), self.font_sizes['small']),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOX', (0, 0), (-1, -1), 1, self.colors['border']),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, self.colors['border']),
            ('BACKGROUND', (0, 0), (-1, 0), self.colors['header_bg']),
            ('WORDWRAP', (1, 0), (1, -1), True)
        ]))
        
        return table
    
    def _create_summary_table(self, invoice, styles):
        """Tworzy tabelę podsumowania"""
        data = [
            ["Razem", f"{invoice.get('suma_brutto', 0):.2f} PLN"],
            ["Do zapłaty", f"{invoice.get('suma_brutto', 0):.2f} PLN"]
        ]
        
        table = Table(data, colWidths=[4*cm, 4*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, -1), self.font_sizes['normal']),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOX', (0, 0), (-1, -1), 1, self.colors['border']),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, self.colors['border'])
        ]))
        
        return table
    
    def _create_footer_table(self, invoice, styles):
        """Tworzy stopkę z podpisami"""
        data = [
            ["", ""],
            ["Janusz Nowak", ""],
            ["osoba upoważniona do wystawiania faktury", "osoba upoważniona do odbioru faktury"]
        ]
        
        table = Table(data, colWidths=[8*cm, 8*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
            ('FONTNAME', (0, 0), (-1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, -1), self.font_sizes['table']),
            ('LINEABOVE', (0, 0), (0, 0), 1, self.colors['border']),
            ('LINEABOVE', (1, 0), (1, 0), 1, self.colors['border']),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4)
        ]))
        
        return table


class ModernTemplate(InvoiceTemplate):
    """Nowoczesny szablon faktury z logo"""
    
    def __init__(self):
        super().__init__()
        self.template_name = "Nowoczesny"
        self.colors['accent'] = colors.darkgreen
        self.colors['header_bg'] = colors.lightblue
        
    def generate_pdf(self, invoice_data, positions, vat_summary=None):
        """Generuje PDF w nowoczesnym stylu"""
        self.load_fonts()
        styles = self.create_styles()
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=self.page_size,
            rightMargin=self.margins['right'],
            leftMargin=self.margins['left'],
            topMargin=self.margins['top'],
            bottomMargin=self.margins['bottom']
        )
        
        elements = []
        
        # Nagłówek z logo i informacjami
        header = self._create_header_table(invoice_data, styles)
        elements.append(header)
        elements.append(Spacer(1, 20))
        
        # Dane kontrahentów
        parties = self._create_parties_section(invoice_data, styles)
        elements.append(parties)
        elements.append(Spacer(1, 30))
        
        # Pozycje faktury
        if positions:
            positions_table = self._create_modern_positions_table(positions, styles)
            elements.append(positions_table)
            elements.append(Spacer(1, 20))
        
        # Podsumowanie
        summary = self._create_modern_summary(invoice_data, styles)
        elements.append(summary)
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    
    def _create_header_table(self, invoice, styles):
        """Tworzy nagłówek z logo i informacjami o fakturze"""
        data = [
            [
                "🏢 Twoje Logo",
                f"Faktura nr FV {invoice.get('numer_faktury', '')}\n" +
                f"Data wystawienia: {invoice.get('data_wystawienia', '')}\n" +
                f"Data sprzedaży: {invoice.get('data_sprzedazy', '')}\n" +
                f"Termin płatności: {invoice.get('termin_platnosci', '')}\n" +
                f"Metoda płatności: {invoice.get('forma_platnosci', 'gotówka')}"
            ]
        ]
        
        table = Table(data, colWidths=[8*cm, 8*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (0, 0), self.font_name + '-Bold' if self.font_name == 'Helvetica' else self.font_name),
            ('FONTNAME', (1, 0), (1, 0), self.font_name),
            ('FONTSIZE', (0, 0), (0, 0), 14),
            ('FONTSIZE', (1, 0), (1, 0), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 20)
        ]))
        
        return table
    
    def _create_parties_section(self, invoice, styles):
        """Tworzy sekcję z danymi stron"""
        data = [
            ["Sprzedawca", "Nabywca"],
            [
                f"{invoice.get('sprzedawca_nazwa', '')}\n" +
                f"{invoice.get('sprzedawca_adres', '')}\n" +
                f"{invoice.get('sprzedawca_kod_pocztowy', '')} {invoice.get('sprzedawca_miasto', '')}\n" +
                f"NIP: {invoice.get('sprzedawca_nip', '')}",
                
                f"{invoice.get('nabywca_nazwa', '')}\n" +
                f"{invoice.get('nabywca_adres', '')}\n" +
                f"{invoice.get('nabywca_kod_pocztowy', '')} {invoice.get('nabywca_miasto', '')}\n" +
                f"NIP: {invoice.get('nabywca_nip', '')}"
            ]
        ]
        
        table = Table(data, colWidths=[8*cm, 8*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTNAME', (0, 0), (-1, 0), self.font_name + '-Bold' if self.font_name == 'Helvetica' else self.font_name),
            ('FONTNAME', (0, 1), (-1, 1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOX', (0, 0), (-1, -1), 2, self.colors['accent']),
            ('INNERGRID', (0, 0), (-1, -1), 1, self.colors['border']),
            ('BACKGROUND', (0, 0), (-1, 0), self.colors['header_bg'])
        ]))
        
        return table
    
    def _create_modern_positions_table(self, positions, styles):
        """Tworzy nowoczesną tabelę pozycji"""
        data = [
            ["#", "Produkt/Usługa", "Ilość", "Cena", "VAT", "Wartość"]
        ]
        
        for i, pos in enumerate(positions, 1):
            data.append([
                str(i),
                pos.get('nazwa_produktu', ''),
                f"{pos.get('ilosc', 0):.0f} {pos.get('jednostka', 'szt')}",
                f"{pos.get('cena_jednostkowa_netto', 0):.2f} PLN",
                f"{pos.get('stawka_vat', 0)}%",
                f"{pos.get('wartosc_brutto', 0):.2f} PLN"
            ])
        
        table = Table(data, colWidths=[1*cm, 8*cm, 2*cm, 2.5*cm, 1.5*cm, 2*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (1, 1), (1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('FONTNAME', (0, 0), (-1, 0), self.font_name + '-Bold' if self.font_name == 'Helvetica' else self.font_name),
            ('FONTNAME', (0, 1), (-1, -1), self.font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOX', (0, 0), (-1, -1), 2, self.colors['accent']),
            ('INNERGRID', (0, 0), (-1, -1), 1, self.colors['border']),
            ('BACKGROUND', (0, 0), (-1, 0), self.colors['header_bg']),
            ('WORDWRAP', (1, 0), (1, -1), True)
        ]))
        
        return table
    
    def _create_modern_summary(self, invoice, styles):
        """Tworzy nowoczesne podsumowanie"""
        data = [
            ["SUMA DO ZAPŁATY", f"{invoice.get('suma_brutto', 0):.2f} PLN"]
        ]
        
        table = Table(data, colWidths=[6*cm, 4*cm])
        table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, -1), self.font_name + '-Bold' if self.font_name == 'Helvetica' else self.font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 14),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOX', (0, 0), (-1, -1), 2, self.colors['accent']),
            ('BACKGROUND', (0, 0), (-1, -1), self.colors['header_bg'])
        ]))
        
        return table


class TemplateManager:
    """Zarządca szablonów faktur"""
    
    def __init__(self):
        self.templates = {
            'classic': ClassicTemplate(),
            'modern': ModernTemplate()
        }
        self.default_template = 'classic'
    
    def get_template(self, template_name=None):
        """Pobiera szablon o podanej nazwie"""
        if template_name is None:
            template_name = self.default_template
            
        return self.templates.get(template_name, self.templates[self.default_template])
    
    def list_templates(self):
        """Lista dostępnych szablonów"""
        return {name: template.template_name for name, template in self.templates.items()}
    
    def register_template(self, name, template):
        """Rejestruje nowy szablon"""
        if isinstance(template, InvoiceTemplate):
            self.templates[name] = template
            return True
        return False
    
    def generate_invoice_pdf(self, invoice_data, positions, template_name=None, vat_summary=None):
        """Generuje PDF faktury używając wybranego szablonu"""
        template = self.get_template(template_name)
        return template.generate_pdf(invoice_data, positions, vat_summary)
