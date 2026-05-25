#!/bin/bash
# Example: Push different content types using ai-push CLI

echo "=== AI Code Renderer - Content Type Examples ==="

# Example 1: Push Python code
echo ""
echo "1. Pushing Python code..."
cat <<'EOF' | ai-push --lang python --filename "example.py" --label "Python Example"
def fibonacci(n):
    """Calculate fibonacci sequence"""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
EOF

# Example 2: Push Markdown
echo ""
echo "2. Pushing Markdown documentation..."
cat <<'EOF' | ai-push --type markdown --filename "README.md" --label "Documentation"
# Project Documentation

## Introduction
This is a sample project demonstrating **Markdown** rendering.

## Code Example
```python
def hello():
    print("Hello, World!")
```

## Features
- Feature 1
- Feature 2
- Feature 3

### Subsection
More content here...
EOF

# Example 3: Push JSON/AST
echo ""
echo "3. Pushing JSON structure..."
cat <<'EOF' | ai-push --type json --filename "data.json" --label "JSON Data"
{
  "project": {
    "name": "AI Renderer",
    "version": "2.0.0",
    "features": [
      "Markdown rendering",
      "JSON visualization",
      "HTML preview",
      "Image display",
      "PDF viewer"
    ],
    "config": {
      "host": "127.0.0.1",
      "port": 7788,
      "autoReconnect": true
    }
  }
}
EOF

# Example 4: Push HTML
echo ""
echo "4. Pushing HTML with CSS and JavaScript..."
cat <<'EOF' | ai-push --type html --filename "interactive.html" --label "Interactive Demo"
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interactive Demo</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .container {
      background: white;
      border-radius: 10px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    h1 {
      color: #333;
      margin: 0 0 20px 0;
    }
    button {
      background: #667eea;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      margin-right: 10px;
    }
    button:hover {
      background: #764ba2;
    }
    #output {
      background: #f0f0f0;
      padding: 10px;
      border-radius: 5px;
      margin-top: 20px;
      min-height: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 Interactive Demo</h1>
    <button onclick="sayHello()">Say Hello</button>
    <button onclick="getTime()">Get Time</button>
    <button onclick="calculate()">Calculate</button>
    <div id="output"></div>
  </div>

  <script>
    function sayHello() {
      document.getElementById('output').textContent = 'Hello! 👋';
    }
    
    function getTime() {
      const now = new Date();
      document.getElementById('output').textContent = 'Current time: ' + now.toLocaleTimeString();
    }
    
    function calculate() {
      const result = 2 + 2;
      document.getElementById('output').textContent = 'Result: ' + result;
    }
    
    console.log('Demo loaded successfully');
  </script>
</body>
</html>
EOF

# Example 5: Push JavaScript
echo ""
echo "5. Pushing JavaScript code..."
cat <<'EOF' | ai-push --lang javascript --filename "app.js" --label "JavaScript App"
// Simple counter application
class Counter {
  constructor(initial = 0) {
    this.value = initial;
  }
  
  increment() {
    this.value++;
    return this.value;
  }
  
  decrement() {
    this.value--;
    return this.value;
  }
  
  getValue() {
    return this.value;
  }
}

const counter = new Counter(0);
console.log(counter.increment()); // 1
console.log(counter.increment()); // 2
console.log(counter.decrement()); // 1
EOF

# Example 6: Stream multiple lines as Markdown
echo ""
echo "6. Streaming log data..."
cat <<'EOF' | ai-push --type markdown --stream --filename "stream.log" --label "Log Stream"
# System Log

## Startup
- System initialized
- Services loaded
- Database connected

## Metrics
- CPU: 45%
- Memory: 2GB/8GB
- Network: 10Mbps
EOF

echo ""
echo "=== Examples completed ==="
echo "Check the AI Renderer web UI to see all content types rendered!"
