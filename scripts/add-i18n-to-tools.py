#!/usr/bin/env python3
"""
Add i18n.js script to all tool pages
"""

import os
import re
from pathlib import Path

def add_i18n_to_file(file_path):
    """Add i18n.js script to a tool page"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Skip if already has i18n.js
        if 'src/i18n.js' in content:
            print(f"Skipping {file_path} - already has i18n.js")
            return True
        
        # Add i18n.js after the main.css or design-system.css or critical.css link
        # Try different patterns
        patterns = [
            (r'(</title>)', r'\1\n  \n  <!-- i18n Script -->\n  <script src="/src/i18n.js"></script>'),
            (r'(</head>)', r'  <!-- i18n Script -->\n  <script src="/src/i18n.js"></script>\n  \n\1'),
        ]
        
        modified = False
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                new_content = re.sub(pattern, replacement, content, count=1)
                if new_content != content:
                    content = new_content
                    modified = True
                    break
        
        if not modified:
            print(f"Could not modify {file_path} - no pattern matched")
            return False
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"Updated {file_path}")
        return True
        
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    # Find all tool index.html files
    tools_dir = Path('src/tools')
    
    if not tools_dir.exists():
        print(f"Tools directory not found: {tools_dir}")
        return
    
    count = 0
    skipped = 0
    failed = 0
    
    for html_file in tools_dir.rglob('index.html'):
        # Skip demo and experimental
        if 'demo-' in str(html_file) or 'experimental' in str(html_file):
            skipped += 1
            continue
        
        if add_i18n_to_file(html_file):
            count += 1
        else:
            failed += 1
    
    print(f"\nSummary:")
    print(f"  Updated: {count}")
    print(f"  Skipped: {skipped}")
    print(f"  Failed: {failed}")

if __name__ == '__main__':
    main()
