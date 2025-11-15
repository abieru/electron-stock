# electron-stock
APP: Inventario local (Electron + SQLite)

requirements:

- Node.js instalado (https://nodejs.org)

- [link de cosas del vs c++ ](https://aka.ms/vs/17/release/vs_BuildTools.exe)

- Herramientas de compilación de C++ de Visual Studio 2022

- Windows 11 SDK (10.0.22621.0)

- Windows 10 SDK (10.0.19041.0)

- Herramientas de CMake

- Características principales de C++

- administrador de paquetes vcpkg

- MSVC v143 (IMPORTANTE)

npm scripts:

- run this one `npm install better-sqlite3 --build-from-source --runtime=electron --dist-url=https://electronjs.org/headers --target=26.6.10 --msvs_version=2022`

- `npx electron-rebuild`
