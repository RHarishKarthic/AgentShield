"""
File Storage Microservice API.

Provides file read and write operations for AI agents with simulated secure virtual storage.
"""

from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="File Storage Service",
    description="Microservice for reading and writing files.",
    version="1.0.0",
)

# In-memory virtual file system
VIRTUAL_FILES: dict[str, dict[str, Any]] = {
    "/data/reports/q1_summary.txt": {
        "path": "/data/reports/q1_summary.txt",
        "content": "Q1 Performance: Revenue +15%, Customer Acquisition +22%.",
        "size_bytes": 56,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    "/data/public/readme.txt": {
        "path": "/data/public/readme.txt",
        "content": "Welcome to Enterprise Public Data Store.",
        "size_bytes": 41,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    "/etc/shadow": {
        "path": "/etc/shadow",
        "content": "root:$6$encryptedpasswordhash:::...",
        "size_bytes": 45,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
}


class FileReadRequest(BaseModel):
    file_path: str = Field(..., description="Path to the file to read")


class FileWriteRequest(BaseModel):
    file_path: str = Field(..., description="Path to write the file to")
    content: str = Field(..., description="File content to save")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "file_service"}


@app.get("/files")
async def list_files() -> list[dict[str, Any]]:
    """List all available virtual files."""
    return [
        {"path": v["path"], "size_bytes": v["size_bytes"], "updated_at": v["updated_at"]}
        for v in VIRTUAL_FILES.values()
    ]


@app.post("/read")
async def read_file(req: FileReadRequest) -> dict[str, Any]:
    """Read file content from storage."""
    path = req.file_path.strip()
    if path not in VIRTUAL_FILES:
        raise HTTPException(
            status_code=404,
            detail=f"File not found at path: {path}",
        )

    file_record = VIRTUAL_FILES[path]
    return {
        "status": "success",
        "file_path": path,
        "content": file_record["content"],
        "size_bytes": file_record["size_bytes"],
    }


@app.post("/write")
async def write_file(req: FileWriteRequest) -> dict[str, Any]:
    """Write or overwrite file content in storage."""
    path = req.file_path.strip()
    if not path:
        raise HTTPException(status_code=400, detail="file_path cannot be empty")

    VIRTUAL_FILES[path] = {
        "path": path,
        "content": req.content,
        "size_bytes": len(req.content.encode("utf-8")),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    return {
        "status": "success",
        "file_path": path,
        "size_bytes": len(req.content.encode("utf-8")),
        "message": f"Successfully wrote {len(req.content)} characters to {path}",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8003)
