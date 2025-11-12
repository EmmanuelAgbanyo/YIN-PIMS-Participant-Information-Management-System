import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useToast } from '../hooks/useToast';
import { parseCsv, exportToCsv } from '../utils/csv';
import type { Participant } from '../types';
import { Gender, Region } from '../types';

type ImportStatus = 'New Participant' | 'Participant Already Exists' | 'Invalid Data';
interface PreviewRow {
    data: Record<string, any>;
    status: ImportStatus;
    message: string;
}

const statusStyles: Record<ImportStatus, string> = {
    'New Participant': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Participant Already Exists': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Invalid Data': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

interface ImportParticipantsModalProps {
    isOpen: boolean;
    onClose: () => void;
    participants: Participant[];
    addMultipleParticipants: (participantsData: Omit<Participant, 'id' | 'createdAt' | 'membershipId' | 'engagementScore' | 'lastMembershipCardGeneratedAt' | 'photoUrl'>[]) => Promise<{ created: number }>;
}

export const ImportParticipantsModal: React.FC<ImportParticipantsModalProps> = ({ isOpen, onClose, participants, addMultipleParticipants }) => {
    const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
    const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addToast = useToast();

    const resetState = useCallback(() => {
        setStep('upload');
        setPreviewData([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const handleClose = () => {
        resetState();
        onClose();
    };

    const processFile = useCallback(async (file: File) => {
        if (!file) return;
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            addToast('Invalid file type. Please upload a CSV file.', 'error');
            return;
        }

        try {
            const parsedRows = await parseCsv(file);
            if (parsedRows.length === 0) {
                addToast('CSV file is empty or invalid.', 'error');
                return;
            }
            
            const participantMap = new Map(participants.map(p => [`${p.name.trim().toLowerCase()}_${p.contact.trim()}`, p]));

            const validatedData = parsedRows.map(row => {
                const name = row.NAMES?.trim() || row.Name?.trim();
                const contact = row.CONTACT?.trim() || row.Contact?.trim();

                if (!name && !contact && Object.values(row).every(val => !val)) {
                    return null;
                }

                if (!name || !contact) {
                    return { data: row, status: 'Invalid Data', message: 'Missing NAMES or CONTACT column' };
                }
                
                const key = `${name.toLowerCase()}_${contact}`;
                if (participantMap.has(key)) {
                    return { data: row, status: 'Participant Already Exists', message: 'Will be skipped' };
                }
                
                return { data: row, status: 'New Participant', message: 'Will be created' };
            }).filter(Boolean) as PreviewRow[];

            setPreviewData(validatedData);
            setStep('preview');

        } catch (error) {
            addToast('Failed to parse CSV file. Check format.', 'error');
            console.error(error);
        }
    }, [addToast, participants]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => processFile(e.target.files?.[0] as File);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        processFile(e.dataTransfer.files?.[0] as File);
    };

    const handleDownloadTemplate = () => {
        const templateData = [{
            NAMES: 'Eunice Clottey',
            CONTACT: '595016141',
            INSTITUTION: 'UG',
            MEMBERS: 'YES', // Can be YES, NO, or N/A
            GENDER: 'Female', // Optional: Male, Female, Other
            REGION: 'Greater Accra', // Optional
            'GHANA CARD': 'GHA-123456789-0', // Optional
            NOTES: 'Optional notes here', // Optional
        }];
        exportToCsv('YIN_Participant_Import_Template.csv', templateData);
    };

    const handleImport = async () => {
        const participantsToCreate = previewData
            .filter(row => row.status === 'New Participant')
            .map(row => {
                const data = row.data;
                const membersValue = data.MEMBERS?.trim().toLowerCase() || data.Members?.trim().toLowerCase();
                const membershipStatus = membersValue === 'yes';
                
                return {
                    name: data.NAMES || data.Name,
                    contact: data.CONTACT || data.Contact,
                    institution: data.INSTITUTION || data.Institution || 'N/A',
                    membershipStatus: membershipStatus,
                    gender: (Object.values(Gender).includes(data.GENDER || data.Gender) ? (data.GENDER || data.Gender) : Gender.Other),
                    region: (Object.values(Region).includes(data.REGION || data.Region) ? (data.REGION || data.Region) : Region.GreaterAccra),
                    ghanaCardNumber: data['GHANA CARD'] || '',
                    notes: data.NOTES || data.Notes || 'Imported via CSV.',
                    certificateIssued: false,
                };
            });
        
        if (participantsToCreate.length === 0) {
            addToast('No new participants to import.', 'info');
            handleClose();
            return;
        }

        setStep('importing');
        
        try {
            const result = await addMultipleParticipants(participantsToCreate);
            addToast(`Import successful! ${result.created} new participants were created.`, 'success');
        } catch (error) {
            addToast('An error occurred during the import process.', 'error');
            console.error('Import failed:', error);
        } finally {
            handleClose();
        }
    };

    const importSummary = useMemo(() => {
        return previewData.reduce((acc, row) => {
            if (row.status === 'New Participant') acc.new++;
            else acc.skipped++;
            return acc;
        }, { new: 0, skipped: 0 });
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
                <p className="text-xs text-gray-500 dark:text-gray-400">CSV file with participant data</p>
            </div>
            <p className="text-xs text-center text-gray-500">Required columns: NAMES, CONTACT. <button onClick={handleDownloadTemplate} className="text-primary hover:underline">Download template</button>.</p>
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
                                <td className="px-4 py-2 text-sm">{row.data.NAMES || row.data.Name || 'N/A'}</td>
                                <td className="px-4 py-2 text-sm">{row.data.CONTACT || row.data.Contact || 'N/A'}</td>
                                <td className="px-4 py-2 text-sm">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[row.status]}`}>{row.status}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-sm text-center">
                Summary: <strong className="text-blue-600">{importSummary.new} New Participants</strong>, <strong className="text-gray-600">{importSummary.skipped} Skipped Rows</strong>.
            </div>
            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={resetState}>Back</Button>
                <Button onClick={handleImport} disabled={importSummary.new === 0}>
                    Confirm Import ({importSummary.new})
                </Button>
            </div>
        </div>
    );

     const renderImportingStep = () => (
        <div className="flex flex-col items-center justify-center p-8 gap-4 min-h-[200px]">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
            <p className="text-gray-600 dark:text-gray-300">Importing participants, please wait...</p>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Import Participants from CSV">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            {step === 'upload' && renderUploadStep()}
            {step === 'preview' && renderPreviewStep()}
            {step === 'importing' && renderImportingStep()}
        </Modal>
    );
};

const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0L8 8m4-4v12" /></svg>;