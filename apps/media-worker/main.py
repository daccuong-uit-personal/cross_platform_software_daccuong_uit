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
    
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        mc.fget_object(MINIO_BUCKET, storage_path, tmp.name)
        
        img = Image.open(tmp.name)
        width, height = img.size
        
        # Create Thumbnail
        img.thumbnail((300, 300))
        thumb_io = io.BytesIO()
        img.save(thumb_io, format='WEBP', quality=80)
        thumb_io.seek(0)
        
        thumb_name = f"thumbnails/{media_id}_300x300.webp"
        mc.put_object(
            MINIO_BUCKET,
            thumb_name,
            thumb_io,
            len(thumb_io.getvalue()),
            content_type='image/webp'
        )
        
        os.unlink(tmp.name)
        return {
            "thumbnail": thumb_name,
            "width": width,
            "height": height,
            "format": img.format
        }

def process_video(media_id, storage_path):
    logger.info(f"Processing video {media_id}...")
    
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_in:
        mc.fget_object(MINIO_BUCKET, storage_path, tmp_in.name)
        
        # 0. Get Metadata
        metadata = get_metadata(tmp_in.name)
        
        # 1. Extract Thumbnail
        tmp_thumb = tempfile.mktemp(suffix='.jpg')
        subprocess.run([
            'ffmpeg', '-y', '-i', tmp_in.name, 
            '-ss', '00:00:01', '-vframes', '1', 
            tmp_thumb
        ], check=True, capture_output=True)
        
        thumb_name = f"thumbnails/{media_id}.jpg"
        mc.fput_object(MINIO_BUCKET, thumb_name, tmp_thumb, content_type='image/jpeg')

        # 2. HLS Transcoding (Basic)
        hls_dir = tempfile.mkdtemp()
        hls_playlist = os.path.join(hls_dir, 'index.m3u8')
        
        subprocess.run([
            'ffmpeg', '-y', '-i', tmp_in.name,
            '-profile:v', 'baseline', '-level', '3.0',
            '-s', '1280x720', '-start_number', '0',
            '-hls_time', '10', '-hls_list_size', '0',
            '-f', 'hls', hls_playlist
        ], check=True, capture_output=True)

        # 3. Upload HLS Segments
        uploaded_files = []
        for root, dirs, files in os.walk(hls_dir):
            for file in files:
                local_path = os.path.join(root, file)
                remote_path = f"hls/{media_id}/{file}"
                mc.fput_object(MINIO_BUCKET, remote_path, local_path)
                uploaded_files.append(remote_path)

        # Cleanup
        try:
            os.unlink(tmp_in.name)
            os.unlink(tmp_thumb)
            import shutil
            shutil.rmtree(hls_dir)
        except: pass

        return {
            "thumbnail": thumb_name,
            "hls_path": f"hls/{media_id}/index.m3u8",
            "metadata": metadata,
            "type": "video"
        }

def process_audio(media_id, storage_path):
    logger.info(f"Processing audio {media_id}...")
    
    with tempfile.NamedTemporaryFile(delete=False) as tmp_in:
        mc.fget_object(MINIO_BUCKET, storage_path, tmp_in.name)
        
        metadata = get_metadata(tmp_in.name)
        
        # Transcode to MP3 if not already
        tmp_out = tempfile.mktemp(suffix='.mp3')
        subprocess.run([
            'ffmpeg', '-y', '-i', tmp_in.name,
            '-codec:a', 'libmp3lame', '-qscale:a', '2',
            tmp_out
        ], check=True, capture_output=True)
        
        remote_path = f"processed/{media_id}.mp3"
        mc.fput_object(MINIO_BUCKET, remote_path, tmp_out, content_type='audio/mpeg')
        
        os.unlink(tmp_in.name)
        os.unlink(tmp_out)
        
        return {
            "processed_path": remote_path,
            "metadata": metadata,
            "type": "audio"
        }

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
            job = r.blpop(queue_name, timeout=10)
            if job:
                job_data = json.loads(job[1])
                process_job(job_data)
        except Exception as e:
            logger.error(f"Worker error: {e}")
            time.sleep(2)

if __name__ == "__main__":
    main()
