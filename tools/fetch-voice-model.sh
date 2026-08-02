#!/bin/sh
# Fetches the Piper voice model used by gen-voice (not committed; ~63 MB).
set -e
mkdir -p tools/voices
curl -sSL -o tools/voices/amy.onnx https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx
curl -sSL -o tools/voices/amy.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium/en_US-amy-medium.onnx.json
