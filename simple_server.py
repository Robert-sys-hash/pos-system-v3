"""
Prosty test serwer do sprawdzenia czy Railway może serwować pliki statyczne
"""
from flask import Flask, send_from_directory, send_file
import os

app = Flask(__name__)

@app.route('/')
def root():
    static_path = os.path.join(os.path.dirname(__file__), 'backend', 'static', 'index.html')
    if os.path.exists(static_path):
        return send_file(static_path)
    return f"File not found: {static_path}"

@app.route('/<path:path>')  
def static_files(path):
    static_dir = os.path.join(os.path.dirname(__file__), 'backend', 'static')
    return send_from_directory(static_dir, path)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
