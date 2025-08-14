# PowerShell script to run npm test and capture all output
$projectRoot = "C:\Users\cgb2\source\repos\valedit2025"
$logFile = "$projectRoot\npm-test-output.log"

# Clear previous log
if (Test-Path $logFile) { Remove-Item $logFile }

function Write-Log($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $message"
    Write-Host $logEntry
    Add-Content -Path $logFile -Value $logEntry
}

try {
    Write-Log "Starting npm test execution"
    Write-Log "Working directory: $projectRoot"
    
    # Change to project directory
    Set-Location $projectRoot
    Write-Log "Changed to project directory"
    
    # Run npm test and capture both stdout and stderr
    Write-Log "Running 'npm test'..."
    Write-Log "=========================================="
    
    $process = Start-Process -FilePath "npm" -ArgumentList "test" -NoNewWindow -Wait -PassThru -RedirectStandardOutput "$projectRoot\npm-stdout.tmp" -RedirectStandardError "$projectRoot\npm-stderr.tmp"
    
    # Read and log stdout
    if (Test-Path "$projectRoot\npm-stdout.tmp") {
        $stdout = Get-Content "$projectRoot\npm-stdout.tmp" -Raw
        Write-Log "STDOUT:"
        Write-Log $stdout
        Remove-Item "$projectRoot\npm-stdout.tmp"
    }
    
    # Read and log stderr
    if (Test-Path "$projectRoot\npm-stderr.tmp") {
        $stderr = Get-Content "$projectRoot\npm-stderr.tmp" -Raw
        if ($stderr) {
            Write-Log "STDERR:"
            Write-Log $stderr
        }
        Remove-Item "$projectRoot\npm-stderr.tmp"
    }
    
    Write-Log "=========================================="
    Write-Log "npm test completed with exit code: $($process.ExitCode)"
    
} catch {
    Write-Log "ERROR: Failed to run npm test"
    Write-Log "Exception: $($_.Exception.Message)"
    Write-Log "Stack trace: $($_.ScriptStackTrace)"
}

Write-Log "Test output logged to: $logFile"
Write-Host "Check the log file for complete output: $logFile"