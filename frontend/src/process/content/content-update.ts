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

export async function findContentUpdates(daysAgo: string) {
  const allTime = daysAgo === 'ALL';

  // Timestamp for X days ago
  const timestamp = new Date(Date.now() - 86400000 * parseInt(daysAgo)).toISOString();

  const pendingUpdates =
    (await makeRequest<ContentUpdate[]>('find-content-update', {
      state: 'PENDING',
    })) ?? [];
  const approvedUpdates =
    (await makeRequest<ContentUpdate[]>('find-content-update', {
      state: 'APPROVED',
      created: allTime
        ? undefined
        : {
            from: timestamp,
          },
    })) ?? [];
  const rejectedUpdates =
    (await makeRequest<ContentUpdate[]>('find-content-update', {
      state: 'REJECTED',
      created: allTime
        ? undefined
        : {
            from: timestamp,
          },
    })) ?? [];

  return [...pendingUpdates, ...approvedUpdates, ...rejectedUpdates];
}

export async function findContentUpdate(updateId: number) {
  return await makeRequest<ContentUpdate>('find-content-update', { id: updateId });
}

export async function findApprovedContentUpdates(userId: string) {
  return await makeRequest<ContentUpdate[]>('find-content-update', { user_id: userId, state: 'APPROVED' });
}
