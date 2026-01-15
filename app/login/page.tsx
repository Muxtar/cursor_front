'use client';

import LandingShell from '@/components/LandingShell';
import PhoneAuthWidget from '@/components/PhoneAuthWidget';

export default function LoginPage() {
  return (
    <LandingShell>
      <PhoneAuthWidget />
    </LandingShell>
  );
}
