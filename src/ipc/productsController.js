const { ipcMain, dialog } = require("electron");
const fs = require("fs");

function safeHandle(channel, handler) {
	ipcMain.handle(channel, async (event, ...args) => {
		try {
			return await handler(...args);
		} catch (err) {
			console.error(`Error en IPC "${channel}":`, err);
			return { error: true, message: err.message };
		}
	});
}

function registerProductsController(service) {
	ipcMain.handle("products:exportCSV", async () => {
		const items = service.getAllForCSV();

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

		if (!filePath) {
			return { ok: false, cancelled: true };
		}

		fs.writeFileSync(filePath, csv);
		return { ok: true, filePath };
	});

	safeHandle('products:create', product => service.create(product));
	safeHandle('products:update', product => service.update(product));
	safeHandle('products:delete', id => service.delete(id));
	safeHandle('products:getPaged', (search, page, pageSize) => {
		return service.getPaged(search, page, pageSize);
	});
	safeHandle('products:getLazy', search => 
		service.getLazy(search));
	safeHandle('products:lowStock', () => service.getLowStock());
	
}

module.exports = { registerProductsController };
