// Only loaded inside the Studio's "Editar sobre la web" (see PREVIEW in cms.ts), so visitors never download it:
// shows the editors' drafts as they type and draws the click-to-edit overlays.
import { useEffect, useState } from 'react';
import { createClient } from '@sanity/client';
import { createQueryStore } from '@sanity/react-loader';
import { VisualEditing } from '@sanity/visual-editing/react';
import { CMS_QUERY, pagesFor, SANITY, STUDIO_URL, type Cms } from './cms';

// fields the site compares or looks up by: they must stay free of the invisible click-to-edit markers
const NOT_TEXT = new Set(['key', 'file', 'code', 'language', 'line', 'url', 'id']);

const client = createClient({
  ...SANITY,
  useCdn: false,
  stega: {
    enabled: true,
    studioUrl: STUDIO_URL,
    filter: (props) => !NOT_TEXT.has(String(props.sourcePath.at(-1))) && props.filterDefault(props),
  },
});
const { useQuery, useLiveMode } = createQueryStore({ client, ssr: false });

export default function CmsLive({ onData }: { onData: (c: Cms) => void }) {
  // only the texts and photos of the page on screen (see ALL_PAGES in cms.ts); the query follows the visitor's navigation
  const [pages, setPages] = useState(() => pagesFor(window.location.hash));
  useEffect(() => {
    const on = () => setPages(pagesFor(window.location.hash));
    window.addEventListener('popstate', on);
    window.addEventListener('hashchange', on);
    return () => {
      window.removeEventListener('popstate', on);
      window.removeEventListener('hashchange', on);
    };
  }, []);
  const { data } = useQuery<Cms>(CMS_QUERY, { pages });
  useEffect(() => {
    if (data) onData(data);
  }, [data, onData]);
  useLiveMode({ client });
  return <VisualEditing portal />;
}
