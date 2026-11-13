const { app, BrowserWindow, session, ipcMain, dialog, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const { execFile } = require('child_process');
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

const ESSENTIAL_DOMAINS = ['siebel', 'whatsapp.com', 'capstone'];
const DEFAULT_LEGACY_TLS_HOSTS = ['192.168.249.102'];

function loadConfig() {
  let data = {};
  try { data = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) { data = {}; }
  let changed = !fs.existsSync(configPath);
  if (!Array.isArray(data.priorityDomains)) { data.priorityDomains = []; changed = true; }
  if (!Array.isArray(data.bookmarks)) { data.bookmarks = []; changed = true; }
  if (!Array.isArray(data.legacyTlsHosts)) { data.legacyTlsHosts = DEFAULT_LEGACY_TLS_HOSTS.slice(); changed = true; }
  ESSENTIAL_DOMAINS.forEach(d => {
    if (!data.priorityDomains.includes(d)) { data.priorityDomains.push(d); changed = true; }
  });
  if (changed) { try { fs.writeFileSync(configPath, JSON.stringify(data, null, 2)); } catch (e) {} }
  return data;
}

// Office devices only: private IPv4 ranges or *.local names.
function isPrivateOfficeHost(host) {
  host = String(host || '').toLowerCase();
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  const m172 = host.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (m172 && Number(m172[1]) >= 16 && Number(m172[1]) <= 31) return true;
  return /^[a-z0-9-]+\.local$/.test(host);
}

function saveConfig(data) {
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
}

app.whenReady().then(async () => {
  const swiftSession = session.fromPartition('persist:swift');

  // Narrow exception: only exact hosts the user explicitly approved (private office addresses).
  // Do NOT disable certificate checks globally.
  swiftSession.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    let host = '';
    try { host = new URL(url).hostname; } catch (e) {}
    if (loadConfig().legacyTlsHosts.includes(host) && isPrivateOfficeHost(host) && error === 'net::ERR_CERT_AUTHORITY_INVALID') {
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  });

  // Native context menu for webpage text, links, images and editable fields.
  app.on('web-contents-created', (_event, contents) => {
    contents.on('context-menu', (_event, params) => {
      const menuItems = [];
      if (params.isEditable) {
        menuItems.push(
          { role: 'cut', enabled: params.editFlags.canCut },
          { role: 'copy', enabled: params.editFlags.canCopy },
          { role: 'paste', enabled: params.editFlags.canPaste },
          { role: 'selectAll' }
        );
      } else {
        menuItems.push(
          { role: 'back', enabled: contents.navigationHistory ? contents.navigationHistory.canGoBack() : contents.canGoBack() },
          { role: 'forward', enabled: contents.navigationHistory ? contents.navigationHistory.canGoForward() : contents.canGoForward() },
          { type: 'separator' },
          { role: 'copy', enabled: params.editFlags.canCopy },
          { role: 'selectAll' }
        );
      }
      if (params.linkURL) menuItems.push({ type: 'separator' }, { label: 'Copy link address', click: () => require('electron').clipboard.writeText(params.linkURL) });
      if (params.srcURL) menuItems.push({ label: 'Copy image address', click: () => require('electron').clipboard.writeText(params.srcURL) });
      menuItems.push({ type: 'separator' }, { role: 'reload' });
      Menu.buildFromTemplate(menuItems).popup({ window: BrowserWindow.fromWebContents(contents) || mainWindow });
    });
  });

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
    title: 'Swift Browser',
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
  // IN-APP AUTO UPDATER
  // Requires a published GitHub Release with latest.yml.
  // ==========================================
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  function sendUpdateStatus(payload) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-status', payload);
    }
  }

  autoUpdater.on('checking-for-update', () => sendUpdateStatus({ status: 'checking' }));
  autoUpdater.on('update-available', (info) => sendUpdateStatus({ status: 'available', version: info.version }));
  autoUpdater.on('update-not-available', (info) => sendUpdateStatus({ status: 'not-available', version: info.version }));
  autoUpdater.on('download-progress', (progress) => sendUpdateStatus({
    status: 'downloading', percent: Math.round(progress.percent || 0)
  }));
  autoUpdater.on('update-downloaded', (info) => sendUpdateStatus({ status: 'downloaded', version: info.version }));
  autoUpdater.on('error', (error) => sendUpdateStatus({ status: 'error', message: error.message }));

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => sendUpdateStatus({ status: 'error', message: err.message }));
  }, 8000);
});

