<?php
// NIE ustawiamy nagłówków CORS tutaj - zrobimy to po otrzymaniu odpowiedzi z backendu

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// Pobierz ścieżkę z PATH_INFO (po api_proxy.php/)
$path = isset($_SERVER['PATH_INFO']) ? ltrim($_SERVER['PATH_INFO'], '/') : '';
if (empty($path) && isset($_GET['path'])) {
    $path = $_GET['path'];
}

$backend_url = 'http://localhost:8000/api/' . $path;

// Dodaj parametry query - sprawdzamy czy URL już ma parametry
$query_params = $_GET;
unset($query_params['path']);
if (!empty($query_params)) {
    // Sprawdź czy URL już ma parametry
    $separator = (strpos($backend_url, '?') !== false) ? '&' : '?';
    $backend_url .= $separator . http_build_query($query_params);
}

$ch = curl_init($backend_url);

curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);  // Pobieraj nagłówki odpowiedzi
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);

// Kopiuj nagłówki
$headers = [];
foreach (getallheaders() as $name => $value) {
    if (strtolower($name) !== 'host' && strtolower($name) !== 'content-length') {
        $headers[] = "$name: $value";
    }
}

if (!empty($headers)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
}

// Obsługa POST/PUT
if ($method === 'POST' || $method === 'PUT') {
    if (!empty($_FILES)) {
        // Multipart z plikami
        $postData = $_POST;
        foreach ($_FILES as $key => $file) {
            if ($file['error'] === UPLOAD_ERR_OK) {
                $postData[$key] = new CURLFile($file['tmp_name'], $file['type'], $file['name']);
            }
        }
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    } else {
        // JSON lub form-urlencoded
        $body = file_get_contents('php://input');
        if (!empty($body)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
    }
}

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if (curl_errno($ch)) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Credentials: true');
    http_response_code(500);
    echo json_encode(['error' => 'Błąd połączenia z backendem: ' . curl_error($ch)]);
} else {
    // Podziel odpowiedź na nagłówki i body
    $header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $headers_str = substr($response, 0, $header_size);
    $body = substr($response, $header_size);
    
    // Najpierw ustaw CORS
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    
    // Przekaż nagłówki z backendu
    $header_lines = explode("\r\n", $headers_str);
    foreach ($header_lines as $header) {
        if (empty($header) || strpos($header, 'HTTP/') === 0) {
            continue;
        }
        // Przekaż Set-Cookie i Content-Type (NIE Content-Length - PHP policzy automatycznie)
        if (stripos($header, 'Set-Cookie:') === 0 || 
            stripos($header, 'Content-Type:') === 0) {
            header($header, false);  // false = nie zastępuj istniejących
        }
    }
    
    http_response_code($http_code);
    echo $body;
}

curl_close($ch);
?>
