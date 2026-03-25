# VyaaparMitra Startup Guide

Follow these instructions to start the development environment for both the frontend and backend.

## 1. Backend (FastAPI)

The backend requires a Python virtual environment to manage dependencies properly.

### Steps:
1.  **Navigate to the backend directory**:
    ```powershell
    cd backend
    ```
2.  **Activate the Virtual Environment**:
    *   **Windows (PowerShell)**:
        ```powershell
        .\venv\Scripts\Activate.ps1
        ```
    *   **Windows (Command Prompt)**:
        ```cmd
        .\venv\Scripts\activate.bat
        ```
3.  **Start the Server**:
    ```powershell
    python -m uvicorn main:app --reload --port 8000
    ```
    *The backend will be available at http://localhost:8000*

---

## 2. Frontend (Next.js)

The frontend uses Node.js and npm.

### Steps:
1.  **Navigate to the frontend directory**:
    ```powershell
    cd frontend
    ```
2.  **Start the Development Server**:
    ```powershell
    npm run dev
    ```
    *The frontend will be available at http://localhost:3000*

---

## 💡 Quick Tips
- **Environment Variables**: Ensure you have valid `.env.local` in the `frontend` folder with your database and auth secrets.
- **Stopping Servers**: You can stop either server at any time by pressing `Ctrl + C` in their respective terminals.
- **Port Conflicts**: If port 3000 or 8000 is occupied, the servers may fail to start. Ensure no other instances are running.
