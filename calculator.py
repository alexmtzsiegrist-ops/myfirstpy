from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path


def add(x, y):
    return x + y

def subtract(x, y):
    return x - y

def multiply(x, y):
    return x * y

def divide(x, y):
    if y == 0:
        raise ValueError("Cannot divide by zero")
    return x / y


OPERATIONS = {
    "+": add,
    "-": subtract,
    "*": multiply,
    "/": divide,
}


class CalculatorHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/api/calculate":
            self.send_error(404, "Not found")
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(content_length))
            left = float(payload["left"])
            right = float(payload["right"])
            operation = payload["operation"]
            result = OPERATIONS[operation](left, right)
            response = {"result": result}
            self._send_json(response)
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            self._send_json({"error": "Enter valid numbers and choose an operation."}, 400)

    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    root = Path(__file__).parent
    server = ThreadingHTTPServer(("127.0.0.1", 8000), CalculatorHandler)
    print("Calculator running at http://127.0.0.1:8000")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nCalculator stopped.")
    finally:
        server.server_close()