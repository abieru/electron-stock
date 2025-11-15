const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getProducts: () => ipcRenderer.invoke('getProducts'),
  createProduct: (p) => ipcRenderer.invoke('createProduct', p),
  updateProduct: (p) => ipcRenderer.invoke('updateProduct', p),
  deleteProduct: (id) => ipcRenderer.invoke('deleteProduct', id),
  addMovement: (m) => ipcRenderer.invoke('addMovement', m),
  getMovements: () => ipcRenderer.invoke('getMovements'),
  lowStock: () => ipcRenderer.invoke('lowStock'),
  exportCSV: () => ipcRenderer.invoke("exportCSV"),
  searchProducts: (text) => ipcRenderer.invoke('searchProducts', text),

});