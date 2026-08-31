"""
Code Spark - Pure Python PostgreSQL Wire-Protocol Client (Protocol 3.0)
Full DB-API 2.0 (PEP 249) Compliant Implementation for Zero-Dependency Production Environments.
"""

import socket
import struct
import hashlib
import hmac
import base64
import os
import re
import json
import datetime
from typing import Dict, Any, List, Optional, Tuple, Union, Sequence

# PostgreSQL Type OIDs
OID_BOOL = 16
OID_INT8 = 20
OID_INT2 = 21
OID_INT4 = 23
OID_TEXT = 25
OID_JSON = 114
OID_FLOAT4 = 700
OID_FLOAT8 = 701
OID_VARCHAR = 1043
OID_TIMESTAMP = 1114
OID_TIMESTAMPTZ = 1184
OID_JSONB = 3802

class PostgresError(Exception):
    """Base exception for PostgreSQL database errors."""
    def __init__(self, message: str, code: Optional[str] = None, detail: Optional[str] = None):
        super().__init__(message)
        self.code = code
        self.detail = detail

class Row(dict):
    """Dictionary-like row with support for integer indexing and key access."""
    def __init__(self, items_or_dict, columns=None):
        if columns is not None and isinstance(items_or_dict, (list, tuple)):
            super().__init__(zip(columns, items_or_dict))
            self._values = list(items_or_dict)
            self._columns = list(columns)
        elif isinstance(items_or_dict, dict):
            super().__init__(items_or_dict)
            self._values = list(items_or_dict.values())
            self._columns = list(items_or_dict.keys())
        else:
            super().__init__(items_or_dict)
            self._values = list(self.values())
            self._columns = list(self.keys())

    def __getitem__(self, key):
        if isinstance(key, int):
            return self._values[key]
        return super().__getitem__(key)

    def get(self, key, default=None):
        if isinstance(key, int):
            if 0 <= key < len(self._values):
                return self._values[key]
            return default
        return super().get(key, default)

    def keys(self):
        return super().keys()

    def values(self):
        return self._values

    def items(self):
        return super().items()

def _decode_pg_value(val_str: Optional[str], type_oid: int) -> Any:
    """Decode string representation from PostgreSQL text format into Python types."""
    if val_str is None:
        return None
    
    if type_oid == OID_BOOL:
        return val_str.lower() in ('t', 'true', '1', 'yes')
    elif type_oid in (OID_INT2, OID_INT4, OID_INT8):
        try:
            return int(val_str)
        except ValueError:
            return val_str
    elif type_oid in (OID_FLOAT4, OID_FLOAT8):
        try:
            return float(val_str)
        except ValueError:
            return val_str
    elif type_oid in (OID_JSON, OID_JSONB):
        try:
            return json.loads(val_str)
        except Exception:
            return val_str
    return val_str

def _encode_pg_param(val: Any) -> str:
    """Safely escape and encode Python values for SQL queries."""
    if val is None:
        return "NULL"
    elif isinstance(val, bool):
        return "TRUE" if val else "FALSE"
    elif isinstance(val, (int, float)):
        return str(val)
    elif isinstance(val, (dict, list)):
        serialized = json.dumps(val, ensure_ascii=False)
        escaped = serialized.replace("'", "''")
        return f"'{escaped}'"
    elif isinstance(val, datetime.datetime):
        if val.tzinfo is None:
            val = val.replace(tzinfo=datetime.timezone.utc)
        return f"'{val.isoformat()}'"
    else:
        escaped = str(val).replace("'", "''").replace("\\", "\\\\")
        return f"'{escaped}'"

