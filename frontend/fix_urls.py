import os
import re

frontend_src = "c:/Users/hridy/Desktop/Hackathon/IITD-Vyaapar-Sathi/frontend/src"

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "http://localhost:8000" in content:
        print(f"Fixing {file_path}")
        
        # 1. Add import if missing
        if 'import { getApiUrl }' not in content and 'import { cn, getApiUrl }' not in content:
            # Try to add to existing lib/utils import
            if '@/lib/utils' in content:
                content = re.sub(r'import\s+\{\s*cn\s*\}\s+from\s+"@/lib/utils"', 'import { cn, getApiUrl } from "@/lib/utils"', content)
            else:
                # Add after other imports
                content = 'import { getApiUrl } from "@/lib/utils";\n' + content
        
        # 2. Replace URLs
        content = content.replace("http://localhost:8000", "${getApiUrl()}")
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

for root, dirs, files in os.walk(frontend_src):
    for name in files:
        if name.endswith((".tsx", ".ts")):
            process_file(os.path.join(root, name))
