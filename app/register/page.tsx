'use client';

import LandingShell from '@/components/LandingShell';
import PhoneAuthWidget from '@/components/PhoneAuthWidget';

export default function RegisterPage() {
  return (
    <LandingShell>
      <PhoneAuthWidget />
    </LandingShell>
  );
}
