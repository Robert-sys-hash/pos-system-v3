<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if (isset($_SERVER["REQUEST_METHOD"]) && $_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

echo json_encode([
    ["id" => 1, "name" => "Napoje"],
    ["id" => 2, "name" => "Jedzenie"],
    ["id" => 3, "name" => "Przekąski"],
    ["id" => 4, "name" => "Alkohol"],
    ["id" => 5, "name" => "Inne"]
]);
?>
