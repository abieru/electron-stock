const Database = require("better-sqlite3");
const path = require("path");
const { app } = require("electron");

class DB {
    constructor() {
        const file = path.join(app.getPath("userData"), "inventario.db");

        this.db = new Database(file);

        this.db.pragma("journal_mode = WAL");
        this.db.pragma("synchronous = NORMAL");
        this.db.pragma("cache_size = -8000");
        this.db.pragma("temp_store = MEMORY");
        this.db.pragma("foreign_keys = ON");
    }

    static getInstance() {
        if (!DB.instance) {
            DB.instance = new DB();
        }
        return DB.instance.db;
    }
}

module.exports = DB;
