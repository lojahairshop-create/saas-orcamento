import re

filepath = 'frontend/src/components/nesting/Toolbar.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'<button\s+className="px-3 py-1 rounded text-sm font-medium transition-colors bg-purple-700 hover:bg-purple-600 text-white"[\s\S]*?Perf Test \(300 peças\)[\s\S]*?</button>'

match = re.search(pattern, content)
if match:
    content = content[:match.start()] + '{IS_DEV && (\n' + match.group(0) + '\n)}' + content[match.end():]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
