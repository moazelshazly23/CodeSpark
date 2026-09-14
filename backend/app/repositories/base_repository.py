"""
Code Spark - Base Repository Layer
Provides standardized database access patterns with transactional safety
"""
from typing import Dict, List, Any, Optional, Tuple
from app.db.engine import db_engine

class BaseRepository:
    def __init__(self, table_name: str):
        self.table_name = table_name
        self.db = db_engine

    def get_by_id(self, rec_id: str) -> Optional[Dict[str, Any]]:
        return self.db.fetch_one(f"SELECT * FROM {self.table_name} WHERE id = ?", (rec_id,))

    def list_all(
        self,
        filters: Optional[Dict[str, Any]] = None,
        search_field: Optional[str] = None,
        search_query: Optional[str] = None,
        order_by: Optional[str] = None,
        descending: bool = False,
        offset: int = 0,
        limit: Optional[int] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        return self.db.query(
            self.table_name,
            filters=filters,
            search_field=search_field,
            search_query=search_query,
            order_by=order_by,
            descending=descending,
            offset=offset,
            limit=limit
        )

    def create(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self.db.insert(self.table_name, data)

    def update(self, rec_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return self.db.update(self.table_name, rec_id, updates)

    def delete(self, rec_id: str) -> bool:
        return self.db.delete(self.table_name, rec_id)
