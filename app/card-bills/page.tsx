import CardBillsHistory from '@/components/CardBillsHistory';
import { getCardStatements } from '@/lib/dataSource';

export const dynamic = 'force-dynamic';

export default async function CardBillsPage() {
  const statements = await getCardStatements();
  return <CardBillsHistory statements={statements} />;
}
