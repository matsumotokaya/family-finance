import NatsuyaDashboard from '@/components/NatsuyaDashboard';
import { getBankTransactions, getCardStatements } from '@/lib/dataSource';

export const dynamic = 'force-dynamic';

export default async function NatsuyaPage() {
  const [transactions, cardStatements] = await Promise.all([
    getBankTransactions(),
    getCardStatements(),
  ]);
  return <NatsuyaDashboard transactions={transactions} cardStatements={cardStatements} />;
}
