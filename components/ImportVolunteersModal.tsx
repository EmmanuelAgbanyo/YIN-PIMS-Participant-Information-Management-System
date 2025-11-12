import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useToast } from '../hooks/useToast';
import { parseCsv, exportToCsv } from '../utils/csv';
import type { Participant, Volunteer, UUID, VolunteerRole } from '../types';
import { Gender, Region } from '../types';

const VOLUNTEER_ROLES_LIST: VolunteerRole[] = ['Event Staff', 'Mentor', 'Logistics', 'Administrative', 'Fundraising'];

type ImportStatus = 'New Participant' | 'Existing Participant' | 'Already a Volunteer' | 'Invalid Data';
interface PreviewRow {
    data: Record<string, any>;
    status: ImportStatus;
    message: string;
}

const statusStyles: Record<ImportStatus, string> = {
    'New Participant': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'Existing Participant': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'Already a Volunteer': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    'Invalid Data': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

interface ImportVolunteersModalProps {
    isOpen: boolean;
    onClose: () => void;
    participants: Participant[];
    volunteers: Volunteer[];
    // Fix: Updated the function signature to match the one from `usePIMSData`, which includes an optional `clubId`.
    addParticipant: (participant: Omit<Participant, 'id' | 'createdAt' | 'membershipId'>, clubId?: UUID) => Promise<Participant>;
    addVolunteer: (volunteer: Omit<Volunteer, 'id'>) => Promise<any>;
}

export const ImportVolunteersModal: React.FC<ImportVolunteersModalProps> = ({ isOpen, onClose, participants, volunteers, addParticipant, addVolunteer }) => {
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
        if (file.type !== 'text/csv') {
            addToast('Invalid file type. Please upload a CSV file.', 'error');
            return;
        }

        try {
            const data = await parseCsv(file);
            if (data.length === 0) {
                addToast('CSV file is empty or invalid.', 'error');
                return;
            }

            const volunteerParticipantIds = new Set(volunteers.map(v => v.participantId));
            // Fix: Explicitly typing the map to fix type inference issues within callbacks.
            const participantMap: Map<string, Participant> = new Map(participants.map(p => [`${p.name.toLowerCase()}_${p.contact.toLowerCase()}`, p]));

            // Fix: Explicitly type the return value of the map callback to `PreviewRow` to resolve the TypeScript error where `status` was being inferred as a generic `string` instead of the specific `ImportStatus` union type.
            const validatedData = data.map((row): PreviewRow => {
                const name = row.Name?.trim();
                const contact = row.Contact?.trim();
                const role = row.Role?.trim();

                if (!name || !contact || !role) {
                    return { data: row, status: 'Invalid Data', message: 'Missing Name, Contact, or Role' };
                }
                
                if (!VOLUNTEER_ROLES_LIST.includes(role as VolunteerRole)) {
                    return { data: row, status: 'Invalid Data', message: `Invalid role: ${role}` };
                }

                const key = `${name.toLowerCase()}_${contact.toLowerCase()}`;
                const existingParticipant = participantMap.get(key);

                if (existingParticipant) {
                    if (volunteerParticipantIds.has(existingParticipant.id)) {
                        return { data: row, status: 'Already a Volunteer', message: 'This person is already a volunteer.' };
                    } else {
                        return { data: row, status: 'Existing Participant', message: 'Will be converted to a volunteer.' };
                    }
                }
                
                return { data: row, status: 'New Participant', message: 'Will be created and added as a volunteer.' };
            });

            setPreviewData(validatedData);
            setStep('preview');

        } catch (error) {
            addToast('Failed to parse CSV file. Check format and content.', 'error');
            console.error(error);
        }
    }, [addToast, volunteers, participants]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => processFile(e.target.files?.[0] as File);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        processFile(e.dataTransfer.files?.[0] as File);
    };

    const handleDownloadTemplate = () => {
        const templateData = [{
            Name: 'Jane Doe',
            Contact: 'jane.d@example.com',
            Institution: 'University of Ghana',
            Role: 'Event Staff', // Must be one of: Event Staff, Mentor, Logistics, Administrative, Fundraising
            StartDate: '2024-08-01', // YYYY-MM-DD format
            Gender: 'Female', // Optional
            Region: 'Greater Accra', // Optional
            'Ghana Card': 'GHA-123456789-0', // Optional
        }];
        exportToCsv('YIN_Volunteer_Import_Template.csv', templateData);
    };

    const handleImport = async () => {
        setStep('importing');
        let stats = { new: 0, existing: 0, skipped: 0, failed: 0 };
        // Fix: Explicitly typing the map to fix type inference issues within callbacks.
        const participantMap: Map<string, Participant> = new Map(participants.map(p => [`${p.name.toLowerCase()}_${p.contact.toLowerCase()}`, p]));

        for (const row of previewData) {
            if (row.status === 'Invalid Data' || row.status === 'Already a Volunteer') {
                stats.skipped++;
                continue;
            }
            
            try {
                const startDate = row.data.StartDate ? new Date(row.data.StartDate) : new Date();
                if (isNaN(startDate.getTime())) throw new Error('Invalid start date');

                if (row.status === 'New Participant') {
                    const newParticipant = await addParticipant({
                        name: row.data.Name,
                        contact: row.data.Contact,
                        institution: row.data.Institution || 'N/A',
                        gender: (Object.values(Gender).includes(row.data.Gender) ? row.data.Gender : Gender.Other),
                        region: (Object.values(Region).includes(row.data.Region) ? row.data.Region : Region.GreaterAccra),
                        ghanaCardNumber: row.data['Ghana Card'] || '',
                        membershipStatus: true,
                        certificateIssued: false,
                        notes: 'Imported via volunteer CSV upload.',
                    });
                    if(newParticipant) {
                        await addVolunteer({
                            participantId: newParticipant.id,
                            role: row.data.Role,
                            status: 'Active',
                            startDate: startDate,
                        });
                        stats.new++;
                    } else {
                        stats.failed++;
                    }
                }

                if (row.status === 'Existing Participant') {
                    const key = `${row.data.Name.toLowerCase()}_${row.data.Contact.toLowerCase()}`;
                    const participant = participantMap.get(key);
                    if (participant) {
                        await addVolunteer({
                            participantId: participant.id,
                            role: row.data.Role,
                            status: 'Active',
                            startDate: startDate,
                        });
                        stats.existing++;
                    } else {
                        stats.failed++;
                    }
                }
            } catch (e) {
                console.error("Failed to import row:", row.data, e);
                stats.failed++;
            }
        }
        addToast(`Import complete! New: ${stats.new}, Converted: ${stats.existing}, Skipped: ${stats.skipped}, Failed: ${stats.failed}.`, 'success');
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
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {previewData.map((row, i) => (
                            <tr key={i}>
                                <td className="px-4 py-2 text-sm whitespace-nowrap">{row.data.Name || 'N/A'}</td>
                                <td className="px-4 py-2 text-sm whitespace-nowrap">{row.data.Contact || 'N/A'}</td>
                                <td className="px-4 py-2 text-sm whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[row.status]}`}>{row.status}</span>
                                </td>
                                <td className="px-4 py-2 text-xs text-gray-500">{row.message}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="p-3 bg-gray-100 dark:bg-gray-900 rounded-md text-sm text-center">
                Summary: <strong className="text-blue-600">{importSummary.new} New</strong>, <strong className="text-purple-600">{importSummary.existing} to Convert</strong>, <strong className="text-gray-600">{importSummary.skipped} Skipped</strong>.
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
        <div className="flex flex-col items-center justify-center p-8 gap-4 min-h-[200px]">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin"></div>
            <p className="text-gray-600 dark:text-gray-300">Importing volunteers, please wait...</p>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Import Volunteers">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            {step === 'upload' && renderUploadStep()}
            {step === 'preview' && renderPreviewStep()}
            {step === 'importing' && renderImportingStep()}
        </Modal>
    );
};

const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0L8 8m4-4v12" /></svg>;