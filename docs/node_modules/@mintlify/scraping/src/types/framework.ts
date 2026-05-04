export const docVendors = ['gitbook', 'readme', 'docusaurus', undefined] as const;
export const docusaurusVersions = [2, 3] as const;

export type DocusaurusVersion = (typeof docusaurusVersions)[number];
export type FrameworkVendor = (typeof docVendors)[number];

export type Framework = {
  vendor: FrameworkVendor | undefined;
  version: DocusaurusVersion | undefined;
};
