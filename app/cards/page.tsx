import CardDashboard from '@/components/CardDashboard';
import { getCardStatements } from '@/lib/dataSource';

export const dynamic = 'force-dynamic';

export default async function CardsPage() {
  const statements = await getCardStatements();
  return <CardDashboard statements={statements} />;
}
