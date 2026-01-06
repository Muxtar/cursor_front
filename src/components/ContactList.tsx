'use client';

import { useLanguage } from '@/contexts/LanguageContext';

interface Contact {
  contact: {
    id: string;
    contact_id: string;
    is_anonymous: boolean;
  };
  user: {
    id: string;
    username: string;
    phone_number: string;
    avatar?: string;
  };
}

interface ContactListProps {
  contacts: Contact[];
  onSelectContact?: (contactId: string) => void;
}

export default function ContactList({ contacts, onSelectContact }: ContactListProps) {
  const { t } = useLanguage();
  
  // Null/undefined check
  if (!contacts || !Array.isArray(contacts)) {
    return (
      <div className="p-4 text-center text-gray-500">{t('noContacts') || 'No contacts'}</div>
    );
  }
  
  return (
    <div className="divide-y divide-gray-200">
      {contacts.length === 0 ? (
        <div className="p-4 text-center text-gray-500">{t('noContacts') || 'No contacts yet'}</div>
      ) : (
        contacts.map((contact) => {
          const contactId = contact.user?.id || contact.contact?.contact_id || (contact as any).contact_id;
          
          const content = (
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                {contact.user.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {contact.user.username || contact.user.phone_number}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {contact.contact.is_anonymous ? 'Anonymous' : contact.user.phone_number}
                </p>
              </div>
            </div>
          );
          
          if (onSelectContact) {
            return (
              <button
                key={contact.contact.id}
                onClick={() => contactId && onSelectContact(contactId)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {content}
              </button>
            );
          }
          
          return (
            <div
              key={contact.contact.id}
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
            >
              {content}
            </div>
          );
        })
      )}
    </div>
  );
}


