import Dashboard from '@/components/Dashboard';
import transactionsData from '@/data/transactions.json';
import configData from '@/data/config.json';
import cardData from '@/data/card_transactions.json';
import { Transaction, AppConfig } from '@/types';
import { CardStatement } from '@/lib/cardUtils';

export default function Home() {
  return (
    <Dashboard
      transactions={transactionsData.transactions as Transaction[]}
      config={configData as AppConfig}
      cardStatements={cardData.statements as CardStatement[]}
    />
  );
}
