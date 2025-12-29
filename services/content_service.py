"""
Content management service for corporate events and gallery assets.
"""
import logging
import os
import uuid
from typing import Dict, List, Optional

from flask import current_app
from werkzeug.utils import secure_filename

from database import DatabaseManager

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

def _spaces_config() -> Optional[Dict[str, str]]:
    """Return Spaces config if enabled via env vars."""
    bucket = os.environ.get("SPACES_BUCKET")
    key = os.environ.get("SPACES_KEY") or os.environ.get("SPACES_ACCESS_KEY_ID")
    secret = os.environ.get("SPACES_SECRET") or os.environ.get("SPACES_SECRET_ACCESS_KEY")
    region = os.environ.get("SPACES_REGION", "sgp1")
    if not bucket or not key or not secret:
        return None
    endpoint = os.environ.get("SPACES_ENDPOINT") or f"https://{region}.digitaloceanspaces.com"
    public_base = os.environ.get("SPACES_PUBLIC_BASE") or f"https://{bucket}.{region}.digitaloceanspaces.com"
    prefix = os.environ.get("SPACES_PREFIX", "uploads").strip("/ ")
    return {
        "bucket": bucket,
        "key": key,
        "secret": secret,
        "region": region,
        "endpoint": endpoint,
        "public_base": public_base.rstrip("/"),
        "prefix": prefix,
    }


def _upload_to_spaces(file_storage, subfolder: str, filename: str) -> str:
    """Upload a file to DigitalOcean Spaces and return public URL."""
    cfg = _spaces_config()
    if not cfg:
        raise RuntimeError("Spaces not configured")

    try:
        import boto3  # type: ignore
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("boto3 is required for Spaces uploads") from exc

    session = boto3.session.Session()
    client = session.client(
        "s3",
        region_name=cfg["region"],
        endpoint_url=cfg["endpoint"],
        aws_access_key_id=cfg["key"],
        aws_secret_access_key=cfg["secret"],
    )

    object_key = f"{cfg['prefix']}/{subfolder}/{filename}".lstrip("/")
    content_type = getattr(file_storage, "mimetype", None) or "application/octet-stream"
    # Ensure stream is at beginning
    try:
        file_storage.stream.seek(0)
    except Exception:
        pass

    client.upload_fileobj(
        file_storage.stream,
        cfg["bucket"],
        object_key,
        ExtraArgs={
            "ACL": "public-read",
            "ContentType": content_type,
            "CacheControl": "public, max-age=31536000, immutable",
        },
    )
    return f"{cfg['public_base']}/{object_key}"


def _try_delete_spaces_object(url: str) -> None:
    """Best-effort delete for Spaces URLs created by this app."""
    cfg = _spaces_config()
    if not cfg:
        return
    if not url.startswith(cfg["public_base"] + "/"):
        return

    key = url[len(cfg["public_base"]) + 1 :]
    try:
        import boto3  # type: ignore
    except Exception:  # pragma: no cover
        return

    session = boto3.session.Session()
    client = session.client(
        "s3",
        region_name=cfg["region"],
        endpoint_url=cfg["endpoint"],
        aws_access_key_id=cfg["key"],
        aws_secret_access_key=cfg["secret"],
    )
    try:
        client.delete_object(Bucket=cfg["bucket"], Key=key)
    except Exception as exc:  # pragma: no cover
        logger.warning(f"Could not delete Spaces object {key}: {exc}")


def _is_allowed_file(filename: str) -> bool:
    """Validate file extension for uploads."""
    if not filename:
        return False
    ext = os.path.splitext(filename.lower())[1]
    return ext in ALLOWED_IMAGE_EXTENSIONS


def _save_image(file_storage, subfolder: str) -> str:
    """Persist uploaded image and return static-relative path."""
    if not file_storage or not file_storage.filename:
        raise ValueError("Image is required")

    if not _is_allowed_file(file_storage.filename):
        raise ValueError("Only png, jpg, jpeg, or webp files are allowed")

    safe_name = secure_filename(file_storage.filename)
    ext = os.path.splitext(safe_name)[1]
    filename = f"{uuid.uuid4().hex}{ext}"

    # Production-safe: store in Spaces if configured (shared across instances)
    if _spaces_config():
        return _upload_to_spaces(file_storage, subfolder, filename)

    upload_dir = os.path.join(current_app.root_path, "static", "uploads", subfolder)
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, filename)
    file_storage.save(file_path)

    return os.path.join("uploads", subfolder, filename)


def _remove_image_if_exists(relative_path: Optional[str]) -> None:
    """Remove stored image when deleting records."""
    try:
        if not relative_path:
            return
        if str(relative_path).startswith("http"):
            _try_delete_spaces_object(str(relative_path))
            return
        abs_path = os.path.join(current_app.root_path, "static", relative_path)
        if os.path.exists(abs_path):
            os.remove(abs_path)
    except Exception as exc:  # pragma: no cover - best effort cleanup
        logger.warning(f"Could not remove image {relative_path}: {exc}")


