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

function registerMovementsController(service) {
	ipcMain.handle("movements:exportCSV", async () => {
		const items = service.getAllForCSV();
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

	safeHandle('movements:delete', id => service.delete(id));
	safeHandle('movements:add', movement => service.add(movement));
	safeHandle('movements:getPaged', (search, date, page, pageSize) => service.getPaged(search, date, page, pageSize));
	safeHandle('movements:getFiltered', filter => service.getFiltered(filter));

}

module.exports = { registerMovementsController };