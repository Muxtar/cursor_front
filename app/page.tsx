'use client';

import LandingShell from '@/components/LandingShell';
import TelegramAuthWidget from '@/components/TelegramAuthWidget';

export default function Home() {
  return (
    <LandingShell>
      <TelegramAuthWidget />
    </LandingShell>
  );
}





