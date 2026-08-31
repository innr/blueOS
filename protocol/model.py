from dataclasses import dataclass, field
from typing import List, Optional

@dataclass(frozen=True)
class Chapter:
    id: str
    book_id: str
    title: str
    duration_ms: int
    size_bytes: int
    checksum: str
    local_uri: Optional[str] = None

@dataclass(frozen=True)
class Book:
    id: str
    title: str
    author: str
    chapters: List[Chapter] = field(default_factory=list)

@dataclass
class TransferTask:
    id: str
    chapter_id: str
    total_bytes: int
    bytes_sent: int = 0
    status: str = "PENDING"
    error_code: Optional[str] = None
