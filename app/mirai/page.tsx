import MiraiDashboard from '@/components/MiraiDashboard';
import transactionsData from '@/data/transactions.json';
import cardData from '@/data/card_transactions.json';
import { Transaction } from '@/types';
import { CardStatement } from '@/lib/cardUtils';

export default function MiraiPage() {
  return (
    <MiraiDashboard
      transactions={transactionsData.transactions as Transaction[]}
      cardStatements={cardData.statements as CardStatement[]}
    />
  );
}