// ==========================================
// 2. NATIVE SIEBEL IE / JAVA LAUNCHER
// ==========================================
ipcMain.handle('launch-siebel-ie', async (e, url) => {
  // TEMPORARY: opens the Windows MSHTML engine in a separate window.
  // The URL is passed through an environment variable, never pasted into a command.
  let target = String(url || '').trim() || 'http://siebel';
  if (!/^https?:\/\//i.test(target)) target = 'http://' + target;
  let parsed;
  try { parsed = new URL(target); } catch (err) { return false; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  execFile('powershell.exe', [
    '-NoProfile', '-WindowStyle', 'Hidden', '-Command',
    "$ie = New-Object -ComObject InternetExplorer.Application; $ie.Visible = $true; $ie.Navigate($env:SWIFT_IE_URL)"
  ], { env: Object.assign({}, process.env, { SWIFT_IE_URL: parsed.href }), windowsHide: true }, () => {});
  return true;
});

ipcMain.handle('get-build-info', () => {
  try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'build-info.json'), 'utf8')); }
  catch (err) { return { builtAt: null }; }
});

ipcMain.handle('request-legacy-tls', async (e, host) => {
  host = String(host || '').toLowerCase();
  if (!isPrivateOfficeHost(host)) {
    await dialog.showMessageBox(mainWindow, { type: 'info', title: 'Swift Browser',
      message: 'Legacy TLS mode is only available for private office addresses (10.x, 172.16-31.x, 192.168.x or *.local).' });
    return false;
  }
  const config = loadConfig();
  if (config.legacyTlsHosts.includes(host)) return true;
  const r = await dialog.showMessageBox(mainWindow, {
    type: 'warning', buttons: ['Cancel', 'Allow this device'], defaultId: 0, cancelId: 0,
    title: 'Legacy device connection',
    message: 'Allow legacy TLS for ' + host + '?',
    detail: 'This device uses an old or self-signed certificate. Swift Browser will skip certificate checks for this exact address only. Only approve devices you trust on your office network.'
  });
  if (r.response !== 1) return false;
  config.legacyTlsHosts.push(host);
  saveConfig(config);
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

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, version: result && result.updateInfo ? result.updateInfo.version : null };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});
ipcMain.handle('download-update', async () => {
  try { await autoUpdater.downloadUpdate(); return { ok: true }; }
  catch (error) { return { ok: false, error: error.message }; }
});
ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall();
  return { ok: true };
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
// 3. LEGACY TLS BRIDGE FOR APPROVED OFFICE DEVICES (loopback only)
// ==========================================
http.createServer((clientReq, clientRes) => {
  const fail = (code, msg) => { clientRes.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' }); clientRes.end(msg); };
  try {
    // Reject anything not addressed to our own loopback listener (blocks DNS-rebinding tricks).
    if (!/^(localhost|127\.0\.0\.1):8089$/i.test(clientReq.headers.host || '')) return fail(403, 'Forbidden');
    const rawTarget = clientReq.url.slice(1);
    const targetUrl = new URL(rawTarget.startsWith('http') ? rawTarget : 'https://' + rawTarget);
    const host = targetUrl.hostname.toLowerCase();
    if (!isPrivateOfficeHost(host) || !loadConfig().legacyTlsHosts.includes(host)) {
      return fail(403, 'This device has not been approved for legacy TLS mode.');
    }
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || 443,
      path: targetUrl.pathname + targetUrl.search,
      method: clientReq.method,
      headers: Object.assign({}, clientReq.headers, { host: targetUrl.host }),
      rejectUnauthorized: false, // approved private office devices only (checked above)
      minVersion: 'TLSv1',
      ciphers: 'ALL:@SECLEVEL=0'
    };
    const proxyReq = https.request(options, (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(clientRes, { end: true });
    });
    clientReq.pipe(proxyReq, { end: true });
    proxyReq.on('error', (err) => { if (!clientRes.headersSent) fail(502, 'Legacy TLS connection failed: ' + err.message); else clientRes.end(); });
  } catch (e) {
    fail(400, 'Invalid URL format for legacy TLS mode');
  }
}).listen(8089, '127.0.0.1');
