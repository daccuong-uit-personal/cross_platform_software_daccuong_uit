import os
import json
import redis
import time
import logging
import tempfile
import subprocess
import shutil
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

def update_status(media_id, status, metadata=None, thumbnail_path=None, storage_path=None, fallback_url=None):
    """Notify media-service about the progress"""
    try:
        url = f"{MEDIA_SERVICE_URL}/media/{media_id}/status"
        payload = {"status": status, "metadata": metadata or {}}
        if thumbnail_path:
            payload["thumbnail_path"] = thumbnail_path
        if storage_path:
            payload["storage_path"] = storage_path
        if fallback_url:
            payload["fallback_url"] = fallback_url
        requests.post(url, json=payload, timeout=10)
        logger.info(f"Updated status for {media_id} to {status} via API")
    except Exception as e:
        logger.error(f"Failed to update status for {media_id}: {e}")

def extract_clean_metadata(ffprobe_data: dict) -> dict:
    """Extract a clean, compact metadata dict from ffprobe output."""
    fmt = ffprobe_data.get('format', {})
    streams = ffprobe_data.get('streams', [])

    video_stream = next((s for s in streams if s.get('codec_type') == 'video'), None)
    audio_stream = next((s for s in streams if s.get('codec_type') == 'audio'), None)

    duration = None
    if fmt.get('duration'):
        duration = round(float(fmt['duration']), 3)
    elif video_stream and video_stream.get('duration'):
        duration = round(float(video_stream['duration']), 3)

    bitrate = None
    if fmt.get('bit_rate'):
        bitrate = int(fmt['bit_rate'])

    width = video_stream.get('width') if video_stream else None
    height = video_stream.get('height') if video_stream else None

    codec = {}
    if video_stream:
        codec['video'] = video_stream.get('codec_name', 'unknown')
    if audio_stream:
        codec['audio'] = audio_stream.get('codec_name', 'unknown')

    return {
        "width": width,
        "height": height,
        "duration": duration,
        "bitrate": bitrate,
        "codec": codec,
    }

def get_ffprobe_data(file_path):
    """Extract raw ffprobe data."""
    try:
        cmd = [
            'ffprobe', '-v', 'quiet', '-print_format', 'json',
            '-show_format', '-show_streams', file_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        return json.loads(result.stdout)
    except Exception as e:
        logger.error(f"Failed to get ffprobe data: {e}")
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

        clean_meta = {
            "width": width,
            "height": height,
            "duration": None,
            "bitrate": None,
            "codec": {"image": img_format.lower() if img_format else "unknown"},
        }

        return {
            "clean_metadata": clean_meta,
            "thumbnail": thumb_name,
        }
    finally:
        try:
            os.unlink(tmp_name)
        except:
            pass


def process_video(media_id, storage_path):
    logger.info(f"Processing video {media_id}...")

    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_in:
        tmp_in_name = tmp_in.name

    tmp_thumb = tempfile.mktemp(suffix='.jpg')
    hls_dir = tempfile.mkdtemp()

    try:
        mc.fget_object(MINIO_BUCKET, storage_path, tmp_in_name)

        # 0. Get raw ffprobe metadata and extract clean metadata
        ffprobe_data = get_ffprobe_data(tmp_in_name)
        clean_meta = extract_clean_metadata(ffprobe_data)

        # 1. Extract Thumbnail
        subprocess.run([
            'ffmpeg', '-y', '-i', tmp_in_name,
            '-ss', '00:00:01', '-vframes', '1',
            tmp_thumb
        ], check=True, capture_output=True)

        thumb_name = f"thumbnails/{media_id}.jpg"
        mc.fput_object(MINIO_BUCKET, thumb_name, tmp_thumb, content_type='image/jpeg')

        # 2. HLS Transcoding
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
                content_type = 'application/vnd.apple.mpegurl' if file.endswith('.m3u8') else 'video/MP2T'
                mc.fput_object(MINIO_BUCKET, remote_path, local_path, content_type=content_type)

        hls_storage_path = f"hls/{media_id}/index.m3u8"
        clean_meta["hls_path"] = hls_storage_path

        return {
            "clean_metadata": clean_meta,
            "thumbnail": thumb_name,
            "hls_path": hls_storage_path,
            "new_storage_path": hls_storage_path,
        }
    finally:
        for p in [tmp_in_name, tmp_thumb]:
            try:
                os.unlink(p)
            except:
                pass
        try:
            shutil.rmtree(hls_dir)
        except:
            pass

def process_audio(media_id, storage_path):
    logger.info(f"Processing audio {media_id}...")

    with tempfile.NamedTemporaryFile(delete=False, suffix='.tmp') as tmp_in:
        tmp_in_name = tmp_in.name

    tmp_out = tempfile.mktemp(suffix='.mp3')

    try:
        mc.fget_object(MINIO_BUCKET, storage_path, tmp_in_name)

        ffprobe_data = get_ffprobe_data(tmp_in_name)
        clean_meta = extract_clean_metadata(ffprobe_data)

        # Transcode to MP3 if not already
        subprocess.run([
            'ffmpeg', '-y', '-i', tmp_in_name,
            '-codec:a', 'libmp3lame', '-qscale:a', '2',
            tmp_out
        ], check=True, capture_output=True)

        remote_path = f"processed/{media_id}.mp3"
        mc.fput_object(MINIO_BUCKET, remote_path, tmp_out, content_type='audio/mpeg')

        # Delete original
        try:
            mc.remove_object(MINIO_BUCKET, storage_path)
        except Exception as e:
            logger.warning(f"Could not delete original audio {storage_path}: {e}")

        return {
            "clean_metadata": clean_meta,
            "new_storage_path": remote_path,
        }
    finally:
        for p in [tmp_in_name, tmp_out]:
            try:
                os.unlink(p)
            except:
                pass

def process_job(job_data):
    data = job_data.get('data', {})
    media_id = data.get('mediaId')
    storage_path = data.get('storagePath')
    mime_type = data.get('mimeType', '')

    update_status(media_id, 'processing')

    try:
        result = {}
        if mime_type.startswith('image/'):
            result = process_image(media_id, storage_path)
        elif mime_type.startswith('video/'):
            result = process_video(media_id, storage_path)
        elif mime_type.startswith('audio/'):
            result = process_audio(media_id, storage_path)
        else:
            result = {"clean_metadata": {"type": "file"}}

        clean_metadata = result.get("clean_metadata", {})
        thumbnail = result.get("thumbnail")
        new_storage_path = result.get("new_storage_path")

        update_status(
            media_id,
            'ready',
            metadata=clean_metadata,
            thumbnail_path=thumbnail,
            storage_path=new_storage_path,
        )
        logger.info(f"Job completed for {media_id}")
    except Exception as e:
        logger.error(f"Job failed for {media_id}: {e}")
        update_status(media_id, 'failed', {"error": str(e)})

def main():
    logger.info("Media Worker started...")
    queue_name = "bull:media-processing:wait"

    while True:
        try:
            item = r.blpop(queue_name, timeout=10)
            if item:
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
