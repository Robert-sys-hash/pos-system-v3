<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if (isset($_SERVER["REQUEST_METHOD"]) && $_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

http_response_code(404);
echo json_encode([
    "error" => "Endpoint not implemented yet", 
    "path" => $_SERVER["REQUEST_URI"],
    "message" => "This API endpoint is not available in the current version"
]);
?>
