<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Prosty router API
$request_uri = $_SERVER['REQUEST_URI'];
$path = parse_url($request_uri, PHP_URL_PATH);
$path = str_replace('/api/', '', $path);

switch ($path) {
    case 'health':
        echo json_encode([
            'status' => 'ok',
            'message' => 'Backend is running',
            'timestamp' => date('Y-m-d H:i:s'),
            'version' => '1.0.0'
        ]);
        break;
        
    case 'products':
        echo json_encode([
            ['id' => 1, 'name' => 'Produkt 1', 'price' => 10.50],
            ['id' => 2, 'name' => 'Produkt 2', 'price' => 25.00],
            ['id' => 3, 'name' => 'Produkt 3', 'price' => 5.75]
        ]);
        break;
        
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
}
?>
