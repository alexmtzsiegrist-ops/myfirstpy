# Figment Calculator

Figment is a beautifully designed, Python-powered pocket calculator for everyday arithmetic. It combines a clean editorial interface with a lightweight Python backend and works smoothly on desktop and mobile screens.

## Features

- Addition, subtraction, multiplication, and division
- Percentage and positive/negative controls
- Keyboard support for fast input
- Recent calculation history
- Clear division-by-zero error handling
- Responsive design for desktop and mobile
- Works with the Python API or directly as a local HTML page

## Getting Started

Make sure Python 3 is installed, then start the local server:

```bash
python3 calculator.py
```

Open the calculator in your browser:

```text
http://127.0.0.1:8000
```

## Direct Browser Use

You can also open `index.html` directly in a browser. In this mode, the calculator uses its local JavaScript fallback and does not require the Python server.

## Project Files

- `calculator.py` - Python arithmetic functions and HTTP API
- `index.html` - Calculator structure and accessible controls
- `styles.css` - Responsive visual design
- `app.js` - Calculator interactions, keyboard support, and history

## Technology

This project is built with Python, HTML, CSS, and vanilla JavaScript. It uses Python's built-in HTTP server, so no external packages are required.