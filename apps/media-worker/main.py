import os
import json
import redis
import time
import logging
import tempfile
import subprocess
from minio import Minio
from PIL import Image
import io
import requests

# Setup Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("media-worker")

# Load config from env
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT', 'localhost:9000').replace('http://', '').replace('https://', '')
MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY', 'admin')
MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY', 'password')
MINIO_BUCKET = os.getenv('MINIO_BUCKET', 'media')
MEDIA_SERVICE_URL = os.getenv('MEDIA_SERVICE_URL', 'http://localhost:3003')

# Setup clients
try:
    r = redis.from_url(REDIS_URL)
    mc = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False
    )
    logger.info("Connected to Redis and MinIO")
except Exception as e:
    logger.error(f"Initialization failed: {e}")

def update_status(media_id, status, metadata=None):
    """Notify media-service about the progress"""
    try:
        url = f"{MEDIA_SERVICE_URL}/media/{media_id}/status"
        payload = {"status": status, "metadata": metadata or {}}
        if metadata and "thumbnail" in metadata:
            payload["thumbnail_path"] = metadata["thumbnail"]
        requests.post(url, json=payload) 
        logger.info(f"Updated status for {media_id} to {status} via API")
    except Exception as e:
        logger.error(f"Failed to update status for {media_id}: {e}")

