Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
    [DllImport("user32.dll")]
    public static extern int GetSystemMetrics(int nIndex);
}
"@

# Find emulator window - try multiple methods
$emulator = $null
$processes = Get-Process | Where-Object { 
    $_.ProcessName -like "*emulator*" -or 
    $_.ProcessName -like "*qemu*" -or
    $_.MainWindowTitle -like "*emulator*" -or 
    $_.MainWindowTitle -like "*Android*" -or
    $_.MainWindowTitle -like "*AVD*"
}

foreach ($proc in $processes) {
    if ($proc.MainWindowHandle -ne [IntPtr]::Zero -and $proc.MainWindowTitle -ne "") {
        $emulator = $proc
        Write-Host "Found emulator: $($proc.ProcessName) - $($proc.MainWindowTitle)"
        break
    }
}

if ($emulator -and $emulator.MainWindowHandle -ne [IntPtr]::Zero) {
    $hwnd = $emulator.MainWindowHandle
    
    # Get screen dimensions
    $screenWidth = [Win32]::GetSystemMetrics(0)  # SM_CXSCREEN
    $screenHeight = [Win32]::GetSystemMetrics(1)  # SM_CYSCREEN
    
    # Set window size (phone-like dimensions, larger for better visibility)
    $width = 500
    $height = 900
    
    # Center on screen (ensure it stays within bounds)
    $x = [math]::Max(0, [math]::Round(($screenWidth - $width) / 2))
    $y = [math]::Max(0, [math]::Round(($screenHeight - $height) / 2))
    
    # Move and resize window
    [Win32]::MoveWindow($hwnd, $x, $y, $width, $height, $true)
    Write-Host "Emulator window repositioned to center: $x, $y, $width x $height"
} else {
    Write-Host "Emulator window not found. Make sure emulator is running."
}

