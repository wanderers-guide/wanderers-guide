import { makeRequest } from '@requests/request-manager';
import { ContentType, ContentUpdate } from '@typing/content';

export async function submitContentUpdate(
  type: ContentType,
  action: 'UPDATE' | 'CREATE' | 'DELETE',
  data: Record<string, any>,
  contentSourceId: number,
  refId?: number
) {
  return await makeRequest<ContentUpdate>('create-content-update', {
    type: type,
    ref_id: refId,
    action: action,
    data: data,
    content_source_id: contentSourceId,
  });
}

export async function findContentUpdates() {
  return await makeRequest<ContentUpdate[]>('find-content-update', {});
}

export async function findContentUpdate(updateId: number) {
  return await makeRequest<ContentUpdate>('find-content-update', { id: updateId });
}

export async function findApprovedContentUpdates(userId: string) {
  return await makeRequest<ContentUpdate[]>('find-content-update', { user_id: userId, state: 'APPROVED' });
}