class PostgresCursor:
    def __init__(self, connection: 'PostgresConnection'):
        self.connection = connection
        self.description = None
        self._rows: List[Row] = []
        self._pos = 0
        self.rowcount = -1

    def execute(self, query: str, params: Optional[Union[Sequence[Any], Dict[str, Any]]] = None) -> 'PostgresCursor':
        self.description = None
        self._rows = []
        self._pos = 0
        self.rowcount = -1

        # Format and interpolate parameters safely
        sql = self._interpolate(query, params)
        cols, rows, count = self.connection._send_simple_query(sql)
        self.rowcount = count
        if cols:
            self.description = [(c, None, None, None, None, None, None) for c in cols]
            self._rows = [Row(r, columns=cols) for r in rows]
        return self

    def _interpolate(self, query: str, params: Optional[Union[Sequence[Any], Dict[str, Any]]]) -> str:
        if params is None:
            return query
        
        # Replace ? with %s if positional params passed with ?
        if isinstance(params, (list, tuple)):
            if not params:
                return query
            
            # Tokenize SQL keeping strings intact
            parts = []
            param_idx = 0
            in_quote = False
            quote_char = None
            i = 0
            n = len(query)
            
            while i < n:
                ch = query[i]
                if in_quote:
                    parts.append(ch)
                    if ch == quote_char:
                        if i + 1 < n and query[i+1] == quote_char:
                            parts.append(query[i+1])
                            i += 1
                        else:
                            in_quote = False
                else:
                    if ch in ("'", '"'):
                        in_quote = True
                        quote_char = ch
                        parts.append(ch)
                    elif ch == '?' or (ch == '%' and i + 1 < n and query[i+1] == 's'):
                        if param_idx < len(params):
                            parts.append(_encode_pg_param(params[param_idx]))
                            param_idx += 1
                            if ch == '%':
                                i += 1 # skip 's'
                        else:
                            parts.append(ch)
                    else:
                        parts.append(ch)
                i += 1
            return "".join(parts)
        elif isinstance(params, dict):
            # Named parameters :name or %(name)s
            sql = query
            for k, v in params.items():
                pattern = rf":{k}\b|\%\({k}\)s"
                sql = re.sub(pattern, _encode_pg_param(v), sql)
            return sql
        return query

    def fetchone(self) -> Optional[Row]:
        if self._pos < len(self._rows):
            row = self._rows[self._pos]
            self._pos += 1
            return row
        return None

    def fetchall(self) -> List[Row]:
        remaining = self._rows[self._pos:]
        self._pos = len(self._rows)
        return remaining

    def fetchmany(self, size: int = 1) -> List[Row]:
        res = self._rows[self._pos : self._pos + size]
        self._pos += len(res)
        return res

    def close(self):
        self._rows = []
        self._pos = 0

