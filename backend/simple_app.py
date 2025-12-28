from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/api/products")
def products():
    return {"data": {"data": {"products": [{"name": "Test Product", "price": 10.99}]}}}

@app.route("/api/test")  
def test():
    return {"status": "OK", "message": "Flask działa!"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
