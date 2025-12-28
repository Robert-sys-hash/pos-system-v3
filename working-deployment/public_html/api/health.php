<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$response = array(
    'status' => 'ok',
    'message' => 'Backend is running',
    'timestamp' => date('Y-m-d H:i:s'),
    'version' => '1.0.0'
);

echo json_encode($response);
?>
