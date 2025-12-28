#!/usr/bin/env python3
print("Content-Type: application/json")
print("Access-Control-Allow-Origin: *")
print("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS")
print("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With")
print()

import json
import datetime

response = {
    'status': 'ok',
    'backend': 'Python Flask',
    'timestamp': datetime.datetime.now().isoformat(),
    'version': '1.0.0'
}

print(json.dumps(response))
