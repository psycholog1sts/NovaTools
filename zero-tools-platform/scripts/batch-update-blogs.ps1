# batch-update-blogs.ps1
# Updates all 29 blog HTML files with:
#   1. FOUC prevention script after <meta charset="UTF-8">
#   2. Full standard header (nav, privacy badge, theme toggle, mobile menu)
#   3. /image.png -> /logo-bird.png
#   4. CSS variable replacements for hardcoded dark colors
#   5. Theme toggle + mobile menu JS before </body>

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $root) { $root = (Get-Location).Path }
if (Test-Path "$root/src/blog") {
    # good
} elseif (Test-Path "./src/blog") {
    $root = (Get-Location).Path
} else {
    $root = Split-Path -Parent $PSScriptRoot
}

# Collect all blog files: 4 hub pages + 25 article pages
$files = @(
    "src/blog/index.html",
    "src/blog/cloud-cost-optimization.html",
    "src/blog/life-insurance-guide.html",
    "src/blog/mortgage-refinance-guide.html"
)

# Add all article HTML files
$articlesDir = Join-Path $root "src/blog/articles"
if (Test-Path $articlesDir) {
    Get-ChildItem -Path $articlesDir -Filter "*.html" | ForEach-Object {
        $files += "src/blog/articles/$($_.Name)"
    }
}

Write-Host "Found $($files.Count) blog files to process" -ForegroundColor White

$fullHeader = @'
    <header class="main-header">
      <div class="container">
        <div class="header-inner">
          <a href="/" class="logo" aria-label="NovaTools MC Home">
            <img src="/logo-bird.png" alt="NovaTools MC" class="header-logo-img" width="44" height="44">
            <span class="logo-text">NovaTools <span class="logo-mc">MC</span></span>
          </a>
          <nav class="nav-desktop" aria-label="Main navigation">
            <a href="/#finance" class="nav-link">Finance</a>
            <a href="/#pdf" class="nav-link">PDF Tools</a>
            <a href="/#image" class="nav-link">Images</a>
            <a href="/#dev" class="nav-link">Developers</a>
          </nav>
          <div class="privacy-badge" title="Your data never leaves your browser">
            <span class="privacy-badge-dot"></span>
            <span>Privacy First</span>
          </div>
          <button type="button" id="themeToggle" class="theme-toggle" aria-label="Toggle theme">
            <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <button type="button" id="mobileMenuBtn" class="menu-btn" aria-label="Toggle menu" aria-expanded="false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
        <nav id="mobileMenu" class="mobile-menu" aria-label="Mobile navigation" hidden>
          <a href="/#finance" class="mobile-nav-link">Finance Tools</a>
          <a href="/#pdf" class="mobile-nav-link">PDF Tools</a>
          <a href="/#image" class="mobile-nav-link">Image Tools</a>
          <a href="/#dev" class="mobile-nav-link">Developer Tools</a>
        </nav>
      </div>
    </header>
'@

$foucScript = '<script>(function(){var t=localStorage.getItem(''theme'');if(t)document.documentElement.setAttribute(''data-theme'',t)})();</script>'

$themeJS = @'
<script>
document.addEventListener('DOMContentLoaded', function() {
  var menuBtn = document.getElementById('mobileMenuBtn');
  var mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', function() {
      var isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', !isExpanded);
      mobileMenu.hidden = isExpanded;
      mobileMenu.classList.toggle('active', !isExpanded);
    });
  }
  var themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    function getTheme() {
      var s = localStorage.getItem('theme');
      if (s) return s;
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    function updateIcon() {
      var t = getTheme();
      themeBtn.querySelector('.icon-sun').style.display = t === 'light' ? 'none' : 'block';
      themeBtn.querySelector('.icon-moon').style.display = t === 'dark' ? 'none' : 'block';
    }
    themeBtn.addEventListener('click', function() {
      var next = getTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateIcon();
    });
    updateIcon();
  }
});
</script>
'@

$updated = 0
$skipped = 0

