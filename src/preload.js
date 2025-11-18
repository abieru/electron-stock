const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
	getProducts: () => ipcRenderer.invoke('getProducts'),
	getProductsPaged: (search, page, pageSize) => ipcRenderer.invoke('getProductsPaged', search, page, pageSize),
	getMovementPaged: (search, date, page, pageSize) => ipcRenderer.invoke('getMovementPaged', search, date, page, pageSize),
	createProduct: (p) => ipcRenderer.invoke('createProduct', p),
	updateProduct: (p) => ipcRenderer.invoke('updateProduct', p),
	deleteProduct: (id) => ipcRenderer.invoke('deleteProduct', id),
	addMovement: (m) => ipcRenderer.invoke('addMovement', m),
	lowStock: () => ipcRenderer.invoke('lowStock'),
	exportCSV: () => ipcRenderer.invoke("exportCSV"),
	exportCSVMovement: () => ipcRenderer.invoke("exportCSVMovement"),
	searchProducts: (text) => ipcRenderer.invoke('searchProducts', text),
	getProductsLazy: () => ipcRenderer.invoke('getProductsLazy'),
});