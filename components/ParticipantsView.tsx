import React, { useState, useMemo, useEffect } from 'react';
import type { usePIMSData } from '../hooks/usePIMSData';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import type { Participant, UserRole, UUID, Club, Event, Participation } from '../types';
import { GENDERS, REGIONS, INSTITUTIONS } from '../constants';
import { useToast } from '../hooks/useToast';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Checkbox } from './ui/Checkbox';
import { Textarea } from './ui/Textarea';
import { FormGroup } from './ui/FormGroup';
import { ParticipantDetailPanel } from './ParticipantDetailPanel';
import { MembershipCardModal } from './MembershipCardModal';
import { ImportParticipantsModal } from './ImportParticipantsModal';
import { ExportParticipantsModal } from './ExportParticipantsModal';

type ParticipantsViewProps = Omit<ReturnType<typeof usePIMSData>, 'deleteParticipant'> & { 
    deleteParticipant: (id: UUID) => void,
    deleteMultipleParticipants: (ids: UUID[]) => void,
    currentUserRole: UserRole,
    updateParticipantMembershipCardTimestamp: (id: UUID) => void;
    addMultipleParticipants: (participantsData: Omit<Participant, 'id' | 'createdAt' | 'membershipId' | 'engagementScore' | 'lastMembershipCardGeneratedAt' | 'photoUrl'>[]) => Promise<{ created: number }>;
    events: Event[];
    participations: Participation[];
};

const initialParticipantState: Omit<Participant, 'id' | 'createdAt' | 'membershipId'> = {
  name: '',
  gender: GENDERS[0],
  institution: '',
  region: REGIONS[0],
  contact: '',
  membershipStatus: true,
  certificateIssued: false,
  isContestant: false,
  notes: '',
  ghanaCardNumber: '',
};

const ParticipantForm: React.FC<{
  onSubmit: (participant: Omit<Participant, 'id' | 'createdAt' | 'membershipId'>, clubId?: UUID) => Promise<void>;
  initialData?: Participant | null;
  onClose: () => void;
  clubs: Club[];
}> = ({ onSubmit, initialData, onClose, clubs }) => {
  const [formData, setFormData] = useState(initialData || initialParticipantState);
  const [joinClub, setJoinClub] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState<UUID>('');

  useEffect(() => {
    setFormData(initialData || initialParticipantState);
    setJoinClub(false);
    setSelectedClubId('');
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData, joinClub ? selectedClubId : undefined);
    onClose();
  };
  
  const availableClubs = useMemo(() => {
    if (!formData.institution) return [];
    return clubs.filter(c => c.institution === formData.institution);
  }, [clubs, formData.institution]);
  
  useEffect(() => {
    if(availableClubs.length > 0) {
      setSelectedClubId(availableClubs[0].id)
    } else {
      setSelectedClubId('')
    }
  }, [availableClubs]);

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
      <FormGroup className="md:col-span-2">
        <Input type="text" label="Full Name" name="name" value={formData.name} onChange={handleChange} required />
      </FormGroup>
      <FormGroup>
        <Select label="Gender" name="gender" value={formData.gender} onChange={handleChange}>
          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
        </Select>
      </FormGroup>
       <FormGroup>
        <Input type="text" label="Contact (Phone/Email)" name="contact" value={formData.contact} onChange={handleChange} required />
      </FormGroup>
      <FormGroup>
         <Input list="institutions" label="Institution" name="institution" value={formData.institution} onChange={handleChange} required />
        <datalist id="institutions">
          {INSTITUTIONS.map(i => <option key={i} value={i} />)}
        </datalist>
      </FormGroup>
      <FormGroup>
        <Select label="Region" name="region" value={formData.region} onChange={handleChange}>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
      </FormGroup>
      <FormGroup className="md:col-span-2">
        <Input type="text" label="Ghana Card Number (Optional)" name="ghanaCardNumber" value={formData.ghanaCardNumber || ''} onChange={handleChange} />
      </FormGroup>
      <FormGroup className="md:col-span-2">
        <Textarea label="Notes" name="notes" value={formData.notes} onChange={handleChange} rows={3} />
      </FormGroup>
      <FormGroup className="flex items-center gap-4">
          <Checkbox name="membershipStatus" label="Active Member" checked={formData.membershipStatus} onChange={handleChange} />
          <Checkbox name="certificateIssued" label="Certificate Issued" checked={formData.certificateIssued} onChange={handleChange} />
          <Checkbox name="isContestant" label="Contestant" checked={formData.isContestant || false} onChange={handleChange} />
      </FormGroup>
      
       {!initialData && (
        <div className="md:col-span-2 mt-4 p-4 border rounded-md dark:border-gray-700">
            <FormGroup>
                <Checkbox label="Join a YIN Club" name="joinClub" checked={joinClub} onChange={(e) => setJoinClub(e.target.checked)} />
            </FormGroup>
            {joinClub && (
                <FormGroup>
                    <Select label="Club" value={selectedClubId} onChange={(e) => setSelectedClubId(e.target.value)}>
                        {availableClubs.length > 0 ? (
                          availableClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                        ) : (
                          <option disabled>No clubs for this institution</option>
                        )}
                    </Select>
                </FormGroup>
            )}
        </div>
      )}

      <div className="md:col-span-2 flex justify-end space-x-2 pt-6">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit">{initialData ? 'Update Participant' : 'Create Participant'}</Button>
      </div>
    </form>
  );
};