class ContentService:
    """Business logic for corporate events and gallery images."""

    # ---- Corporate Events ----
    @staticmethod
    def add_corporate_event(company_name: str, title: str, description: str, event_image, logo_image=None,
                            event_date: Optional[str] = None) -> Dict:
        """Create a corporate event post with images."""
        if not company_name or not title:
            raise ValueError("Company name and title are required")
        if event_date == "":
            event_date = None

        event_image_path = _save_image(event_image, "corporate")
        logo_image_path = _save_image(logo_image, "corporate") if logo_image and logo_image.filename else None

        query = """
            INSERT INTO corporate_events (company_name, title, description, event_image, logo_image, event_date)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, company_name, title, description, event_image, logo_image, event_date, created_at
        """
        result = DatabaseManager.execute_query(
            query,
            (company_name, title, description, event_image_path, logo_image_path, event_date),
            fetch_one=True
        )
        if not result:
            raise RuntimeError("Database insert failed; please check database connection.")
        return dict(result)

    @staticmethod
    def update_corporate_event(event_id: int, updates: Dict, event_image=None, logo_image=None) -> Optional[Dict]:
        """Update corporate event details and optionally replace images."""
        fields = []
        params = []

        for key in ["company_name", "title", "description", "event_date"]:
            if updates.get(key) not in (None, ""):
                fields.append(f"{key} = %s")
                params.append(updates[key])

        # Handle new images
        current = DatabaseManager.execute_query(
            "SELECT event_image, logo_image FROM corporate_events WHERE id = %s",
            (event_id,),
            fetch_one=True,
        )
        if not current:
            return None

        if event_image and event_image.filename:
            new_path = _save_image(event_image, "corporate")
            fields.append("event_image = %s")
            params.append(new_path)
            _remove_image_if_exists(current.get("event_image"))

        if logo_image and logo_image.filename:
            new_logo_path = _save_image(logo_image, "corporate")
            fields.append("logo_image = %s")
            params.append(new_logo_path)
            _remove_image_if_exists(current.get("logo_image"))

        if not fields:
            return dict(current)

        params.append(event_id)
        query = f"UPDATE corporate_events SET {', '.join(fields)} WHERE id = %s RETURNING *"
        updated = DatabaseManager.execute_query(query, tuple(params), fetch_one=True)
        return dict(updated) if updated else None

    @staticmethod
    def get_corporate_events(limit: Optional[int] = None) -> List[Dict]:
        """Fetch active corporate events ordered by display + recency."""
        base_query = """
            SELECT id, company_name, title, description, event_image, logo_image, event_date, created_at
            FROM corporate_events
            WHERE is_active = TRUE
            ORDER BY display_order DESC, created_at DESC
        """
        if limit:
            base_query += " LIMIT %s"
            rows = DatabaseManager.execute_query(base_query, (limit,))
        else:
            rows = DatabaseManager.execute_query(base_query)
        return [dict(row) for row in rows] if rows else []

    @staticmethod
    def delete_corporate_event(event_id: int) -> bool:
        """Delete corporate event and associated images."""
        fetch_query = "SELECT event_image, logo_image FROM corporate_events WHERE id = %s"
        record = DatabaseManager.execute_query(fetch_query, (event_id,), fetch_one=True)
        if not record:
            return False

        delete_query = "DELETE FROM corporate_events WHERE id = %s"
        result = DatabaseManager.execute_query(delete_query, (event_id,), fetch_all=False)
        if result is not None:
            _remove_image_if_exists(record.get("event_image"))
            _remove_image_if_exists(record.get("logo_image"))
            return True
        return False

    # ---- Gallery ----
    @staticmethod
    def add_gallery_photo(title: str, description: str, image_file) -> Dict:
        """Create gallery entry with uploaded image."""
        image_path = _save_image(image_file, "gallery")
        query = """
            INSERT INTO gallery_photos (title, description, image_path)
            VALUES (%s, %s, %s)
            RETURNING id, title, description, image_path, created_at
        """
        result = DatabaseManager.execute_query(query, (title, description, image_path), fetch_one=True)
        if not result:
            raise RuntimeError("Database insert failed; please check database connection.")
        return dict(result)

    @staticmethod
    def get_gallery_photos() -> List[Dict]:
        """Fetch gallery items ordered for display."""
        query = """
            SELECT id, title, description, image_path, created_at
            FROM gallery_photos
            ORDER BY display_order DESC, created_at DESC
        """
        rows = DatabaseManager.execute_query(query)
        return [dict(row) for row in rows] if rows else []

    @staticmethod
    def delete_gallery_photo(photo_id: int) -> bool:
        """Delete gallery image and remove the stored file."""
        fetch_query = "SELECT image_path FROM gallery_photos WHERE id = %s"
        record = DatabaseManager.execute_query(fetch_query, (photo_id,), fetch_one=True)
        if not record:
            return False

        delete_query = "DELETE FROM gallery_photos WHERE id = %s"
        result = DatabaseManager.execute_query(delete_query, (photo_id,), fetch_all=False)
        if result is not None:
            _remove_image_if_exists(record.get("image_path"))
            return True
        return False
