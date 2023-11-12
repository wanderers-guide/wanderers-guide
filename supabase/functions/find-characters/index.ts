// @ts-ignore
import { serve } from 'std/server';
import { connect, fetchData } from '../_shared/helpers.ts';
import type { Character, ContentSource } from '../_shared/content';

serve(async (req: Request) => {
  return await connect(req, async (client, body) => {
    let { ids } = body as {
      ids: number[];
    };

    const characters = await fetchData<Character>(client, 'character', [
      { column: 'id', value: ids },
    ]);
    if (characters.length === 0) {
      return {
        status: 'success',
        data: [],
      };
    }

    // TODO: Get all normal content sources and then check what homebrew this user has subscribed to
    //       and fetch the content sources for that.
    const userId = characters[0].user_id;

    const book_contentSources = await fetchData<ContentSource>(client, 'content_source', [
      { column: 'user_id', value: undefined },
    ]);

    const data = {
      characters,
      books: book_contentSources,
    };
    return {
      status: 'success',
      data,
    };
  });
});
