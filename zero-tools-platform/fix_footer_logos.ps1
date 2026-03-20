$files = Get-ChildItem -Path "C:\Users\meteh\Desktop\web-projem\zero-tools-platform\src\blog" -Filter "*.html" -Recurse

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8

    # Replace the neon-logo div containing SVG with an img tag
    $pattern = '<div class="neon-logo" style="width: 36px; height: 36px;">\s*<svg[\s\S]*?</svg>\s*</div>'
    $replacement = '<img src="/image.png" alt="NovaTools MC" class="header-logo-img" width="36" height="36">'

    $newContent = [regex]::Replace($content, $pattern, $replacement)

    if ($newContent -ne $content) {
        Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($file.Name)"
    } else {
        Write-Host "No change: $($file.Name)"
    }
}
