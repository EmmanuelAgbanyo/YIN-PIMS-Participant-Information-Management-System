import React, { useState, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Textarea } from './ui/Textarea';
import { Checkbox } from './ui/Checkbox';
import { FormGroup } from './ui/FormGroup';
import { useToast } from '../hooks/useToast';
import type { Club, Participant, UUID } from '../types';
import { GENDERS, REGIONS } from '../constants';

const NewMemberForm: React.FC<{
    club: Club;
    onSubmit: (data: Omit<Participant, 'id' | 'createdAt' | 'membershipId'>) => Promise<void>;
}> = ({ club, onSubmit }) => {
    const [formData, setFormData] = useState({
        name: '',
        gender: GENDERS[0],
        institution: club.institution,
        region: REGIONS[0],
        contact: '',
        membershipStatus: true,
        certificateIssued: false,
        isContestant: false,
        notes: '',
        ghanaCardNumber: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 p-1">
            <FormGroup className="md:col-span-2"><Input type="text" label="Full Name" name="name" value={formData.name} onChange={handleChange} required /></FormGroup>
            <FormGroup><Select label="Gender" name="gender" value={formData.gender} onChange={handleChange}>{GENDERS.map(g => <option key={g} value={g}>{g}</option>)}</Select></FormGroup>
            <FormGroup><Input type="text" label="Contact (Phone/Email)" name="contact" value={formData.contact} onChange={handleChange} required /></FormGroup>
            <FormGroup><Input type="text" label="Ghana Card (Optional)" name="ghanaCardNumber" value={formData.ghanaCardNumber || ''} onChange={handleChange} /></FormGroup>
            <FormGroup className="md:col-span-2"><Input label="Institution" name="institution" value={formData.institution} disabled /></FormGroup>
            <FormGroup><Select label="Region" name="region" value={formData.region} onChange={handleChange}>{REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</Select></FormGroup>
            <FormGroup className="md:col-span-2">
                <Checkbox name="isContestant" label="Is a Contestant" checked={formData.isContestant} onChange={handleChange} />
            </FormGroup>
            <FormGroup className="md:col-span-2"><Textarea label="Notes" name="notes" value={formData.notes} onChange={handleChange} rows={2} /></FormGroup>
            <div className="md:col-span-2 flex justify-end">
                <Button type="submit">Create & Add Member</Button>
            </div>
        </form>
    );
};


export const AddMemberModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    club: Club;
    participants: Participant[];
    currentMemberIds: Set<UUID>;
    addClubMembership: (participantId: UUID, clubId: UUID) => Promise<boolean>;
    addParticipant: (data: Omit<Participant, 'id' | 'createdAt' | 'membershipId'>, clubId?: UUID) => Promise<Participant>;
}> = ({ isOpen, onClose, club, participants, currentMemberIds, addClubMembership, addParticipant }) => {
    const [activeTab, setActiveTab] = useState<'existing' | 'create'>('existing');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<UUID>>(new Set());
    const addToast = useToast();

    const availableParticipants = useMemo(() => {
        return participants
            .filter(p => 
                p.institution === club.institution && // Only from same institution
                !currentMemberIds.has(p.id) && 
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a,b) => a.name.localeCompare(b.name));
    }, [participants, currentMemberIds, searchTerm, club.institution]);

    const handleSelect = (id: UUID) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if(newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };
    
    const handleAddExisting = async () => {
        let addedCount = 0;
        for (const pid of selectedIds) {
            const success = await addClubMembership(pid, club.id);
            if (success) addedCount++;
        }
        addToast(`Added ${addedCount} new member(s).`, 'success');
        onClose();
    };
    
    const handleCreateNew = async (data: Omit<Participant, 'id' | 'createdAt' | 'membershipId'>) => {
        const newParticipant = await addParticipant(data, club.id);
        if (newParticipant) {
             addToast(`Successfully created and added ${newParticipant.name} to the club.`, 'success');
             onClose();
        } else {
            addToast('Failed to create new member.', 'error');
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Add Members to ${club.name}`}>
            <div className="flex flex-col gap-4 max-h-[70vh]">
                 <div className="flex border-b dark:border-gray-700">
                    <button onClick={() => setActiveTab('existing')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'existing' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Add Existing Participant</button>
                    <button onClick={() => setActiveTab('create')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'create' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Create New Member</button>
                </div>
                
                {activeTab === 'existing' && (
                    <div className="flex flex-col gap-4">
                        <Input label="Search participants..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        <div className="flex-1 overflow-y-auto border dark:border-gray-700 rounded-md p-2 space-y-2 min-h-[200px]">
                            {availableParticipants.map(p => (
                                <div key={p.id} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                                <Checkbox label={p.name} checked={selectedIds.has(p.id)} onChange={() => handleSelect(p.id)} />
                                </div>
                            ))}
                            {availableParticipants.length === 0 && (
                                <p className="text-center text-sm text-gray-500 py-4">No available participants found from {club.institution}.</p>
                            )}
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                            <Button onClick={handleAddExisting} disabled={selectedIds.size === 0}>Add ({selectedIds.size}) Selected</Button>
                        </div>
                    </div>
                )}
                
                {activeTab === 'create' && (
                    <NewMemberForm club={club} onSubmit={handleCreateNew} />
                )}
            </div>
        </Modal>
    );
};