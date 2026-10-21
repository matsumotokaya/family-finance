import InfoPage from '@/components/InfoPage';
import configData from '@/data/config.json';
import { AppConfig } from '@/types';

export default function Info() {
  return <InfoPage config={configData as AppConfig} />;
}
