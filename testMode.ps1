param (
    [Parameter(Mandatory=$true)]
    [ValidateSet('chrome','firefox')]
    [string]$browser,

    [string]$destination = ".\build"
)

# Assembles an unpacked, loadable extension in $destination\$browser.
# The shared sources live in .\src and the browser specific files in .\src\$browser,
# which are copied last so they override the shared ones (manifest.json, options.html).

$target = Join-Path $destination $browser

if (Test-Path $target) {
    Remove-Item -Recurse -Force $target
}

New-Item -ItemType Directory -Force -Path $target | Out-Null
New-Item -ItemType Directory -Force -Path "$target\images" | Out-Null

Copy-Item -Path ".\src\*" -Include "*.js","*.css","*.html","*.png" -Destination $target
Copy-Item -Path ".\src\images\logo.png" -Destination "$target\images"
Copy-Item -Path ".\src\$browser\*" -Recurse -Force -Destination $target

Write-Output "Unpacked $browser extension ready in $((Resolve-Path $target).Path)"
if ($browser -eq 'firefox') {
    Write-Output "Load it from about:debugging#/runtime/this-firefox -> Load Temporary Add-on -> pick manifest.json in that folder."
} else {
    Write-Output "Load it from chrome://extensions -> Developer mode -> Load unpacked -> pick that folder."
}
