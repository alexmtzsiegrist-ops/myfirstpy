const display = document.querySelector("#display");
const expression = document.querySelector("#expression");
const modeLabel = document.querySelector("#mode-label");
const historyElement = document.querySelector("#history");
const localOperations = { "+": (left, right) => left + right, "-": (left, right) => left - right, "*": (left, right) => left * right, "/": (left, right) => { if (right === 0) throw new Error("Cannot divide by zero"); return left / right; } };
let current = "0";
let stored = null;
let operation = null;
let waitingForOperand = false;
let history = [];
const scientificInput = document.querySelector("#scientific-input");
const scientificResult = document.querySelector("#scientific-result");

function updateDisplay() { display.textContent = current; }
function formatNumber(value) { return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(10))); }
function setMode(label) { modeLabel.textContent = label; }

function inputDigit(digit) {
  if (waitingForOperand || current === "Error") { current = digit; waitingForOperand = false; }
  else { current = current === "0" ? digit : current + digit; }
  updateDisplay(); setMode("INPUT");
}

function inputDecimal() {
  if (waitingForOperand || current === "Error") { current = "0."; waitingForOperand = false; }
  else if (!current.includes(".")) current += ".";
  updateDisplay();
}

async function chooseOperation(nextOperation) {
  if (stored === null) stored = Number(current);
  else if (!waitingForOperand) {
    await calculate(false);
    stored = Number(current);
  }
  operation = nextOperation; waitingForOperand = true;
  expression.textContent = `${formatNumber(stored)} ${nextOperation}`; setMode("OPERATOR");
}

async function calculate(addToHistory = true) {
  if (operation === null || stored === null) return;
  const right = Number(current); const shownExpression = `${formatNumber(stored)} ${operation} ${formatNumber(right)}`;
  try {
    if (location.protocol === "file:") throw new TypeError("Use local calculation");
    const response = await fetch("/api/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ left: stored, right, operation }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    current = formatNumber(data.result); stored = null; operation = null; waitingForOperand = true;
    expression.textContent = shownExpression; setMode("DONE"); updateDisplay();
    if (addToHistory) addHistory(shownExpression, current);
  } catch (error) {
    if (error instanceof TypeError) {
      try { current = formatNumber(localOperations[operation](stored, right)); }
      catch (localError) { current = "Error"; expression.textContent = localError.message; }
      stored = null; operation = null; waitingForOperand = true; setMode("LOCAL"); updateDisplay();
      if (current !== "Error" && addToHistory) { expression.textContent = shownExpression; addHistory(shownExpression, current); }
    } else { current = "Error"; expression.textContent = error.message; stored = null; operation = null; setMode("CHECK INPUT"); updateDisplay(); }
  }
}

function addHistory(label, result) { history.unshift({ label, result }); history = history.slice(0, 4); renderHistory(); }
function renderHistory() { historyElement.innerHTML = history.length ? history.map(item => `<div class="history-item"><p>${item.label}</p><strong>${item.result}</strong></div>`).join("") : '<p class="empty-history">Your recent calculations<br>will appear here.</p>'; }
function clearAll() { current = "0"; stored = null; operation = null; waitingForOperand = false; expression.textContent = "Ready when you are"; setMode("READY"); updateDisplay(); }

function evaluateScientific() {
  const source = scientificInput.value.trim();
  if (!source) return;
  const allowedNames = ["pi", "sqrt", "sin", "cos", "tan", "log", "ln", "abs"];
  const names = source.match(/[A-Za-z]+/g) || [];
  if (!/^[0-9+\-*/().,\sA-Za-z]+$/.test(source) || names.some(name => !allowedNames.includes(name))) { scientificResult.textContent = "Error"; return; }
  fetchScientific(source);
}

function evaluateLocalScientific(source) {
  const tokens = source.replaceAll("π", "pi").match(/\d*\.?\d+|[A-Za-z]+|[()+\-*/^]/g) || [];
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  function primary() { if (peek() === "(") { take(); const value = addition(); if (take() !== ")") throw Error(); return value; } if (/^\d/.test(peek() || "")) return Number(take()); if (peek() === "pi") { take(); return Math.PI; } const name = take(); if (take() !== "(") throw Error(); const value = addition(); if (take() !== ")") throw Error(); return ({ sqrt: Math.sqrt, sin: Math.sin, cos: Math.cos, tan: Math.tan, log: Math.log10, ln: Math.log, abs: Math.abs })[name](value); }
  function power() { let value = unary(); if (peek() === "^") { take(); value **= power(); } return value; }
  function unary() { if (peek() === "+") { take(); return unary(); } if (peek() === "-") { take(); return -unary(); } return primary(); }
  function multiplication() { let value = power(); while (["*", "/"].includes(peek())) { const operator = take(); const right = power(); value = operator === "*" ? value * right : value / right; } return value; }
  function addition() { let value = multiplication(); while (["+", "-"].includes(peek())) { const operator = take(); const right = multiplication(); value = operator === "+" ? value + right : value - right; } return value; }
  const result = addition(); if (index !== tokens.length || !Number.isFinite(result)) throw Error(); return result;
}

async function fetchScientific(source) {
  try {
    let result;
    if (location.protocol === "file:") result = evaluateLocalScientific(source);
    else { const response = await fetch("/api/scientific", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expression: source }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); result = data.result; }
    if (!Number.isFinite(result)) throw new Error("Invalid result");
    scientificResult.textContent = formatNumber(result); addHistory(source, formatNumber(result));
  } catch (error) { scientificResult.textContent = "Error"; }
}

