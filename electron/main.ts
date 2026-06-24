import { app, BrowserWindow, Menu, protocol, shell } from 'electron';
import path from 'node:path';
import os from 'node:os';
import { registerStorageIpc } from './ipc/storage.ipc';
import { closeDatabase } from './db/sqliteRepository';

let mainWindow: BrowserWindow | null = null;

app.setAppUserModelId('com.mymind.desktop');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'mymind-asset',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

function getDocumentsDirectory() {
  return app.getPath('documents') || path.join(os.homedir(), 'Documents');
}

function getDataDirectory() {
  return path.join(getDocumentsDirectory(), 'MyMind', 'data');
}

function registerAssetProtocol() {
  protocol.registerFileProtocol('mymind-asset', (request, callback) => {
    try {
      const url = new URL(request.url);
      const relativePath = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
      const target = path.resolve(getDataDirectory(), relativePath);
      const relative = path.relative(getDataDirectory(), target);

      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        callback({ error: -10 });
        return;
      }

      callback({ path: target });
    } catch {
      callback({ error: -2 });
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    title: 'MyMind',
    icon: path.join(__dirname, '../build/icon.ico'),
    backgroundColor: '#111318',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.setMenu(null);

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  registerAssetProtocol();
  registerStorageIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeDatabase();
});

export function openPathInShell(targetPath: string) {
  return shell.openPath(targetPath);
}
