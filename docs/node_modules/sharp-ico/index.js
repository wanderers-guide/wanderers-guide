const fs = require("fs");
const sharp = require("sharp");
const decodeIco = require("decode-ico");
const icoEndec = require("ico-endec");

function decode(buffer) {
  return decodeIco(buffer);
}

function encode(bufferList) {
  return icoEndec.encode(bufferList);
}

function sharpsFromIco(input, options, resolveWithObject = false) {
  const buffer = typeof input === "string" ? fs.readFileSync(input) : input;
  return decodeIco(buffer).map((icon) => {
    const image =
      icon.type === "png"
        ? sharp(icon.data, options || {})
        : sharp(icon.data, {
            ...options,
            raw: {
              width: icon.width,
              height: icon.height,
              channels: 4,
            },
          });
    return resolveWithObject ? Object.assign(icon, { image }) : image;
  });
}

async function resize(imageList, { sizes, resizeOptions }) {
  if (sizes === "default") sizes = [256, 128, 64, 48, 32, 24, 16];
  else if (!Array.isArray(sizes)) {
    return Promise.reject("sizes must be an array of number");
  }
  const resizedList = [];
  const sizeMap = {};
  const imageSizes = [];
  await Promise.all(
    imageList.map((image) => {
      return image.metadata().then(({ width }) => {
        sizeMap[width] = image;
        imageSizes.push(width);
      });
    })
  );
  imageSizes.sort((a, b) => a - b);
  sizes.forEach((size) => {
    const closestSize =
      imageSizes.find((v) => v > size) || imageSizes[imageSizes.length - 1];
    const image = sizeMap[closestSize].clone().resize({
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      ...resizeOptions,
      width: size,
      height: size,
    });
    resizedList.push(image);
  });
  return resizedList;
}

async function sharpsToIco(imageList, fileOut, options) {
  if (options) imageList = await resize(imageList, options);
  const bufferList = await Promise.all(
    imageList.map((image) => {
      return image.toFormat("png").toBuffer({ resolveWithObject: true });
    })
  );
  try {
    const icoBuffer = encode(bufferList.map((buffer) => buffer.data));
    fs.writeFileSync(fileOut, icoBuffer);
    return {
      width: Math.max(...bufferList.map((buffer) => buffer.info.width)),
      height: Math.max(...bufferList.map((buffer) => buffer.info.height)),
      size: icoBuffer.length,
    };
  } catch (err) {
    return Promise.reject(err);
  }
}

module.exports = {
  encode,
  decode,
  sharpsFromIco,
  sharpsToIco,
};
