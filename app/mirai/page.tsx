import MiraiDashboard from '@/components/MiraiDashboard';
import { getBankTransactions, getCardStatements } from '@/lib/dataSource';

export const dynamic = 'force-dynamic';

export default async function MiraiPage() {
  const [transactions, cardStatements] = await Promise.all([
    getBankTransactions(),
    getCardStatements(),
  ]);
  return <MiraiDashboard transactions={transactions} cardStatements={cardStatements} />;
}
