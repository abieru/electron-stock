const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const DB = require('./db');
const fs = require("fs");

// Base de datos (better-sqlite3: super rápido, sync)
const db = new DB(path.join(__dirname, 'inventario.db'));

let mainWindow;

// ==============================================
// Crear ventana principal
// ==============================================
function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 700,
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		}
	});

	mainWindow.loadFile('index.html');

	// Solo abre DevTools en modo desarrollo
	if (!app.isPackaged) {
		mainWindow.webContents.openDevTools();
	}

	// Liberar referencia al cerrar
	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}

// ==============================================
// APP READY
// ==============================================
app.whenReady().then(() => {
	db.init();   // Crear tablas si no existen (rápido, síncrono)
	createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

// ==============================================
// SALIR (excepto en macOS)
// ==============================================
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// ==============================================
// HANDLERS IPC OPTIMIZADOS
// ==============================================

ipcMain.handle("exportCSV", async () => {
  const items = db.getAllProducts();

  const headers = ["id","name","quantity","min_quantity","category","location"];
  const csvRows = [];

  csvRows.push(headers.join(","));

  for (const item of items) {
    const row = headers.map(h => `"${String(item[h] ?? "").replace(/"/g,'""')}"`);
    csvRows.push(row.join(","));
  }

  const csv = csvRows.join("\n");

  // Dialogo para que el usuario elija dónde guardar
  const { filePath } = await dialog.showSaveDialog({
    title: "Salvar CSV",
    defaultPath: "productos.csv",
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });

  if (!filePath) return { ok: false, cancelled: true };

  fs.writeFileSync(filePath, csv);

  return { ok: true, filePath };
});
function safeHandle(channel, handler) {
	ipcMain.handle(channel, async (event, ...args) => {
		try {
			return await handler(...args);
		} catch (err) {
			console.error(`❌ Error en IPC "${channel}":`, err);
			return { error: true, message: err.message };
		}
	});
}

safeHandle('getProducts', () => db.getAllProducts());
safeHandle('createProduct', (product) => db.createProduct(product));
safeHandle('updateProduct', (product) => db.updateProduct(product));
safeHandle('deleteProduct', (id) => db.deleteProduct(id));
safeHandle('addMovement', (movement) => db.addMovement(movement));
safeHandle('getMovements', () => db.getMovements());
safeHandle('lowStock', () => db.getLowStock());
safeHandle('searchProducts', (text) => db.searchProducts(text));
