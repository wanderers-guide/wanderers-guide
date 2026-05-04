import { prepareStringToBeValidFilename } from '../src/apiPages/common.js';

describe('prepareStringToBeValidFilename', () => {
  it('should replace spaces with dashes', () => {
    expect(prepareStringToBeValidFilename('hello world')).toBe('hello-world');
  });
  it('should be all lowercase', () => {
    expect(prepareStringToBeValidFilename('Hello World')).toBe('hello-world');
  });
  it('Remove periods', () => {
    expect(prepareStringToBeValidFilename('Get-a-list-of-all-shelves-in-the-repo.')).toBe(
      'get-a-list-of-all-shelves-in-the-repo'
    );
  });
  it('Remove path params', () => {
    expect(prepareStringToBeValidFilename('get-repos-{repo_id}-commits-bulk')).toBe(
      'get-repos--commits-bulk'
    );
  });
  it('Remove trailing dash', () => {
    expect(prepareStringToBeValidFilename('get-repos-{repo_id}-commits-')).toBe(
      'get-repos--commits'
    );
  });
  it('Remove leading dash', () => {
    expect(prepareStringToBeValidFilename('-get-repos-{repo_id}-commits-')).toBe(
      'get-repos--commits'
    );
  });
  it('Remove parentheses', () => {
    expect(
      prepareStringToBeValidFilename(
        'Compare-a-ref-(commitbranchworkspacetagtree)-to-this-workspace'
      )
    ).toBe('compare-a-ref-commitbranchworkspacetagtree-to-this-workspace');
  });
  it('Remove slashes', () => {
    expect(
      prepareStringToBeValidFilename(
        'Compare-a-ref-commit/branch/workspace/tag/tree-to-this-workspace'
      )
    ).toBe('compare-a-ref-commitbranchworkspacetagtree-to-this-workspace');
  });
  it('Remove newline', () => {
    expect(
      prepareStringToBeValidFilename(
        'Get-file-entry.-Either-one-of-workspace-branch-or-commit-ID-needs-to-be-specified.-This-api-supports-providing-download-url-for-large-files.\n'
      )
    ).toBe(
      'get-file-entry-either-one-of-workspace-branch-or-commit-id-needs-to-be-specified-this-api-supports-providing-download-url-for-large-files'
    );
  });
  it('Remove comma', () => {
    expect(
      prepareStringToBeValidFilename(
        'Get-file-entry.-Either-one-of-workspace,-branch-or-commit-ID-needs-to-be-specified.-This-api-supports-providing-download-url-for-large-files.'
      )
    ).toBe(
      'get-file-entry-either-one-of-workspace-branch-or-commit-id-needs-to-be-specified-this-api-supports-providing-download-url-for-large-files'
    );
  });
  it('Remove apostrophe', () => {
    expect(prepareStringToBeValidFilename("List-user's-repositories")).toBe(
      'list-users-repositories'
    );
  });
});
