#!/usr/bin/env python3
"""
Add i18n.js script to all HTML pages
"""

import os
import re
from pathlib import Path

def add_i18n_to_file(file_path):
    """Add i18n.js script to an HTML page"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Skip if already has i18n.js
        if 'src/i18n.js' in content:
            print(f"Skipping {file_path} - already has i18n.js")
            return True
        
        # Add i18n.js after </title>
        pattern = r'(</title>)'
        replacement = r'\1\n  \n  <!-- i18n Script -->\n  <script src="/src/i18n.js"></script>'
        
        if re.search(pattern, content):
            new_content = re.sub(pattern, replacement, content, count=1)
            if new_content != content:
                content = new_content
            else:
                print(f"Could not modify {file_path}")
                return False
        else:
            print(f"No </title> found in {file_path}")
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
    # List of pages to update
    pages = [
        'about-us.html',
        'contact.html',
        'cookie-policy.html',
        'privacy-policy.html',
        'request-tool.html',
        'security.html',
        'terms-of-service.html',
        'categories/index.html',
        'categories/pdf-tools.html',
        'categories/image-tools.html',
        'categories/finance-tools.html',
        'categories/developer-tools.html',
        'categories/text-writing.html',
        'categories/converters.html',
        'blog/index.html',
    ]
    
    count = 0
    skipped = 0
    failed = 0
    
    for page in pages:
        path = Path(page)
        if not path.exists():
            print(f"File not found: {page}")
            failed += 1
            continue
        
        if add_i18n_to_file(path):
            count += 1
        else:
            skipped += 1
    
    print(f"\nSummary:")
    print(f"  Updated: {count}")
    print(f"  Skipped: {skipped}")
    print(f"  Failed: {failed}")

if __name__ == '__main__':
    main()