class PostgresConnection:
    """PostgreSQL 3.0 TCP Protocol Socket Connection."""
    def __init__(self, host: str = "localhost", port: int = 5432, user: str = "postgres",
                 password: str = "", database: str = "codespark", timeout: float = 15.0):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database
        self.timeout = timeout
        self.sock: Optional[socket.socket] = None
        self.server_params: Dict[str, str] = {}
        self.in_transaction = False
        self._connect()

    def _connect(self):
        self.sock = socket.create_connection((self.host, self.port), timeout=self.timeout)
        self.sock.settimeout(self.timeout)
        
        # Build StartupMessage (Protocol 3.0)
        params = {
            "user": self.user,
            "database": self.database,
            "client_encoding": "UTF8",
            "application_name": "CodeSparkFastAPI"
        }
        body = b""
        for k, v in params.items():
            body += k.encode("utf-8") + b"\x00" + v.encode("utf-8") + b"\x00"
        body += b"\x00"
        
        length = 4 + 4 + len(body)
        msg = struct.pack("!II", length, 196608) + body
        self.sock.sendall(msg)
        self._handle_auth()

    def _handle_auth(self):
        while True:
            msg_type, length, payload = self._read_message()
            if msg_type == b'R': # Authentication
                auth_type = struct.unpack("!I", payload[:4])[0]
                if auth_type == 0: # AuthenticationOk
                    continue
                elif auth_type == 3: # Cleartext
                    resp = b'p' + struct.pack("!I", 4 + len(self.password) + 1) + self.password.encode("utf-8") + b"\x00"
                    self.sock.sendall(resp)
                elif auth_type == 5: # MD5
                    salt = payload[4:8]
                    hash1 = hashlib.md5((self.password + self.user).encode("utf-8")).hexdigest()
                    hash2 = "md5" + hashlib.md5((hash1.encode("utf-8") + salt)).hexdigest()
                    resp = b'p' + struct.pack("!I", 4 + len(hash2) + 1) + hash2.encode("utf-8") + b"\x00"
                    self.sock.sendall(resp)
                else:
                    raise PostgresError(f"Unsupported authentication method: {auth_type}")
            elif msg_type == b'S': # ParameterStatus
                null_pos = payload.find(b'\x00')
                if null_pos != -1:
                    key = payload[:null_pos].decode("utf-8", errors="ignore")
                    val = payload[null_pos+1:-1].decode("utf-8", errors="ignore")
                    self.server_params[key] = val
            elif msg_type == b'K': # BackendKeyData
                pass
            elif msg_type == b'Z': # ReadyForQuery
                break
            elif msg_type == b'E': # ErrorResponse
                err = self._parse_error(payload)
                raise PostgresError(err)

    def _read_exact(self, num_bytes: int) -> bytes:
        data = bytearray()
        while len(data) < num_bytes:
            chunk = self.sock.recv(num_bytes - len(data))
            if not chunk:
                raise PostgresError("PostgreSQL connection closed unexpectedly by server.")
            data.extend(chunk)
        return bytes(data)

    def _read_message(self) -> Tuple[bytes, int, bytes]:
        msg_type = self._read_exact(1)
        len_bytes = self._read_exact(4)
        length = struct.unpack("!I", len_bytes)[0]
        payload = self._read_exact(length - 4)
        return msg_type, length, payload

    def _parse_error(self, payload: bytes) -> str:
        idx = 0
        fields = {}
        while idx < len(payload) - 1:
            code = chr(payload[idx])
            null_pos = payload.find(b'\x00', idx + 1)
            if null_pos == -1:
                break
            val = payload[idx+1:null_pos].decode("utf-8", errors="replace")
            fields[code] = val
            idx = null_pos + 1
        msg = fields.get('M', 'Unknown error')
        detail = fields.get('D')
        code = fields.get('C')
        res = f"PostgreSQL Error [{code}]: {msg}"
        if detail:
            res += f" | Detail: {detail}"
        return res

    def _send_simple_query(self, sql: str) -> Tuple[List[str], List[List[Any]], int]:
        sql_bytes = sql.encode("utf-8") + b"\x00"
        msg = b'Q' + struct.pack("!I", 4 + len(sql_bytes)) + sql_bytes
        self.sock.sendall(msg)
        
        columns = []
        col_types = []
        rows = []
        row_count = -1

        while True:
            msg_type, length, payload = self._read_message()
            if msg_type == b'T': # RowDescription
                num_fields = struct.unpack("!H", payload[:2])[0]
                offset = 2
                columns = []
                col_types = []
                for _ in range(num_fields):
                    null_pos = payload.find(b'\x00', offset)
                    col_name = payload[offset:null_pos].decode("utf-8", errors="replace")
                    # table_oid(4), col_idx(2), type_oid(4), type_size(2), type_mod(4), format(2)
                    type_oid = struct.unpack("!I", payload[null_pos+7:null_pos+11])[0]
                    columns.append(col_name)
                    col_types.append(type_oid)
                    offset = null_pos + 19
            elif msg_type == b'D': # DataRow
                num_cols = struct.unpack("!H", payload[:2])[0]
                offset = 2
                row = []
                for idx in range(num_cols):
                    col_len = struct.unpack("!i", payload[offset:offset+4])[0]
                    offset += 4
                    if col_len == -1:
                        val = None
                    else:
                        val_str = payload[offset:offset+col_len].decode("utf-8", errors="replace")
                        val = _decode_pg_value(val_str, col_types[idx] if idx < len(col_types) else OID_TEXT)
                        offset += col_len
                    row.append(val)
                rows.append(row)
            elif msg_type == b'C': # CommandComplete
                tag = payload[:-1].decode("utf-8", errors="ignore")
                parts = tag.split()
                if parts and parts[-1].isdigit():
                    row_count = int(parts[-1])
            elif msg_type == b'Z': # ReadyForQuery
                break
            elif msg_type == b'E': # ErrorResponse
                err = self._parse_error(payload)
                raise PostgresError(err)

        return columns, rows, row_count

    def cursor(self) -> PostgresCursor:
        return PostgresCursor(self)

    def commit(self):
        self._send_simple_query("COMMIT")
        self.in_transaction = False

    def rollback(self):
        try:
            self._send_simple_query("ROLLBACK")
        except Exception:
            pass
        self.in_transaction = False

    def close(self):
        if self.sock:
            try:
                self.sock.sendall(b'X\x00\x00\x00\x04')
                self.sock.close()
            except Exception:
                pass
            self.sock = None

    def is_alive(self) -> bool:
        if not self.sock:
            return False
        try:
            self._send_simple_query("SELECT 1")
            return True
        except Exception:
            return False
