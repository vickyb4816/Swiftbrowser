const { app, BrowserWindow, session, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const tls = require('tls');

tls.DEFAULT_MIN_VERSION = 'TLSv1'; 

// ==========================================
// 1. CONSERVATIVE MEMORY AND SECURITY DEFAULTS
// ==========================================
// Inactive pages are unloaded by the tab manager in index.html.
// Avoid global process hacks: they do not impose a reliable RAM cap
// and can cause instability or weaken browser security.
app.commandLine.appendSwitch('disk-cache-size', '52428800'); // 50 MB disk cache limit


let mainWindow;
const configPath = path.join(app.getPath('userData'), 'swift-config.json');

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    const defaultData = {
      priorityDomains: ['cnmaestro.com', 'whatsapp.com', 'capstone', 'rftr', 'inventum'],
      bookmarks: [
        { title: 'WhatsApp Web', url: 'https://web.whatsapp.com' },
        { title: 'cnMaestro', url: 'https://cnmaestro.com' },
        { title: 'RFTR', url: 'https://rftr.com' },
        { title: 'WO Tracker', url: 'https://wotracker.com' },
        { title: 'Inventum', url: 'https://inventum.com' },
        { title: 'Capstone', url: 'https://capstone.com' }
      ]
    };
    fs.writeFileSync(configPath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(configPath));
}

function saveConfig(data) {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

app.whenReady().then(async () => {
  const swiftSession = session.fromPartition('persist:swift');

  swiftSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const config = loadConfig();
    const isPriority = config.priorityDomains.some(domain => details.url.toLowerCase().includes(domain.toLowerCase()));
    if (isPriority) {
      details.requestHeaders['Connection'] = 'keep-alive';
      details.requestHeaders['Cache-Control'] = 'max-age=3600';
    }
    // WhatsApp Web checks the browser identity. Present the bundled Chromium 108
    // as Chrome 108 on Windows 7 (Electron 22 uses Chromium 108).
    if (/https?:\/\/(web\.)?whatsapp\.com\//i.test(details.url)) {
      details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36';
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Swift Browser (Low-RAM Edition)',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true 
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.on('page-title-updated', (e) => e.preventDefault());

  // ==========================================
  // AUTO UPDATER LOGIC
  // ==========================================
  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', async (info) => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) of Swift Browser is available.\n\nWould you like to update now?`,
      buttons: ['Update Now', 'Ignore']
    });
    if (response === 0) {
      mainWindow.webContents.executeJavaScript(`showToast('Downloading update... Please wait.')`).catch(()=>{});
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on('update-downloaded', async () => {
    await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'The update has been downloaded. The browser will now restart to apply it.',
      buttons: ['Restart Now']
    });
    autoUpdater.quitAndInstall();
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => console.log('Update check error', err));
  }, 5000);
});

// ==========================================
// 2. NATIVE SIEBEL IE / JAVA LAUNCHER
// ==========================================
ipcMain.handle('launch-siebel-ie', async (e, url) => {
  // Launches Windows built-in MSHTML/Trident engine for Oracle Java ActiveX without opening full Edge/Firefox
  const target = url || 'http://siebel';
  exec(`powershell -WindowStyle Hidden -Command "$ie = New-Object -ComObject InternetExplorer.Application; $ie.Visible = $true; $ie.Navigate('${target}')"`);
  return true;
});

ipcMain.handle('clean-cache-only', async () => {
  const swiftSession = session.fromPartition('persist:swift');
  await swiftSession.clearCache();
  await swiftSession.clearStorageData({
    storages: ['appcache', 'cachestorage', 'serviceworkers', 'shadercache']
  });
  if (global.gc) global.gc();
  return true;
});

ipcMain.handle('load-extension', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Unpacked Chrome Extension Folder'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const swiftSession = session.fromPartition('persist:swift');
    const ext = await swiftSession.loadExtension(result.filePaths[0]);
    return ext.name;
  }
  return null;
});

ipcMain.handle('get-config', () => loadConfig());

ipcMain.handle('add-priority-domain', (e, domain) => {
  const config = loadConfig();
  const cleanDomain = domain.replace(/^https?:\/\//, '').split('/')[0];
  if (!config.priorityDomains.includes(cleanDomain)) {
    config.priorityDomains.push(cleanDomain);
    saveConfig(config);
  }
  return config;
});

ipcMain.handle('add-bookmark', (e, bookmark) => {
  const config = loadConfig();
  config.bookmarks.push(bookmark);
  saveConfig(config);
  return config;
});

ipcMain.handle('import-bookmarks', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'HTML Bookmarks', extensions: ['html'] }],
    title: 'Import Chrome Bookmarks HTML File'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const html = fs.readFileSync(result.filePaths[0], 'utf8');
    const regex = /<A HREF="([^"]+)"[^>]*>([^<]+)<\/A>/gi;
    const config = loadConfig();
    let match;
    while ((match = regex.exec(html)) !== null) {
      config.bookmarks.push({ url: match[1], title: match[2].substring(0, 25) });
    }
    saveConfig(config);
    return config;
  }
  return null;
});

// ==========================================
// 3. BUILT-IN TLS 1.0 RADIO & SWITCH BRIDGE (Replaces Firefox)
// ==========================================
http.createServer((clientReq, clientRes) => {
  try {
    const rawTarget = clientReq.url.slice(1);
    const targetUrl = new URL(rawTarget.startsWith('http') ? rawTarget : 'https://' + rawTarget); 
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || 443,
      path: targetUrl.pathname + targetUrl.search,
      method: clientReq.method,
      headers: { ...clientReq.headers, host: targetUrl.host },
      rejectUnauthorized: false,
      minVersion: 'TLSv1',
      ciphers: 'ALL:@SECLEVEL=0'
    };
    const proxyReq = https.request(options, (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes, { end: true });
    });
    clientReq.pipe(proxyReq, { end: true });
    proxyReq.on('error', (err) => clientRes.end('TLS Radio Bridge Error: ' + err.message));
  } catch (e) {
    clientRes.end('Invalid URL format for TLS Bridge');
  }
}).listen(8089);
