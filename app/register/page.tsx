'use client';

import LandingShell from '@/components/LandingShell';
import TelegramAuthWidget from '@/components/TelegramAuthWidget';

export default function RegisterPage() {
  return (
    <LandingShell>
      <TelegramAuthWidget />
    </LandingShell>
  );
}
