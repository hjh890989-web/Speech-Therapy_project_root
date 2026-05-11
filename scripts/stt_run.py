import sys, os, subprocess, imageio_ffmpeg
from faster_whisper import WhisperModel
avi = sys.argv[1]
out = sys.argv[2]
suf = sys.argv[3] if len(sys.argv) > 3 else 'B'
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
os.environ['PATH'] = os.path.dirname(ffmpeg) + os.pathsep + os.environ.get('PATH', '')
wav = f'_audio_{suf}.wav'
print(f'Converting...', flush=True)
subprocess.run([ffmpeg, '-y', '-i', avi, '-ar', '16000', '-ac', '1', wav], capture_output=True)
print(f'WAV: {os.path.getsize(wav)/1024/1024:.1f}MB', flush=True)
model = WhisperModel('base', device='cpu', compute_type='int8')
segments, info = model.transcribe(wav, language='ko', beam_size=5, vad_filter=True,
                                  vad_parameters=dict(min_silence_duration_ms=1000))
with open(out, 'w', encoding='utf-8') as f:
    f.write(f'# STT Result\nSource: {avi}\nDuration: {info.duration:.1f}s\n\n')
    for seg in segments:
        f.write(f'[{seg.start:7.1f}-{seg.end:7.1f}] {seg.text}\n')
os.remove(wav)
print(f'Done', flush=True)
