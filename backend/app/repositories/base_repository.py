"""
Code Spark - Base Repository
"""
from typing import Dict, Any, Optional
from app.db.engine import db_engine

class BaseRepository:
    table_name: str = ""

    @classmethod
    def get_by_id(cls, rec_id: str) -> Optional[Dict[str, Any]]:
        return db_engine.fetch_one(f"SELECT * FROM {cls.table_name} WHERE id = ?", (rec_id,))

    @classmethod
    def create(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        return db_engine.insert(cls.table_name, data)

    @classmethod
    def update(cls, rec_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return db_engine.update(cls.table_name, rec_id, updates)

    @classmethod
    def delete(cls, rec_id: str) -> bool:
        return db_engine.delete(cls.table_name, rec_id)
