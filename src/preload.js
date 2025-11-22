const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
	getProductsPaged: (search, page, pageSize) => ipcRenderer.invoke('products:getPaged', search, page, pageSize),
	createProduct: (p) => ipcRenderer.invoke('products:create', p),
	updateProduct: (p) => ipcRenderer.invoke('products:update', p),
	deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
	lowStock: () => ipcRenderer.invoke('products:lowStock'),
	exportCSV: () => ipcRenderer.invoke("products:exportCSV"),
	getProductsLazy: (search) => ipcRenderer.invoke('products:getLazy', search),
	deleteMovement: (id) => ipcRenderer.invoke('movements:delete', id),
	getMovementPaged: (search, date, page, pageSize) => ipcRenderer.invoke('movements:getPaged', search, date, page, pageSize),
	addMovement: (m) => ipcRenderer.invoke('movements:add', m),
	exportCSVMovement: () => ipcRenderer.invoke("movements:exportCSV"),
	getMovementsFiltered: filter => ipcRenderer.invoke("movements:getFiltered", filter)

});
