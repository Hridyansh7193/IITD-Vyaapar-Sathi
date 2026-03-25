import os
import re

frontend_src = "c:/Users/hridy\Desktop/Hackathon/IITD-Vyaapar-Sathi/frontend/src"

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Fix double quoted templates: "${getApiUrl()}/..." -> `${getApiUrl()}/...`
    # We find strings starting with " and containing ${getApiUrl()} and ending with "
    content = re.sub(r'"(\$\{getApiUrl\(\)\}/[^"]*)"', r'`\1`', content)
    
    # 2. Fix the nested backtick issue: `` `${getApiUrl()}/...` `` -> `` `${getApiUrl()}/...` `` (Wait, that might be okay, but let's be clean)
    # If we have ` `${getApiUrl()}/...` ` (it usually happens if it was already a template)
    # Actually, if it was `http://localhost:8000/...` and we replaced the inner part
    # result is `${getApiUrl()}/...`. This is fine.
    
    # 3. Fix cases where we might have double backticks or similar artifacts
    # (Actually, let's just focus on the quote-to-backtick conversion which IS broken)
    
    # Also handle single quotes
    content = re.sub(r"'\$\{getApiUrl\(\)\}/([^']*)'", r"`${getApiUrl()}/\1`", content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

for root, dirs, files in os.walk(frontend_src):
    for name in files:
        if name.endswith((".tsx", ".ts")):
            process_file(os.path.join(root, name))
