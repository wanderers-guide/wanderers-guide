import { ResizeOptions, Sharp, SharpOptions } from "sharp";
import { ImageData as BmpData } from "sharp-bmp";

export declare type IcoBuffer = Buffer;
export declare type PngOrBmpBuffer = Buffer;
export declare type ImageType = "png" | "bmp";

export declare interface Hotspot {
  x: number;
  y: number;
}

/**
 * ICO icon data
 * @param width - The width of the image, in pixels
 * @param height - The height of the image, in pixels
 * @param type - The type of image, will be one of `bmp` or `png`
 * @param bpp - The color depth of the image as the number of bits used per pixel
 * @param data - The data of the image, format depends on type
 * @param hotspot - If the image is a cursor (.cur), this is the hotspot
 * @public
 */
export declare interface ImageData {
  width: number;
  height: number;
  type: ImageType;
  bpp: number;
  data: Uint8Array;
  hotspot: null | Hotspot;
  image?: Sharp;
}

export declare interface OutputInfo {
  height: number;
  width: number;
  size: number;
}

export declare interface IcoOptions {
  sizes: number[] | "default";
  resizeOptions: ResizeOptions;
}

/**
 * Decode ICO
 */
export declare function decode(buffer: IcoBuffer): ImageData[];

/**
 * Encode ICO
 */
export declare function encode(bufferList: PngOrBmpBuffer[]): IcoBuffer;

/**
 * Create instances of sharp from an ICO image
 */
export declare function sharpsFromIco(
  input: string | Buffer,
  options?: SharpOptions,
  resolveWithObject?: Boolean
): Sharp[] | ImageData[];

/**
 * Write an ICO file
 */
export declare function sharpsToIco(
  icons: Sharp[],
  fileOut: string,
  options?: IcoOptions
): Promise<OutputInfo>;
