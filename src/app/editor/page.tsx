import GridEditor from './GridEditorN';
import { useRouter } from 'next/router';

export default function GridPage() {
  const router = useRouter();
  const { id } = router.query;

  const dataID = Array.isArray(id) ? id[0] : id;
  
  return (
    <main className="min-h-screen">
      <GridEditor dataID={dataID} />
    </main>
  );
}