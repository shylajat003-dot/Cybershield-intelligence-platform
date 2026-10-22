Write-Host "Copying CyberShield project to final MERN version..."
$source = "c:\Users\SYS\OneDrive\Documents\fsd projects\cybershield-platform"
$dest = "c:\Users\SYS\OneDrive\Documents\fsd projects\cybershield-platform\cybershield-mern-final"
# Ensure destination is empty (except this script)
Get-ChildItem -Path $dest -Recurse -Force | Where-Object { $_.FullName -ne $MyInvocation.MyCommand.Path } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
# Copy required subfolders
Copy-Item -Path "$source\frontend" -Destination $dest -Recurse -Force
Copy-Item -Path "$source\backend" -Destination $dest -Recurse -Force
Copy-Item -Path "$source\docker-compose.yml" -Destination $dest -Force
Copy-Item -Path "$source\.env.example" -Destination $dest -Force
Copy-Item -Path "$source\README.md" -Destination $dest -Force
Write-Host "Copy completed.\nNow edit configuration to use persistent MongoDB."
