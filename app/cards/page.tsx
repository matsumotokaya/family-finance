import CardDashboard from '@/components/CardDashboard';
import cardData from '@/data/card_transactions.json';
import { CardStatement } from '@/lib/cardUtils';

export default function CardsPage() {
  return <CardDashboard statements={cardData.statements as CardStatement[]} />;
}
