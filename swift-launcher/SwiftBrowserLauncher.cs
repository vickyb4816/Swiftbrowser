using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

internal static class SwiftBrowserLauncher
{
    [STAThread]
    private static void Main()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string script = Path.Combine(root, Path.Combine("swift-launcher", "SwiftBrowser.ps1"));
        if (!File.Exists(script))
        {
            MessageBox.Show("Swift Browser launcher files are missing. Extract the complete package before starting.",
                "Swift Browser", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        ProcessStartInfo info = new ProcessStartInfo();
        info.FileName = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.System), "WindowsPowerShell\\v1.0\\powershell.exe");
        info.Arguments = "-NoLogo -NoProfile -ExecutionPolicy Bypass -File \"" + script + "\"";
        info.WorkingDirectory = root;
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        try
        {
            Process.Start(info);
        }
        catch (Exception ex)
        {
            MessageBox.Show("Swift Browser could not start PowerShell. " + ex.Message,
                "Swift Browser", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}