export const ParticipantsView: React.FC<ParticipantsViewProps> = ({ participants, events, participations, addParticipant, updateParticipant, deleteParticipant, deleteMultipleParticipants, currentUserRole, updateParticipantMembershipCardTimestamp, clubs, addMultipleParticipants }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<UUID>>(new Set());
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [cardParticipant, setCardParticipant] = useState<Participant | null>(null);
  const addToast = useToast();

  const canManage = useMemo(() => ['Super Admin', 'Admin'].includes(currentUserRole), [currentUserRole]);

  const filteredParticipants = useMemo(() => {
    let filtered = participants;

    // Apply event filter if an event is selected
    if (selectedEventId !== 'all') {
      const attendeeIds = new Set(
        participations
          .filter(p => p.eventId === selectedEventId)
          .map(p => p.participantId)
      );
      filtered = filtered.filter(p => attendeeIds.has(p.id));
    }

    // Apply search term filter
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(lowercasedFilter) ||
        p.institution.toLowerCase().includes(lowercasedFilter)
      );
    }
    
    // Sort the final result
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [participants, searchTerm, selectedEventId, participations]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, selectedEventId]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filteredParticipants.map(p => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: UUID) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleAdd = () => {
    setEditingParticipant(null);
    setIsModalOpen(true);
  };

  const handleEditRequest = (participant: Participant) => {
    setEditingParticipant(participant);
    setIsModalOpen(true);
  };
  
  const handleDeleteRequest = (participant: Participant) => {
    setParticipantToDelete(participant);
    setIsConfirmDeleteOpen(true);
  };

  const handleBulkDeleteRequest = () => {
    setIsConfirmBulkDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (participantToDelete) {
      await deleteParticipant(participantToDelete.id);
      addToast(`Participant "${participantToDelete.name}" deleted successfully.`, 'success');
      setIsConfirmDeleteOpen(false);
      setParticipantToDelete(null);
    }
  };

  const confirmBulkDelete = async () => {
    await deleteMultipleParticipants(Array.from(selectedIds));
    addToast(`${selectedIds.size} participants deleted successfully.`, 'success');
    setSelectedIds(new Set());
    setIsConfirmBulkDeleteOpen(false);
  };

  const handleFormSubmit = async (data: Omit<Participant, 'id' | 'createdAt' | 'membershipId'>, clubId?: UUID) => {
    if (editingParticipant) {
      await updateParticipant({ ...editingParticipant, ...data });
      addToast('Participant updated successfully!', 'success');
    } else {
      await addParticipant(data, clubId);
      addToast('Participant created successfully!', 'success');
    }
    setIsModalOpen(false);
    setEditingParticipant(null);
  };

  const handleGenerateCard = (participant: Participant) => {
      setCardParticipant(participant);
      updateParticipantMembershipCardTimestamp(participant.id);
  };
  
  const allVisibleSelected = filteredParticipants.length > 0 && selectedIds.size === filteredParticipants.length;
  const isIndeterminate = selectedIds.size > 0 && !allVisibleSelected;

  const handleRowClick = (participant: Participant) => {
    setSelectedParticipant(participant);
  };

  const handlePanelClose = () => {
    setSelectedParticipant(null);
  };

  // When selected participant data changes (e.g., photo update), refresh the panel
  useEffect(() => {
    if (selectedParticipant) {
      const freshData = participants.find(p => p.id === selectedParticipant.id);
      if (freshData) {
        setSelectedParticipant(freshData);
      } else {
        // Participant was deleted, close panel
        setSelectedParticipant(null);
      }
    }
  }, [participants, selectedParticipant]);

  return (
    <div className="flex h-full gap-4 max-h-[calc(100vh-120px)]">
      <div className={`transition-all duration-300 ease-in-out ${selectedParticipant ? 'w-full lg:w-2/3' : 'w-full'}`}>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-full flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
            <h2 className="text-xl font-semibold">Participants ({filteredParticipants.length})</h2>
            <div className="flex items-center gap-2 flex-wrap justify-end">
                <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600" />
                <select
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                  className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                  aria-label="Filter by event"
                >
                  <option value="all">All Events</option>
                  {events.sort((a, b) => b.date.getTime() - a.date.getTime()).map(e => (
                    <option key={e.id} value={e.id}>{e.title}</option>
                  ))}
                </select>
                {canManage && selectedIds.size > 0 && (
                    <Button variant="danger" onClick={handleBulkDeleteRequest}>Delete Selected ({selectedIds.size})</Button>
                )}
                <Button variant="ghost" onClick={() => setIsExportModalOpen(true)}><DownloadIcon />Export</Button>
                {canManage && <Button variant="ghost" onClick={() => setIsImportModalOpen(true)}><UploadIcon/>Import</Button>}
                {canManage && <Button onClick={handleAdd}>Add</Button>}
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {canManage && (
                    <th className="px-4 py-3">
                      <Checkbox 
                        label=""
                        checked={allVisibleSelected}
                        indeterminate={isIndeterminate}
                        onChange={handleSelectAll}
                        disabled={filteredParticipants.length === 0}
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Institution</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engagement</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Membership Card</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredParticipants.length > 0 ? filteredParticipants.map(p => (
                  <tr 
                    key={p.id} 
                    onClick={() => handleRowClick(p)}
                    className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 ${selectedIds.has(p.id) ? 'bg-blue-50 dark:bg-blue-900/50' : ''} ${selectedParticipant?.id === p.id ? '!bg-primary/20' : ''}`}
                  >
                    {canManage && (
                      <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                        <Checkbox 
                            label=""
                            checked={selectedIds.has(p.id)}
                            onChange={() => handleSelectOne(p.id)}
                          />
                      </td>
                    )}
                    <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{p.contact}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{p.institution}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {p.membershipStatus ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${p.engagementScore && p.engagementScore >= 1 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {p.engagementScore} Events
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => handleGenerateCard(p)}>
                            {p.lastMembershipCardGeneratedAt ? <RefreshIcon /> : <CardIcon />}
                            Generate Card
                        </Button>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2" onClick={e => e.stopPropagation()}>
                        {canManage ? (
                            <>
                                <Button variant="ghost" size="sm" onClick={() => handleEditRequest(p)}>Edit</Button>
                                <Button variant="danger" size="sm" onClick={() => handleDeleteRequest(p)}>Delete</Button>
                            </>
                        ) : (
                            <span className="text-xs text-gray-400">No actions</span>
                        )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={canManage ? 7 : 6} className="text-center py-10 text-gray-500 dark:text-gray-400">
                      No participants found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
       {selectedParticipant && (
        <ParticipantDetailPanel 
          participant={selectedParticipant} 
          onClose={handlePanelClose}
          updateParticipant={updateParticipant}
        />
      )}
       <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingParticipant(null); }} title={editingParticipant ? 'Edit Participant' : 'Create New Participant'}>
        <ParticipantForm onSubmit={handleFormSubmit} initialData={editingParticipant} onClose={() => { setIsModalOpen(false); setEditingParticipant(null); }} clubs={clubs} />
      </Modal>
      {cardParticipant && (
          <MembershipCardModal
              participant={cardParticipant}
              isOpen={!!cardParticipant}
              onClose={() => setCardParticipant(null)}
          />
      )}
      <ImportParticipantsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        participants={participants}
        addMultipleParticipants={addMultipleParticipants}
      />
      <ExportParticipantsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        participantsToExport={filteredParticipants}
      />
      <Modal isOpen={isConfirmDeleteOpen} onClose={() => setIsConfirmDeleteOpen(false)} title="Confirm Deletion">
        <div>
            <p>Are you sure you want to delete the participant "{participantToDelete?.name}"? This will also remove all their event registrations and club memberships. This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setIsConfirmDeleteOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={confirmDelete}>Delete</Button>
            </div>
        </div>
      </Modal>
      <Modal isOpen={isConfirmBulkDeleteOpen} onClose={() => setIsConfirmBulkDeleteOpen(false)} title="Confirm Bulk Deletion">
        <div>
            <p>Are you sure you want to delete the {selectedIds.size} selected participants? This will also remove all their event registrations and club memberships. This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setIsConfirmBulkDeleteOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={confirmBulkDelete}>Delete Selected</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
};

const CardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>;
const RefreshIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 12a8 8 0 10-8 8v5" /></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0L8 8m4-4v12" /></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;