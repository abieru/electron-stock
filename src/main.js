const { app, BrowserWindow } = require("electron");
const DB = require("./database/db");
const path = require("path");
const { runMigrations } = require("./database/migrations");

// DAOs
const ProductsDAO = require("./dao/productsDAO");
const MovementsDAO = require("./dao/movementsDAO");

// Services
const ProductsService = require("./services/ProductsService");
const MovementsService = require("./services/MovementsService");

// Controllers
const { registerProductsController } = require("./ipc/productsController");
const { registerMovementsController } = require("./ipc/movementsController");

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
	mainWindow.webContents.openDevTools();
	mainWindow.on('ready', () => {
		Menu.setApplicationMenu(null);
	});
}

app.whenReady().then(() => {
	const db = DB.getInstance();

	runMigrations(db);

	const productsDAO = new ProductsDAO(db);
	const movDAO = new MovementsDAO(db);

	const productsService = new ProductsService(productsDAO);
	const movementsService = new MovementsService(movDAO);

	registerProductsController(productsService);
	registerMovementsController(movementsService);

	createWindow();
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});