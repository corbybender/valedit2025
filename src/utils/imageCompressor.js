const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

// Format bytes helper (copied from client-side)
const formatBytes = (bytes, d = 2) =>
  !+bytes
    ? "0 Bytes"
    : ((k) =>
        `${parseFloat(
          (bytes / k ** Math.floor(Math.log(bytes) / Math.log(k))).toFixed(d)
        )} ${
          ["B", "KB", "MB", "GB"][Math.floor(Math.log(bytes) / Math.log(k))]
        }`)(1024);

// Compression parameters
const COMPRESSION_PARAMS = {
  jpeg: { quality: 60 },
  png: { quality: 60 },
  webp: { quality: 60 },
  maxDimension: 1920,
  skipFormats: ["svg", "gif"],
};

async function compressImage(file) {
  const originalSize = file.size;
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
  const filename = path.basename(
    file.originalname,
    path.extname(file.originalname)
  );

  console.log(`[COMPRESSION] Starting compression for ${file.originalname}`);
  console.log(`[COMPRESSION] Original size: ${formatBytes(originalSize)}`);

  // Skip compression for specified formats
  if (COMPRESSION_PARAMS.skipFormats.includes(ext)) {
    console.log(
      `[COMPRESSION] Skipping compression for ${ext.toUpperCase()} file`
    );
    return file;
  }

  try {
    const buffer = await sharp(file.buffer)
      .resize({
        width: COMPRESSION_PARAMS.maxDimension,
        height: COMPRESSION_PARAMS.maxDimension,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toFormat(ext, COMPRESSION_PARAMS[ext] || {})
      .toBuffer();

    const compressedSize = buffer.length;
    const reduction = (
      ((originalSize - compressedSize) / originalSize) *
      100
    ).toFixed(1);

    console.log(
      `[COMPRESSION] Compressed ${file.originalname}: ${formatBytes(
        originalSize
      )} → ${formatBytes(compressedSize)}`
    );
    console.log(`[COMPRESSION] Reduction: ${reduction}%`);

    return {
      originalname: `${filename}.${ext}`,
      buffer,
      size: compressedSize,
      mimetype: file.mimetype,
    };
  } catch (error) {
    console.error(
      `[COMPRESSION ERROR] Failed to compress ${file.originalname}:`,
      error
    );
    console.log("[COMPRESSION] Falling back to original file");
    return file;
  }
}

module.exports = { compressImage };
