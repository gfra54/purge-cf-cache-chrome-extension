param (
    [Parameter(Mandatory=$true)]
    [string]$destination,

    [Parameter(Mandatory=$true)]
    [ValidateSet('chrome','firefox')]
    [string]$browser
)

# Locates the 7-Zip executable. It is often installed without being added to the
# PATH, so the usual install locations and the registry are checked as well.
function Find-SevenZip {
    $onPath = Get-Command 7z -ErrorAction SilentlyContinue
    if ($onPath) {
        return $onPath.Source
    }

    $candidates = @(
        "$env:ProgramFiles\7-Zip\7z.exe",
        "${env:ProgramFiles(x86)}\7-Zip\7z.exe",
        "$env:LOCALAPPDATA\Programs\7-Zip\7z.exe",
        "$env:USERPROFILE\scoop\apps\7zip\current\7z.exe"
    )

    foreach ($key in @('HKLM:\SOFTWARE\7-Zip', 'HKCU:\SOFTWARE\7-Zip')) {
        try {
            $path = (Get-ItemProperty -Path $key -Name Path -ErrorAction Stop).Path
            if ($path) {
                $candidates += (Join-Path $path '7z.exe')
            }
        } catch {}
    }

    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path $candidate)) {
            return $candidate
        }
    }

    return $null
}

Write-Output "Compressing the cf-purge extension"

if (Test-Path $destination) {
    Remove-Item -Recurse -Force "$destination"
}

$staging = "$destination\temp"
New-Item -ItemType Directory -Force -Path "$staging\images" | Out-Null

# The shared sources are copied first, then the browser specific ones so they
# override the shared files with the same name.
Copy-Item -Path ".\src\*" -Include "*.js","*.css","*.html","*.png" -Destination $staging
Copy-Item -Path ".\src\images\logo.png" -Destination "$staging\images"
Copy-Item -Path ".\src\$browser\*" -Recurse -Force -Destination $staging

$archive = Join-Path (Get-Location) "$browser.zip"
if (Test-Path $archive) {
    Remove-Item $archive -Force
}

$sevenZip = Find-SevenZip
if ($sevenZip) {
    Write-Output "Using 7-Zip at $sevenZip"
    & $sevenZip a -r -y "$archive" "$staging\*" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Remove-Item $destination -Recurse -Force
        throw "7-Zip exited with code $LASTEXITCODE."
    }
} else {
    # No 7-Zip anywhere: fall back to the .NET zip writer. Entries are added one by
    # one instead of with CreateFromDirectory or Compress-Archive, because under
    # Windows PowerShell 5.1 both write backslash entry separators. The zip format
    # mandates forward slashes and extension stores reject the backslash variant.
    Write-Output "7-Zip not found, falling back to the built-in .NET zip writer"
    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $level = [System.IO.Compression.CompressionLevel]::Optimal
    $root = (Resolve-Path $staging).Path.TrimEnd('\')
    $zip = [System.IO.Compression.ZipFile]::Open($archive, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        Get-ChildItem -Path $root -Recurse -File | ForEach-Object {
            $entryName = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
            [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName, $level)
        }
    } finally {
        $zip.Dispose()
    }
}

Remove-Item "$destination" -Recurse -Force

Write-Output "Created $archive"
