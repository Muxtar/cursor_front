'use client';

import LandingShell from '@/components/LandingShell';
import TelegramAuthWidget from '@/components/TelegramAuthWidget';

export default function LoginPage() {
  return (
    <LandingShell>
      <TelegramAuthWidget />
    </LandingShell>
  );
}
