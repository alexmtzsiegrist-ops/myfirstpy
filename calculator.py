from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import ast
import math


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

SCIENTIFIC_FUNCTIONS = {
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log10,
    "ln": math.log,
    "abs": abs,
}


def evaluate_scientific(expression):
    expression = expression.replace("^", "**")
    tree = ast.parse(expression, mode="eval")

    def evaluate(node):
        if isinstance(node, ast.Expression):
            return evaluate(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
            return node.value
        if isinstance(node, ast.BinOp) and type(node.op) in (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow):
            left, right = evaluate(node.left), evaluate(node.right)
            if isinstance(node.op, ast.Add): return left + right
            if isinstance(node.op, ast.Sub): return left - right
            if isinstance(node.op, ast.Mult): return left * right
            if isinstance(node.op, ast.Div): return left / right
            return left ** right
        if isinstance(node, ast.UnaryOp) and type(node.op) in (ast.UAdd, ast.USub):
            value = evaluate(node.operand)
            return value if isinstance(node.op, ast.UAdd) else -value
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in SCIENTIFIC_FUNCTIONS and len(node.args) == 1:
            return SCIENTIFIC_FUNCTIONS[node.func.id](evaluate(node.args[0]))
        if isinstance(node, ast.Name) and node.id == "pi":
            return math.pi
        raise ValueError("Unsupported expression")

    result = evaluate(tree)
    if not math.isfinite(result):
        raise ValueError("Result is not a finite number")
    return result


class CalculatorHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path not in ("/api/calculate", "/api/scientific"):
            self.send_error(404, "Not found")
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(content_length))
            if self.path == "/api/scientific":
                result = evaluate_scientific(payload["expression"])
            else:
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