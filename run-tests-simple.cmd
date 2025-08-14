@echo off
cd /d "C:\Users\cgb2\source\repos\valedit2025"
echo Starting npm test at %date% %time% > npm-test-output.log
echo ========================================== >> npm-test-output.log
npm test >> npm-test-output.log 2>&1
echo ========================================== >> npm-test-output.log
echo npm test completed at %date% %time% >> npm-test-output.log
echo.
echo Test output saved to npm-test-output.log
pause