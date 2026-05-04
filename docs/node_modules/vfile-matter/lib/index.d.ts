/**
 * Parse the YAML front matter in a file and expose it as `file.data.matter`.
 *
 * If no matter is found in the file, nothing happens, except that
 * `file.data.matter` is set to an empty object (`{}`).
 *
 * If the file value is an `Uint8Array`, assumes it is encoded in UTF-8.
 *
 * @param {VFile} file
 *   Virtual file.
 * @param {Readonly<Options> | null | undefined} [options={}]
 *   Configuration (optional).
 * @returns {undefined}
 *   Nothing.
 */
export function matter(file: VFile, options?: Readonly<Options> | null | undefined): undefined;
/**
 * Configuration (optional).
 */
export type Options = {
    /**
     * Remove the YAML front matter from the file (default: `false`).
     */
    strip?: boolean | null | undefined;
    /**
     * Configuration for the YAML parser, passed to `yaml` as `x` in
     * `yaml.parse('', x)` (default: `{}`).
     */
    yaml?: Readonly<YamlOptions> | null | undefined;
};
/**
 * Flatten a TypeScript record.
 */
export type Prettify<Type> = { [Key in keyof Type]: Type[Key]; } & {};
/**
 * Options for the YAML parser.
 *
 * Equivalent to `DocumentOptions`, `ParseOptions`, `SchemaOptions`, and `ToJsOptions`.
 */
export type YamlOptions = Prettify<yaml.DocumentOptions & yaml.ParseOptions & yaml.SchemaOptions & yaml.ToJSOptions>;
import type { VFile } from 'vfile';
import yaml from 'yaml';
//# sourceMappingURL=index.d.ts.map