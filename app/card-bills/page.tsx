import CardBillsHistory from '@/components/CardBillsHistory';
import cardData from '@/data/card_transactions.json';
import { CardStatement } from '@/lib/cardUtils';

export default function CardBillsPage() {
  return <CardBillsHistory statements={cardData.statements as CardStatement[]} />;
}