def get_metadata(file_path):
    """Extract metadata using ffprobe"""
    try:
        cmd = [
            'ffprobe', '-v', 'quiet', '-print_format', 'json',
            '-show_format', '-show_streams', file_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return json.loads(result.stdout)
    except Exception as e:
        logger.error(f"Failed to get metadata: {e}")
        return {}

def process_image(media_id, storage_path):
    logger.info(f"Processing image {media_id}...")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.tmp') as tmp:
        tmp_name = tmp.name

    try:
        mc.fget_object(MINIO_BUCKET, storage_path, tmp_name)
        
        img = Image.open(tmp_name)
        width, height = img.size
        img_format = img.format
        
        # Create Thumbnail
        img.thumbnail((300, 300))
        thumb_io = io.BytesIO()
        img.save(thumb_io, format='WEBP', quality=80)
        thumb_io.seek(0)
        img.close()
        
        thumb_name = f"thumbnails/{media_id}_300x300.webp"
        thumb_data = thumb_io.getvalue()
        mc.put_object(
            MINIO_BUCKET,
            thumb_name,
            io.BytesIO(thumb_data),
            len(thumb_data),
            content_type='image/webp'
        )
        
        return {
            "thumbnail": thumb_name,
            "width": width,
            "height": height,
            "format": img_format
        }
    finally:
        try:
            os.unlink(tmp_name)
        except: pass


def process_video(media_id, storage_path):
    logger.info(f"Processing video {media_id}...")
    
    # Create temp file path without keeping it open (Windows file locking fix)
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_in:
        tmp_in_name = tmp_in.name
    
    tmp_thumb = tempfile.mktemp(suffix='.jpg')
    hls_dir = tempfile.mkdtemp()
    
    try:
        mc.fget_object(MINIO_BUCKET, storage_path, tmp_in_name)
        
        # 0. Get Metadata
        metadata = get_metadata(tmp_in_name)
        
        # 1. Extract Thumbnail
        subprocess.run([
            'ffmpeg', '-y', '-i', tmp_in_name, 
            '-ss', '00:00:01', '-vframes', '1', 
            tmp_thumb
        ], check=True, capture_output=True)
        
        thumb_name = f"thumbnails/{media_id}.jpg"
        mc.fput_object(MINIO_BUCKET, thumb_name, tmp_thumb, content_type='image/jpeg')

        # 2. HLS Transcoding (Basic)
        hls_playlist = os.path.join(hls_dir, 'index.m3u8')
        
        subprocess.run([
            'ffmpeg', '-y', '-i', tmp_in_name,
            '-profile:v', 'baseline', '-level', '3.0',
            '-s', '1280x720', '-start_number', '0',
            '-hls_time', '10', '-hls_list_size', '0',
            '-f', 'hls', hls_playlist
        ], check=True, capture_output=True)

        # 3. Upload HLS Segments
        for root, dirs, files in os.walk(hls_dir):
            for file in files:
                local_path = os.path.join(root, file)
                remote_path = f"hls/{media_id}/{file}"
                mc.fput_object(MINIO_BUCKET, remote_path, local_path)

        return {
            "thumbnail": thumb_name,
            "hls_path": f"hls/{media_id}/index.m3u8",
            "metadata": metadata,
            "type": "video"
        }
    finally:
        import shutil
        for p in [tmp_in_name, tmp_thumb]:
            try: os.unlink(p)
            except: pass
        try: shutil.rmtree(hls_dir)
        except: pass

def process_audio(media_id, storage_path):
    logger.info(f"Processing audio {media_id}...")
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.tmp') as tmp_in:
        tmp_in_name = tmp_in.name
    
    tmp_out = tempfile.mktemp(suffix='.mp3')
    
    try:
        mc.fget_object(MINIO_BUCKET, storage_path, tmp_in_name)
        
        metadata = get_metadata(tmp_in_name)
        
        # Transcode to MP3 if not already
        subprocess.run([
            'ffmpeg', '-y', '-i', tmp_in_name,
            '-codec:a', 'libmp3lame', '-qscale:a', '2',
            tmp_out
        ], check=True, capture_output=True)
        
        remote_path = f"processed/{media_id}.mp3"
        mc.fput_object(MINIO_BUCKET, remote_path, tmp_out, content_type='audio/mpeg')
        
        return {
            "processed_path": remote_path,
            "metadata": metadata,
            "type": "audio"
        }
    finally:
        for p in [tmp_in_name, tmp_out]:
            try: os.unlink(p)
            except: pass

def process_job(job_data):
    data = job_data.get('data', {})
    media_id = data.get('mediaId')
    storage_path = data.get('storagePath')
    mime_type = data.get('mimeType', '')

    update_status(media_id, 'processing')

    try:
        metadata = {}
        if mime_type.startswith('image/'):
            metadata = process_image(media_id, storage_path)
        elif mime_type.startswith('video/'):
            metadata = process_video(media_id, storage_path)
        elif mime_type.startswith('audio/'):
            metadata = process_audio(media_id, storage_path)
        else:
            # Generic file processing (just extract basic info if possible)
            metadata = {"type": "file"}
        
        update_status(media_id, 'ready', metadata)
        logger.info(f"Job completed for {media_id}")
    except Exception as e:
        logger.error(f"Job failed for {media_id}: {e}")
        update_status(media_id, 'failed', {"error": str(e)})

def main():
    logger.info("Advanced Media Worker (Python) started...")
    queue_name = "bull:media-processing:wait"
    
    while True:
        try:
            item = r.blpop(queue_name, timeout=10)
            if item:
                # BullMQ stores job ID in the wait list, actual data in a hash key
                job_id = item[1]
                if isinstance(job_id, bytes):
                    job_id = job_id.decode('utf-8')
                
                job_key = f"bull:media-processing:{job_id}"
                job_hash = r.hgetall(job_key)
                
                if not job_hash:
                    logger.warning(f"Job {job_id} not found in Redis hash")
                    continue
                
                data_raw = job_hash.get(b'data') or job_hash.get('data')
                if not data_raw:
                    logger.warning(f"Job {job_id} has no data field")
                    continue
                
                if isinstance(data_raw, bytes):
                    data_raw = data_raw.decode('utf-8')
                
                job_data = {"data": json.loads(data_raw)}
                logger.info(f"Processing job {job_id}: {job_data}")
                process_job(job_data)
        except Exception as e:
            logger.error(f"Worker error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()
