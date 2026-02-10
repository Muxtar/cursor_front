'use client';

import dynamic from 'next/dynamic';

const CreateProductContent = dynamic(() => import('./CreateProductContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
    </div>
  ),
});

export default function CreateProductPage() {
  return <CreateProductContent />;
}
