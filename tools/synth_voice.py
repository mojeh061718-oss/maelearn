"""Synthesize voice lines with Piper and encode to mp3 with lameenc.

Usage: python3 tools/synth_voice.py /tmp/voice-manifest.json public/voice
Requires: pip install piper-tts lameenc; model at tools/voices/amy.onnx
(downloaded by tools/fetch-voice-model.sh — not committed, ~63 MB).
"""
import json
import os
import sys
import wave

import lameenc
from piper import PiperVoice, SynthesisConfig

MANIFEST, OUTDIR = sys.argv[1], sys.argv[2]
MODEL = os.environ.get("PIPER_MODEL", "tools/voices/amy.onnx")

voice = PiperVoice.load(MODEL)
items = json.load(open(MANIFEST))
os.makedirs(OUTDIR, exist_ok=True)

done = 0
for it in items:
    out = os.path.join(OUTDIR, it["h"] + ".mp3")
    if os.path.exists(out):
        done += 1
        continue
    tmp = "/tmp/_line.wav"
    with wave.open(tmp, "wb") as w:
        voice.synthesize_wav(it["t"], w, syn_config=SynthesisConfig(length_scale=1.05))
    with wave.open(tmp, "rb") as w:
        rate, nch, frames = w.getframerate(), w.getnchannels(), w.readframes(w.getnframes())
    enc = lameenc.Encoder()
    enc.set_bit_rate(48)
    enc.set_in_sample_rate(rate)
    enc.set_channels(nch)
    enc.set_quality(2)
    data = enc.encode(frames)
    data += enc.flush()
    with open(out, "wb") as f:
        f.write(data)
    done += 1
    if done % 50 == 0:
        print(f"  {done}/{len(items)}")

print(f"synthesized {done} clips -> {OUTDIR}")
