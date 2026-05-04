export declare const docVendors: readonly ["gitbook", "readme", "docusaurus", undefined];
export declare const docusaurusVersions: readonly [2, 3];
export type DocusaurusVersion = (typeof docusaurusVersions)[number];
export type FrameworkVendor = (typeof docVendors)[number];
export type Framework = {
    vendor: FrameworkVendor | undefined;
    version: DocusaurusVersion | undefined;
};
