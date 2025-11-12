import React, { useState } from 'react';
import type { Participant } from '../types';
import { PhotoCaptureModal } from './PhotoCaptureModal';
import { Button } from './ui/Button';

interface ParticipantDetailPanelProps {
  participant: Participant;
  onClose: () => void;
  updateParticipant: (participant: Participant) => void;
}

export const ParticipantDetailPanel: React.FC<ParticipantDetailPanelProps> = ({ participant, onClose, updateParticipant }) => {
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const handlePhotoSave = (photoUrl: string) => {
    updateParticipant({ ...participant, photoUrl });
    setIsPhotoModalOpen(false);
  };
  
  return (
    <>
      <div className="w-full lg:w-1/3 bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col transition-all duration-300 ease-in-out h-full max-h-[calc(100vh-120px)]">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold">Participant Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="text-center mb-6">
            <div className="relative w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto flex items-center justify-center mb-2">
              {participant.photoUrl ? (
                <img src={participant.photoUrl} alt={participant.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <UserIcon className="w-16 h-16 text-gray-400" />
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsPhotoModalOpen(true)}>Edit Photo</Button>
            <h2 className="text-xl font-bold mt-2">{participant.name}</h2>
            <p className="text-sm text-gray-500">{participant.membershipId}</p>
          </div>
          <div className="space-y-4">
            <DetailItem label="Contact" value={participant.contact} />
            <DetailItem label="Institution" value={participant.institution} />
            {participant.ghanaCardNumber && <DetailItem label="Ghana Card" value={participant.ghanaCardNumber} />}
            <DetailItem label="Region" value={participant.region} />
            <DetailItem label="Gender" value={participant.gender} />
            <DetailItem label="Membership Status">
              {participant.membershipStatus ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>
              ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Inactive</span>
              )}
            </DetailItem>
            <DetailItem label="Events Attended" value={participant.engagementScore?.toString() || '0'} />
            <DetailItem label="Notes">
              <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md">{participant.notes || 'No notes available.'}</p>
            </DetailItem>
            <DetailItem label="Member Since" value={participant.createdAt.toLocaleDateString()} />
          </div>
        </div>
      </div>
      <PhotoCaptureModal 
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onPhotoCaptured={handlePhotoSave}
      />
    </>
  );
};

const DetailItem: React.FC<{label: string, value?: string, children?: React.ReactNode}> = ({ label, value, children }) => (
    <div>
        <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
        {value && <p className="text-sm font-semibold">{value}</p>}
        {children}
    </div>
);

const UserIcon: React.FC<{className: string}> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
  </svg>
);