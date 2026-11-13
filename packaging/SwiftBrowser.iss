#define MyAppName "Swift Browser"
#define MyAppVersion "1.2.0"
#define MyAppPublisher "Vicky Bhalerao"
#define MyAppExeName "SwiftBrowser.exe"

[Setup]
AppId={{C6B2B2B5-3C0D-4C7B-9B6D-1C0DFA120120}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\Swift Browser
DefaultGroupName={#MyAppName}
OutputDir=..\dist
OutputBaseFilename=Swift-Browser-Setup-1.2.0
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin
UninstallDisplayIcon={app}\SwiftBrowser.exe
DisableProgramGroupPage=yes

[Files]
Source: "..\staging\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\Swift Browser"; Filename: "{app}\SwiftBrowser.exe"; WorkingDir: "{app}"
Name: "{autodesktop}\Swift Browser"; Filename: "{app}\SwiftBrowser.exe"; WorkingDir: "{app}"

[Run]
Filename: "{app}\SwiftBrowser.exe"; Description: "Launch Swift Browser"; Flags: postinstall nowait skipifsilent
