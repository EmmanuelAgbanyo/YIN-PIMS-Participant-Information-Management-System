

import React, { useState } from 'react';
import type { Participant } from '../types';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Checkbox } from './ui/Checkbox';
import { useToast } from '../hooks/useToast';
import { exportToCsv } from '../utils/csv';

interface ExportParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantsToExport: Participant[];
}

const ALL_COLUMNS = {
  membershipId: { label: 'Membership ID', default: true },
  name: { label: 'Name', default: true },
  contact: { label: 'Contact', default: true },
  institution: { label: 'Institution', default: true },
  membershipStatus: { label: 'Membership Status', default: true },
  engagementScore: { label: 'Engagement Score', default: true },
  isContestant: { label: 'Is Contestant', default: false },
  ghanaCardNumber: { label: 'Ghana Card', default: false },
  gender: { label: 'Gender', default: false },
  region: { label: 'Region', default: false },
  createdAt: { label: 'Date Joined', default: false },
  certificateIssued: { label: 'Certificate Issued', default: false },
  notes: { label: 'Notes', default: false },
  lastMembershipCardGeneratedAt: { label: 'Last Card Generated', default: false },
};

type ColumnKey = keyof typeof ALL_COLUMNS;

export const ExportParticipantsModal: React.FC<ExportParticipantsModalProps> = ({
  isOpen,
  onClose,
  participantsToExport,
}) => {
  const addToast = useToast();
  const [selectedColumns, setSelectedColumns] = useState<Set<ColumnKey>>(
    new Set(Object.keys(ALL_COLUMNS).filter(key => ALL_COLUMNS[key as ColumnKey].default) as ColumnKey[])
  );

  const handleColumnChange = (key: ColumnKey) => {
    setSelectedColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleExport = () => {
    if (participantsToExport.length === 0) {
      addToast('There are no participants to export with the current filters.', 'error');
      return;
    }
    if (selectedColumns.size === 0) {
      addToast('Please select at least one column to export.', 'error');
      return;
    }

    const orderedColumns = (Object.keys(ALL_COLUMNS) as ColumnKey[]).filter(key => selectedColumns.has(key));
    
    const dataToExport = participantsToExport.map(participant => {
      const exportedRow: Record<string, any> = {};
      orderedColumns.forEach(key => {
        const header = ALL_COLUMNS[key].label;
        let value = participant[key as keyof Participant];

        // Format data for better CSV readability
        if (value instanceof Date) {
          value = value.toLocaleDateString();
        } else if (typeof value === 'boolean') {
          value = value ? 'Yes' : 'No';
        } else if (value === undefined || value === null) {
          value = '';
        }
        
        exportedRow[header] = value;
      });
      return exportedRow;
    });

    const filename = `YIN_PIMS_Participants_Export_${new Date().toISOString().split('T')[0]}.csv`;
    exportToCsv(filename, dataToExport);
    addToast(`${participantsToExport.length} participants exported successfully!`, 'success');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Export ${participantsToExport.length} Participants`}>
      <div className="space-y-6">
        <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Select Columns</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Choose which data fields to include in the CSV file.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 p-4 border rounded-md dark:border-gray-700">
            {(Object.keys(ALL_COLUMNS) as ColumnKey[]).map(key => (
                <Checkbox 
                    key={key} 
                    label={ALL_COLUMNS[key].label}
                    checked={selectedColumns.has(key)}
                    onChange={() => handleColumnChange(key)}
                />
            ))}
        </div>
        <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleExport} disabled={participantsToExport.length === 0 || selectedColumns.size === 0}>
                Export CSV
            </Button>
        </div>
      </div>
    </Modal>
  );
};