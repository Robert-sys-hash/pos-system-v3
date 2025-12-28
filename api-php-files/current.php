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
    "shift_id" => 1,
    "start_time" => date("Y-m-d H:i:s", strtotime("-8 hours")),
    "cashier" => "Jan Kowalski",
    "location_id" => 1,
    "initial_cash" => 500.00
]);
?>
