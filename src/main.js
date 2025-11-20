const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const DB = require('./dao/db');
const ProductsDAO = require('./dao/products.db');
const MovementsDAO = require('./dao/movements.db');
const fs = require("fs");

const db = new DB(path.join(app.getPath('userData'), 'inventario.db'));
db.init();
const DAOproducts = new ProductsDAO(db.db);
const DAOmovements = new MovementsDAO(db.db);

let mainWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1400,
		height: 1000,
		autoHideMenuBar: true,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false,
		}
	});

	mainWindow.loadFile(path.join(__dirname, 'index.html'));
	// mainWindow.webContents.openDevTools();
	mainWindow.on('ready', () => { 
		Menu.setApplicationMenu(null);
	});	
}

app.whenReady().then(() => {
	createWindow();
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});


ipcMain.handle("exportCSV", async () => {
	const items = DAOproducts.getAllProductsForCSV();

	const headers = ["id", "nome", "quantidade", "quantidade_minima", "fornecedor", "localizacao"];
	const csvRows = [];
	csvRows.push(headers.join(","));

	for (const item of items) {
		const row = headers.map(h => `"${String(item[h] ?? "").replace(/"/g, '""')}"`);
		csvRows.push(row.join(","));
	}

	const csv = csvRows.join("\n");

	const { filePath } = await dialog.showSaveDialog({
		title: "Salvar CSV",
		defaultPath: "productos.csv",
		filters: [{ name: "CSV", extensions: ["csv"] }],
	});

	if (!filePath) return { ok: false, cancelled: true };

	fs.writeFileSync(filePath, csv);
	return { ok: true, filePath };
});

ipcMain.handle("exportCSVMovement", async () => {
	const items = DAOmovements.getAllMovementsForCSV();

	const headers = ["id", "produto", "tipo", "quantidade", "data", "descricao"];
	const csvRows = [];
	csvRows.push(headers.join(","));

	for (const item of items) {
		const row = headers.map(h => `"${String(item[h] ?? "").replace(/"/g, '""')}"`);
		csvRows.push(row.join(","));
	}

	const csv = csvRows.join("\n");

	const { filePath } = await dialog.showSaveDialog({
		title: "Salvar CSV",
		defaultPath: "movimentos.csv",
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

safeHandle('createProduct', product => DAOproducts.createProduct(product));
safeHandle('updateProduct', product => DAOproducts.updateProduct(product));
safeHandle('deleteProduct', id => DAOproducts.deleteProduct(id));
safeHandle('getProductsPaged', (search, page, pageSize) => {
	return DAOproducts.getProductsPaged(search, page, pageSize);
});
safeHandle('getProductsLazy', () => DAOproducts.getProductsLazy());
safeHandle('lowStock', () => DAOproducts.getLowStock());
safeHandle('deleteMovement', id => DAOmovements.deleteMovement(id));
safeHandle('addMovement', movement => DAOmovements.addMovement(movement));
safeHandle('getMovementPaged', (search, date, page, pageSize) => {
	return DAOmovements.getMovementPaged(search, date, page, pageSize)
});
safeHandle('getMovementsFiltered', filter => DAOmovements.getMovementsFiltered(filter));