foreach ($relPath in $files) {
    $filePath = Join-Path $root $relPath
    if (-not (Test-Path $filePath)) {
        Write-Host "SKIP (not found): $relPath" -ForegroundColor Yellow
        $skipped++
        continue
    }

    Write-Host "Processing: $relPath" -ForegroundColor Cyan
    $content = [System.IO.File]::ReadAllText($filePath)
    $original = $content

    # ─── 1. FOUC prevention script after <meta charset="UTF-8"> ───
    if ($content -notmatch 'localStorage\.getItem\(.*theme.*\).*setAttribute') {
        $content = $content -replace '(<meta\s+charset="UTF-8"\s*/?>)', "`$1`n  $foucScript"
    }

    # ─── 2. Replace FIRST <header class="main-header"> block only ───
    # Must NOT replace <header class="article-header"> blocks
    # Use a callback approach: find the first main-header and replace only it
    $headerPattern = '(?s)<header\s+class="main-header">.*?</header>'
    $match = [regex]::Match($content, $headerPattern)
    if ($match.Success) {
        # Replace only the first occurrence
        $content = $content.Substring(0, $match.Index) + $fullHeader + $content.Substring($match.Index + $match.Length)
    }

    # ─── 3. Replace /image.png with /logo-bird.png ───
    $content = $content -replace 'src="/image\.png"', 'src="/logo-bird.png"'

    # ─── 4. Replace hardcoded dark colors with CSS variables ───
    # rgba(255, 255, 255, 0.03) -> var(--surface-default)
    $content = $content -replace 'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.03\s*\)', 'var(--surface-default)'

    # rgba(255, 255, 255, 0.05) -> var(--surface-default)
    $content = $content -replace 'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.05\s*\)', 'var(--surface-default)'

    # rgba(255, 255, 255, 0.06) -> var(--border-default)
    $content = $content -replace 'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.06\s*\)', 'var(--border-default)'

    # rgba(255, 255, 255, 0.08) -> var(--border-default)
    $content = $content -replace 'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.08\s*\)', 'var(--border-default)'

    # rgba(255, 255, 255, 0.1) -> var(--border-hover)
    $content = $content -replace 'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.1\s*\)', 'var(--border-hover)'

    # rgba(255, 255, 255, 0.12) -> var(--border-hover)
    $content = $content -replace 'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.12\s*\)', 'var(--border-hover)'

    # rgba(99, 102, 241, 0.1) -> var(--accent-subtle)
    $content = $content -replace 'rgba\(\s*99\s*,\s*102\s*,\s*241\s*,\s*0\.1\s*\)', 'var(--accent-subtle)'

    # rgba(99, 102, 241, 0.5) -> var(--border-accent)
    $content = $content -replace 'rgba\(\s*99\s*,\s*102\s*,\s*241\s*,\s*0\.5\s*\)', 'var(--border-accent)'

    # rgba(99, 102, 241, 0.15) -> var(--accent-glow)
    $content = $content -replace 'rgba\(\s*99\s*,\s*102\s*,\s*241\s*,\s*0\.15\s*\)', 'var(--accent-glow)'

    # rgba(99, 102, 241, 0.2) -> var(--accent-glow)
    $content = $content -replace 'rgba\(\s*99\s*,\s*102\s*,\s*241\s*,\s*0\.2\s*\)', 'var(--accent-glow)'

    # Hardcoded color properties
    $content = $content -replace '(border-color:\s*)#6366F1', '${1}var(--accent-primary)'
    $content = $content -replace '(color:\s*)#6366F1', '${1}var(--accent-primary)'
    $content = $content -replace '(background:\s*)#6366F1', '${1}var(--accent-primary)'

    # ─── 5. Add theme toggle + mobile menu JS before </body> ───
    if ($content -notmatch 'getElementById\(.*themeToggle.*\)') {
        $content = $content -replace '</body>', "$themeJS`n</body>"
    }

    # ─── Write back if changed ───
    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($filePath, $content)
        Write-Host "  UPDATED" -ForegroundColor Green
        $updated++
    } else {
        Write-Host "  No changes needed" -ForegroundColor DarkGray
        $skipped++
    }
}

Write-Host "`n=== Done: $updated files updated, $skipped skipped ===" -ForegroundColor White
