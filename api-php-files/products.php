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
    ["id" => 1, "name" => "Coca Cola", "price" => 3.50, "stock" => 100, "category_id" => 1],
    ["id" => 2, "name" => "Burger", "price" => 15.00, "stock" => 50, "category_id" => 2],
    ["id" => 3, "name" => "Chipsy", "price" => 4.50, "stock" => 200, "category_id" => 3],
    ["id" => 4, "name" => "Piwo", "price" => 6.00, "stock" => 80, "category_id" => 4],
    ["id" => 5, "name" => "Słuchawki", "price" => 89.99, "stock" => 25, "category_id" => 5]
]);
?>