document.querySelector("#scientific-card").addEventListener("click", event => { const button = event.target.closest("button"); if (!button) return; if (button.dataset.insert) { scientificInput.value += button.dataset.insert; scientificInput.focus(); } else if (button.dataset.action === "scientific-clear") { scientificInput.value = ""; scientificResult.textContent = "0"; } else if (button.dataset.action === "scientific-equals") { const source = scientificInput.value.trim(); if (source) fetchScientific(source); } });
scientificInput.addEventListener("keydown", event => { if (event.key === "Enter") evaluateScientific(); });

const sidebar = document.querySelector("#sidebar");
function toggleSidebar(open) { sidebar.classList.toggle("open", open); document.querySelector("#sidebar-backdrop").classList.toggle("open", open); document.querySelector("#menu-toggle").setAttribute("aria-expanded", open); }
document.querySelector("#menu-toggle").addEventListener("click", () => toggleSidebar(true));
document.querySelector("#close-sidebar").addEventListener("click", () => toggleSidebar(false));
document.querySelector("#sidebar-backdrop").addEventListener("click", () => toggleSidebar(false));
document.querySelectorAll(".mode-link").forEach(link => link.addEventListener("click", () => { const scientificMode = link.dataset.mode === "scientific"; document.querySelectorAll(".mode-link").forEach(item => item.classList.remove("active")); link.classList.add("active"); document.querySelector("#scientific-card").classList.toggle("visible", scientificMode); document.querySelector(".calculator-card").classList.toggle("hidden", scientificMode); toggleSidebar(false); }));

document.querySelector(".keypad").addEventListener("click", event => {
  const button = event.target.closest("button"); if (!button) return;
  const value = button.dataset.value; const action = button.dataset.action;
  if (value && /\d/.test(value)) inputDigit(value);
  else if (value) chooseOperation(value);
  else if (action === "decimal") inputDecimal();
  else if (action === "equals") calculate();
  else if (action === "clear") clearAll();
  else if (action === "sign") { current = formatNumber(Number(current) * -1); updateDisplay(); }
  else if (action === "percent") { current = formatNumber(Number(current) / 100); updateDisplay(); }
});

document.querySelector("#clear-history").addEventListener("click", () => { history = []; renderHistory(); });
document.addEventListener("keydown", event => {
  if (/\d/.test(event.key)) inputDigit(event.key);
  else if (event.key === ".") inputDecimal();
  else if (["+", "-", "*", "/"].includes(event.key)) chooseOperation(event.key);
  else if (event.key === "Enter" || event.key === "=") calculate();
  else if (event.key === "Escape") clearAll();
});