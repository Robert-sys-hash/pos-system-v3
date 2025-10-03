#!/usr/bin/env python3
"""
Prosty serwer testowy dla produktów - uruchamianie na porcie 5002
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app, origins=['http://localhost:3002'])

# Mock data produktów dla testów
MOCK_PRODUCTS = [
    {
        "id": 1,
        "nazwa": "Mleko UHT 3,2% 1L", 
        "name": "Mleko UHT 3,2% 1L",
        "kod_produktu": "5901234567890",
        "barcode": "5901234567890",
        "ean": "5901234567890", 
        "kategoria": "Nabiał",
        "category": "Nabiał",
        "cena": 3.49,
        "cena_sprzedazy": 3.49,
        "price": 3.49,
        "cena_zakupu": 2.80,
        "stawka_vat": 23,
        "tax_rate": 23,
        "stock_quantity": 64,
        "opis": "Mleko świeże pasteryzowane UHT",
        "description": "Mleko świeże pasteryzowane UHT"
    },
    {
        "id": 2,
        "nazwa": "Chleb żytni razowy 500g",
        "name": "Chleb żytni razowy 500g", 
        "kod_produktu": "5901234567891",
        "barcode": "5901234567891",
        "ean": "5901234567891",
        "kategoria": "Pieczywo",
        "category": "Pieczywo",
        "cena": 4.20,
        "cena_sprzedazy": 4.20,
        "price": 4.20,
        "cena_zakupu": 3.50,
        "stawka_vat": 23,
        "tax_rate": 23,
        "stock_quantity": 25,
        "opis": "Chleb żytni razowy z ziarnami",
        "description": "Chleb żytni razowy z ziarnami"
    },
    {
        "id": 3,
        "nazwa": "Jabłka Gala",
        "name": "Jabłka Gala",
        "kod_produktu": "2001234567892", 
        "barcode": "2001234567892",
        "ean": "2001234567892",
        "kategoria": "Owoce",
        "category": "Owoce",
        "cena": 5.99,
        "cena_sprzedazy": 5.99,
        "price": 5.99,
        "cena_zakupu": 4.20,
        "stawka_vat": 8,
        "tax_rate": 8,
        "stock_quantity": 15,
        "opis": "Jabłka odmiany Gala klasa I",
        "description": "Jabłka odmiany Gala klasa I"
    }
]

@app.route('/api/products', methods=['GET'])
def get_products():
    return jsonify({
        "success": True,
        "status_code": 200,
        "message": f"Znaleziono {len(MOCK_PRODUCTS)} produktów",
        "data": {
            "products": MOCK_PRODUCTS,
            "total": len(MOCK_PRODUCTS),
            "limit": 100
        }
    })

@app.route('/api/products', methods=['POST']) 
def add_product():
    data = request.get_json()
    new_id = max([p["id"] for p in MOCK_PRODUCTS], default=0) + 1
    
    new_product = {
        "id": new_id,
        "nazwa": data.get("nazwa", ""),
        "name": data.get("nazwa", ""),
        "kod_produktu": data.get("kod_produktu", ""),
        "barcode": data.get("kod_produktu", ""),
        "ean": data.get("ean", ""),
        "kategoria": data.get("kategoria", ""),
        "category": data.get("kategoria", ""),
        "cena": float(data.get("cena", 0)),
        "cena_sprzedazy": float(data.get("cena", 0)),
        "price": float(data.get("cena", 0)),
        "cena_zakupu": float(data.get("cena_zakupu", 0)),
        "stawka_vat": int(data.get("stawka_vat", 23)),
        "tax_rate": int(data.get("stawka_vat", 23)),
        "stock_quantity": 0,
        "opis": data.get("opis", ""),
        "description": data.get("opis", "")
    }
    
    MOCK_PRODUCTS.append(new_product)
    
    return jsonify({
        "success": True,
        "status_code": 201,
        "message": "Produkt został dodany pomyślnie",
        "data": new_product
    })

@app.route('/api/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    data = request.get_json()
    
    for i, product in enumerate(MOCK_PRODUCTS):
        if product["id"] == product_id:
            # Aktualizuj produkt
            MOCK_PRODUCTS[i].update({
                "nazwa": data.get("nazwa", product["nazwa"]),
                "name": data.get("nazwa", product["nazwa"]),
                "kod_produktu": data.get("kod_produktu", product["kod_produktu"]),
                "barcode": data.get("kod_produktu", product["kod_produktu"]),
                "ean": data.get("ean", product["ean"]),
                "kategoria": data.get("kategoria", product["kategoria"]),
                "category": data.get("kategoria", product["kategoria"]),
                "cena": float(data.get("cena", product["cena"])),
                "cena_sprzedazy": float(data.get("cena", product["cena"])),
                "price": float(data.get("cena", product["cena"])),
                "cena_zakupu": float(data.get("cena_zakupu", product.get("cena_zakupu", 0))),
                "stawka_vat": int(data.get("stawka_vat", product["stawka_vat"])),
                "tax_rate": int(data.get("stawka_vat", product["stawka_vat"])),
                "opis": data.get("opis", product.get("opis", "")),
                "description": data.get("opis", product.get("opis", ""))
            })
            
            return jsonify({
                "success": True,
                "status_code": 200,
                "message": "Produkt został zaktualizowany pomyślnie",
                "data": MOCK_PRODUCTS[i]
            })
    
    return jsonify({
        "success": False,
        "status_code": 404,
        "message": "Produkt nie został znaleziony"
    }), 404

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    global MOCK_PRODUCTS
    
    for i, product in enumerate(MOCK_PRODUCTS):
        if product["id"] == product_id:
            deleted_product = MOCK_PRODUCTS.pop(i)
            return jsonify({
                "success": True,
                "status_code": 200,
                "message": "Produkt został usunięty pomyślnie",
                "data": deleted_product
            })
    
    return jsonify({
        "success": False,
        "status_code": 404,
        "message": "Produkt nie został znaleziony"
    }), 404

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "OK",
        "message": "Mock Products API is running",
        "port": 5002
    })

if __name__ == '__main__':
    print("🚀 Uruchamianie Mock Products API na porcie 5002...")
    print("📡 CORS skonfigurowany dla React frontend na localhost:3002")
    print("🔧 Backend testowy z mock danymi produktów")
    app.run(debug=True, host='0.0.0.0', port=5002)
