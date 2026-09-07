import test from "node:test";
import assert from "node:assert/strict";
import { imageDimensions } from "../scripts/lib/image-dimensions.mjs";

test("reads PNG dimensions", () => {
  const buffer = Buffer.alloc(24);
  buffer.write("PNG", 1, "ascii");
  buffer.writeUInt32BE(512, 16);
  buffer.writeUInt32BE(256, 20);
  assert.deepEqual(imageDimensions(buffer), { width: 512, height: 256 });
});

test("reads lossless WebP dimensions", () => {
  const buffer = Buffer.alloc(25);
  buffer.write("RIFF", 0, "ascii");
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8L", 12, "ascii");
  buffer[20] = 0x2f;
  buffer[21] = 0xff;
  buffer[22] = 0x01;
  buffer[23] = 0xff;
  buffer[24] = 0x03;
  assert.deepEqual(imageDimensions(buffer), { width: 512, height: 4093 });
});
