'use client';

import GridEditor from '../GridEditorN';
import { useParams } from 'next/navigation';

export default function GridPage() {
  const params = useParams();
  const id = params?.page;

  const dataID = Array.isArray(id) ? id[0] : id;

  return (
    <main className="min-h-screen">
      <GridEditor dataID={dataID} />
    </main>
  );
}