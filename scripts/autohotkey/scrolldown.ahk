#Requires AutoHotkey v2.0

if WinExist("ahk_exe League of Legends.exe") {
    WinActivate

    Send "{Click 10 10}"
    Send "^+Z"

    ; Unzoom the camera 3 times
    Send "{WheelDown 12}"

    Return
}

