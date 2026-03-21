import InfoPage from '@/components/InfoPage';
import configData from '@/data/config.json';
import transactionsData from '@/data/transactions.json';
import { AppConfig, Transaction } from '@/types';

export default function Info() {
  return (
    <InfoPage
      config={configData as AppConfig}
      transactions={transactionsData.transactions as Transaction[]}
    />
  );
}
