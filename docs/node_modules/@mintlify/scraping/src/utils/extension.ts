export function addMdx(filename: string): string {
  if (filename.endsWith('.mdx')) {
    return filename;
  }
  return filename + '.mdx';
}

export function getFileExtension(filename: string): string | undefined {
  const extBeginsIndex = filename.lastIndexOf('.') + 1;
  const ext = filename.substring(extBeginsIndex);

  if (filename === ext) return undefined;
  return ext.toLowerCase();
}

export function fileBelongsInPagesFolder(filename: string): boolean {
  const extension = getFileExtension(filename);
  return !!extension && (extension === 'mdx' || extension === 'md' || extension === 'tsx');
}
