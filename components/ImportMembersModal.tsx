import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useToast } from '../hooks/useToast';
import { parseCsv, exportToCsv } from '../utils/csv';
import type { Club, Participant, ClubMembership, UUID } from '../types';
import { Gender, Region } from '../types';

type ImportStatus = 'New Participant' | 'Existing Participant' | 'Already a Member' | 'Invalid Data';
interface PreviewRow {
    data: Record<string, any>;
    status: ImportStatus;
    message: string;
}

const statusStyles: Record<ImportStatus, string> = {
    'New Participant': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Existing Participant': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Already a Member': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'Invalid Data': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

interface ImportMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    club: Club;
    participants: Participant[];
    clubMemberships: ClubMembership[];
    addParticipant: (participant: Omit<Participant, 'id' | 'createdAt' | 'membershipId'>, clubId?: UUID) => Promise<Participant>;
    addClubMembership: (participantId: UUID, clubId: UUID) => Promise<boolean>;
}

export const ImportMembersModal: React.FC<ImportMembersModalProps> = ({ isOpen, onClose, club, participants, clubMemberships, addParticipant, addClubMembership }) => {
    const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
    const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addToast = useToast();

    const resetState = () => {
        setStep('upload');
        setPreviewData([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const processFile = useCallback(async (file: File) => {
        if (!file) return;
        if (file.type !== 'text/csv') {
            addToast('Invalid file type. Please upload a CSV file.', 'error');
            return;
        }

        try {
            const data = await parseCsv(file);
            const clubMemberIds = new Set(clubMemberships.filter(cm => cm.clubId === club.id).map(cm => cm.participantId));
            
            // Fix: Explicitly type the return value of the map callback to `PreviewRow` to resolve the TypeScript error where `status` was being inferred as a generic `string` instead of the specific `ImportStatus` union type.
            const validatedData = data.map((row): PreviewRow => {
                if (!row.Name || !row.Contact) {
                    return { data: row, status: 'Invalid Data', message: 'Missing Name or Contact' };
                }
                
                const existingParticipant = participants.find(p => p.name === row.Name && p.contact === row.Contact);

                if (existingParticipant) {
                    if (clubMemberIds.has(existingParticipant.id)) {
                        return { data: row, status: 'Already a Member', message: 'Will be skipped' };
                    } else {
                        return { data: row, status: 'Existing Participant', message: 'Will be added to club' };
                    }
                }
                
                return { data: row, status: 'New Participant', message: 'Will be created and added' };
            });

            setPreviewData(validatedData);
            setStep('preview');

        } catch (error) {
            addToast('Failed to parse CSV file. Check format.', 'error');
            console.error(error);
        }
    }, [addToast, club.id, clubMemberships, participants]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => processFile(e.target.files?.[0] as File);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        processFile(e.dataTransfer.files?.[0] as File);
    };

    const handleDownloadTemplate = () => {
        const templateData = [{
            Name: 'John Doe',
            Contact: 'john.d@example.com',
            Gender: 'Male',
            Region: 'Greater Accra',
            'Ghana Card': 'GHA-123456789-0',
            Contestant: 'NO',
        }];
        exportToCsv('YIN_Club_Import_Template.csv', templateData);
    };

    const handleImport = async () => {
        setStep('importing');
        let stats = { new: 0, existing: 0, skipped: 0 };
        const tempParticipants = [...participants];

        for (const row of previewData) {
            if (row.status === 'Invalid Data' || row.status === 'Already a Member') {
                stats.skipped++;
                continue;
            }

            if (row.status === 'New Participant') {
                const contestantValue = row.data.Contestant?.trim().toLowerCase();
                const isContestant = contestantValue === 'yes';
                const newParticipant = await addParticipant({
                    name: row.data.Name,
                    contact: row.data.Contact,
                    gender: (Object.values(Gender).includes(row.data.Gender) ? row.data.Gender : Gender.Other),
                    region: (Object.values(Region).includes(row.data.Region) ? row.data.Region : Region.GreaterAccra),
                    institution: club.institution,
                    ghanaCardNumber: row.data['Ghana Card'] || '',
                    isContestant: isContestant,
                    membershipStatus: true,
                    certificateIssued: false,
                    notes: 'Imported via club CSV upload.',
                }, club.id);
                if(newParticipant) {
                    tempParticipants.push(newParticipant);
                    stats.new++;
                } else {
                    stats.skipped++; // Failed creation
                }
            }

            if (row.status === 'Existing Participant') {
                const participant = tempParticipants.find(p => p.name === row.data.Name && p.contact === row.data.Contact);
                if (participant) {
                    const success = await addClubMembership(participant.id, club.id);
                    if (success) stats.existing++;
                    else stats.skipped++;
                } else {
                    stats.skipped++;
                }
            }
        }
        addToast(`Import complete! ${stats.new} new, ${stats.existing} existing members added. ${stats.skipped} skipped.`, 'success');
        handleClose();
    };

    const importSummary = useMemo(() => {
        return previewData.reduce((acc, row) => {
            if (row.status === 'New Participant') acc.new++;
            else if (row.status === 'Existing Participant') acc.existing++;
            else acc.skipped++;
            return acc;
        }, { new: 0, existing: 0, skipped: 0 });
    }, [previewData]);

    const renderUploadStep = () => (
        <div className="flex flex-col items-center gap-4 p-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'border-primary bg-blue-50 dark:bg-blue-900/50' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
                <UploadIcon />
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">CSV file</p>
            </div>
            <p className="text-xs text-center text-gray-500">Need help? <button onClick={handleDownloadTemplate} className="text-primary hover:underline">Download the CSV template</button> to get started.</p>
        </div>
    );
    
    const renderPreviewStep = () => (
        <div className="flex flex-col gap-4">
            <div className="max-h-80 overflow-y-auto border dark:border-gray-700 rounded-md">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {previewData.map((row, i) => (
                            <tr key={i}>
                                <td className="px-4 py-2 text-sm">{row.data.Name || 'N/A'}</td>
                                <td className="px-4 py-2 text-sm">{row.data.Contact || 'N/A'}</td>
                                <td className="px-4 py-2 text-sm">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[row.status]}`}>{row.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-sm text-center">
                Summary: <strong className="text-blue-600">{importSummary.new} New</strong>, <strong className="text-purple-600">{importSummary.existing} Existing</strong>, <strong className="text-gray-600">{importSummary.skipped} Skipped</strong>.
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={resetState}>Back</Button>
                <Button onClick={handleImport} disabled={importSummary.new + importSummary.existing === 0}>
                    Confirm Import ({importSummary.new + importSummary.existing})
                </Button>
            </div>
        </div>
    );

     const renderImportingStep = () => (
        <div className="flex flex-col items-center justify-center p-8 gap-4">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
            <p className="text-gray-600 dark:text-gray-300">Importing members, please wait...</p>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={`Import Members to ${club.name}`}>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            {step === 'upload' && renderUploadStep()}
            {step === 'preview' && renderPreviewStep()}
            {step === 'importing' && renderImportingStep()}
        </Modal>
    );
};

const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0L8 8m4-4v12" /></svg>;