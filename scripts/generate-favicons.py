#!/usr/bin/env python3
"""
Generate favicon variants from the main favicon.svg
Creates multiple sizes for different use cases
"""

import os
import re

def main():
    # Read the SVG
    with open('favicon.svg', 'r') as f:
        svg_content = f.read()
    
    public_dir = 'public'
    os.makedirs(public_dir, exist_ok=True)
    
    # Generate different sizes
    sizes = {
        'favicon-16.svg': 16,
        'favicon-32.svg': 32,
        'favicon-48.svg': 48,
        'apple-touch-icon.svg': 180,
    }
    
    for filename, size in sizes.items():
        # Replace viewBox with explicit width/height
        modified_svg = re.sub(
            r'<svg([^>]*)viewBox="0 0 100 100"',
            f'<svg\\1viewBox="0 0 100 100" width="{size}" height="{size}"',
            svg_content
        )
        
        filepath = os.path.join(public_dir, filename)
        with open(filepath, 'w') as f:
            f.write(modified_svg)
        
        print(f'Created: {filepath} ({size}x{size})')
    
    # Copy original as favicon.svg to public
    with open('favicon.svg', 'r') as f:
        original = f.read()
    with open(os.path.join(public_dir, 'favicon.svg'), 'w') as f:
        f.write(original)
    print(f'Created: {os.path.join(public_dir, "favicon.svg")}')
    
    print('\nFavicon generation complete!')
    print('Note: For .ico and .png files, use a build tool like:')
    print('  - sharp (Node.js)')
    print('  - ImageMagick')
    print('  - Online converter')

if __name__ == '__main__':
    main()
