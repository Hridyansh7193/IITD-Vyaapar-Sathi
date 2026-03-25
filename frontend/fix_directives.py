import os

frontend_src = "c:/Users/hridy/Desktop/Hackathon/IITD-Vyaapar-Sathi/frontend/src/app"

def fix_directive_order(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    if len(lines) < 2:
        return

    # Check if "use client" is at line 2 and an import is at line 1
    if '"use client"' in lines[1] and 'import' in lines[0]:
        print(f"Swapping lines in {file_path}")
        # Swap them
        lines[0], lines[1] = lines[1], lines[0]
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)

for root, dirs, files in os.walk(frontend_src):
    for name in files:
        if name.endswith(".tsx"):
            fix_directive_order(os.path.join(root, name))
