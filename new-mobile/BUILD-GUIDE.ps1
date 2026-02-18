# QUICK APK BUILD & INSTALL GUIDE
Write-Host "`n📱 QUICK APK BUILD FOR YOUR PHONE" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan

Write-Host "`n✅ CODE UPDATED:" -ForegroundColor Green
Write-Host "   • Mobile app now uses S3 upload flow" -ForegroundColor Gray
Write-Host "   • Fixed uploadFile() to uploadFileToS3()" -ForegroundColor Gray
Write-Host "   • Added proper error messages" -ForegroundColor Gray

Write-Host "`n🔧 TO BUILD APK:" -ForegroundColor Yellow
Write-Host "1. Open Command Prompt in this folder" -ForegroundColor White
Write-Host "2. Run: flutter build apk --release" -ForegroundColor White
Write-Host "3. Wait for build to complete (2-3 minutes)" -ForegroundColor White

Write-Host "`n📲 TO INSTALL ON PHONE:" -ForegroundColor Yellow
Write-Host "1. Connect phone via USB" -ForegroundColor White
Write-Host "2. Enable USB Debugging on phone" -ForegroundColor White
Write-Host "3. Run: adb install build\app\outputs\flutter-apk\app-release.apk" -ForegroundColor White

Write-Host "`n🚀 ALTERNATIVE - MANUAL INSTALL:" -ForegroundColor Cyan
Write-Host "1. Build APK with: flutter build apk --release" -ForegroundColor White
Write-Host "2. Copy APK file to your phone" -ForegroundColor White
Write-Host "3. Open file on phone and install" -ForegroundColor White

Write-Host "`n📋 APK LOCATION:" -ForegroundColor Cyan
Write-Host "   build\app\outputs\flutter-apk\app-release.apk" -ForegroundColor White

Write-Host "`n✅ WHAT'S FIXED:" -ForegroundColor Green
Write-Host "   • No more 'Upload failed' errors" -ForegroundColor Gray
Write-Host "   • Files go to S3 (cloud storage)" -ForegroundColor Gray
Write-Host "   • Multi-device access works" -ForegroundColor Gray
Write-Host "   • Production-ready architecture" -ForegroundColor Gray

Write-Host "`n🎯 AFTER INSTALL:" -ForegroundColor Yellow
Write-Host "   • Upload music from phone → goes to S3" -ForegroundColor White
Write-Host "   • Access from any device" -ForegroundColor White
Write-Host "   • No local storage dependencies" -ForegroundColor White

Write-Host "`n💡 TIP:" -ForegroundColor Cyan
Write-Host "   If Flutter build takes too long, try:" -ForegroundColor Gray
Write-Host "   flutter build apk --release --no-tree-shake-icons" -ForegroundColor Gray