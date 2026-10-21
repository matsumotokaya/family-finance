import FixedCostsPage, { FixedCostsData } from '@/components/FixedCostsPage';
import fixedCostsData from '@/data/fixed_costs.json';

export default function FixedCosts() {
  return <FixedCostsPage data={fixedCostsData as FixedCostsData} />;
}
