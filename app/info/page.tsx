import InfoPage from '@/components/InfoPage';
import configData from '@/data/config.json';
import { AppConfig } from '@/types';
import { getBankTransactions } from '@/lib/dataSource';

export const dynamic = 'force-dynamic';

export default async function Info() {
  const transactions = await getBankTransactions();
  return <InfoPage config={configData as AppConfig} transactions={transactions} />;
}
