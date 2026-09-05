// @ts-ignore
import { serve } from 'std/server';
import { connect } from '../_shared/helpers.ts';
import { populateRequest, parseRequest, requireWorkUser } from '../_shared/costly-requests.ts';
import { populateCollection } from '../_shared/vector-db.ts';

serve(async (req: Request) =>
  connect(
    req,
    async (client, body, token) => {
      const user = await requireWorkUser(client, token, true);
      const { collection, type, ids } = parseRequest(populateRequest, body);
      return await populateCollection(client, collection, type, ids, user.user_id);
    },
    { maxBodyBytes: 32 * 1024 }
  )
);
