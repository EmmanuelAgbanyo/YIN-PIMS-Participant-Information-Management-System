import React, { useState, useMemo, useEffect } from 'react';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { useToast } from '../hooks/useToast';
import type { Event, Participant, Participation, UserRole, UUID, Club } from '../types';
import { Gender, Region } from '../types';
import { INSTITUTIONS } from '../constants';
import { Input } from './ui/Input';
import { FormGroup } from './ui/FormGroup';
import { Checkbox } from './ui/Checkbox';
import { Select } from './ui/Select';

type EventDetailPanelProps = {
  event: Event;
  participants: Participant[];
  participations: Participation[];
  addParticipant: (participant: Omit<Participant, 'id' | 'createdAt' | 'membershipId'>, clubId?: UUID) => Promise<Participant>;
  addParticipation: (participantId: UUID, eventId: UUID) => Promise<boolean>;
  addMultipleParticipations: (participantIds: UUID[], eventId: UUID) => Promise<{ added: number, skipped: number }>;
  deleteParticipation: (participantId: UUID, eventId: UUID) => void;
  deleteEvent: (eventId: UUID) => void;
  onEdit: (event: Event) => void;
  currentUserRole: UserRole;
  clubs: Club[];
};

const QuickAddParticipantForm: React.FC<{
  onAdd: (participant: Omit<Participant, 'id' | 'createdAt' | 'membershipId'>, clubId?: UUID) => Promise<void>;
  clubs: Club[];
}> = ({ onAdd, clubs }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    institution: '',
    ghanaCardNumber: '',
  });
  const [joinClub, setJoinClub] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState<UUID>('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.contact || !formData.institution) return;
    await onAdd({
      ...formData,
      gender: Gender.Other,
      region: Region.GreaterAccra, // Default region for quick add
      membershipStatus: true,
      certificateIssued: false,
      notes: 'Added via quick-add from event panel.',
    }, joinClub ? selectedClubId : undefined);
    
    // Reset form
    setFormData({ name: '', contact: '', institution: '', ghanaCardNumber: '' });
    setJoinClub(false);
    setSelectedClubId('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormGroup>
        <Input type="text" label="Full Name" value={formData.name} onChange={e => setFormData(f => ({...f, name: e.target.value}))} required />
      </FormGroup>
      <FormGroup>
        <Input type="text" label="Contact Info" value={formData.contact} onChange={e => setFormData(f => ({...f, contact: e.target.value}))} required />
      </FormGroup>
      <FormGroup>
        <Input type="text" label="Ghana Card (Optional)" value={formData.ghanaCardNumber} onChange={e => setFormData(f => ({...f, ghanaCardNumber: e.target.value}))} />
      </FormGroup>
      <FormGroup>
        <Input list="institutions" label="Institution" value={formData.institution} onChange={e => setFormData(f => ({...f, institution: e.target.value}))} required />
        <datalist id="institutions">
          {INSTITUTIONS.map(i => <option key={i} value={i} />)}
        </datalist>
      </FormGroup>

       <div className="mt-4 p-4 border rounded-md dark:border-gray-700">
          <FormGroup>
              <Checkbox label="Enroll in YIN Club" name="joinClub" checked={joinClub} onChange={(e) => setJoinClub(e.target.checked)} />
          </FormGroup>
          {joinClub && (
              <FormGroup>
                  <Select label="Club" value={selectedClubId} onChange={(e) => setSelectedClubId(e.target.value)} disabled={availableClubs.length === 0}>
                      {availableClubs.length > 0 ? (
                        availableClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                      ) : (
                        <option>No clubs for this institution</option>
                      )}
                  </Select>
              </FormGroup>
          )}
      </div>

      <Button type="submit" className="w-full !mt-6">Create & Register</Button>
    </form>
  );
};


export const EventDetailPanel: React.FC<EventDetailPanelProps> = ({ event, participants, participations, addParticipant, addParticipation, addMultipleParticipations, deleteParticipation, deleteEvent, onEdit, currentUserRole, clubs }) => {
  const [activeTab, setActiveTab] = useState<'register' | 'create'>('register');
  const [searchExisting, setSearchExisting] = useState('');
  const [searchAttendees, setSearchAttendees] = useState('');
  const [selectedToRegister, setSelectedToRegister] = useState<Set<UUID>>(new Set());
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const addToast = useToast();

  const canManageEvent = useMemo(() => ['Super Admin', 'Admin', 'Organizer'].includes(currentUserRole), [currentUserRole]);

  const attendees = useMemo(() => {
    const attendeeIds = new Set(participations.filter(p => p.eventId === event.id).map(p => p.participantId));
    return participants
      .filter(p => attendeeIds.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [participations, participants, event.id]);

  const availableToRegister = useMemo(() => {
    const attendeeIds = new Set(attendees.map(a => a.id));
    return participants
      .filter(p => !attendeeIds.has(p.id) && p.name.toLowerCase().includes(searchExisting.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [participants, attendees, searchExisting]);

  const filteredAttendees = useMemo(() => {
    return attendees.filter(a => a.name.toLowerCase().includes(searchAttendees.toLowerCase()));
  }, [attendees, searchAttendees]);

  const handleSelectForRegistration = (participantId: UUID, isSelected: boolean) => {
    setSelectedToRegister(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(participantId);
      } else {
        newSet.delete(participantId);
      }
      return newSet;
    });
  };

  const handleBulkRegister = async () => {
    if (selectedToRegister.size === 0) return;
    const result = await addMultipleParticipations(Array.from(selectedToRegister), event.id);
    addToast(`Successfully registered ${result.added} participants. ${result.skipped} were already registered.`, 'success');
    setSelectedToRegister(new Set());
    setSearchExisting('');
  };

  const handleCreateAndRegister = async (participantData: Omit<Participant, 'id' | 'createdAt' | 'membershipId'>, clubId?: UUID) => {
    const newParticipant = await addParticipant(participantData, clubId);
    if (newParticipant) {
      await addParticipation(newParticipant.id, event.id);
      addToast(`${newParticipant.name} created and registered!`, 'success');
    } else {
        addToast('Failed to create participant.', 'error');
    }
  };
  
  const handleUnregister = async (participantId: UUID, participantName: string) => {
      await deleteParticipation(participantId, event.id);
      addToast(`${participantName} unregistered from event.`, 'success');
  };
  
  const confirmDeleteEvent = async () => {
    await deleteEvent(event.id);
    addToast(`Event "${event.title}" deleted.`, 'success');
    setIsConfirmDeleteOpen(false);
  };

  return (
    <>
      <div className="p-6 border-b dark:border-gray-700">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-2xl font-bold">{event.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{event.date.toLocaleDateString()} • {event.location} • {event.category}</p>
            </div>
            {canManageEvent && (
                <div className="flex gap-2 flex-shrink-0">
                    <Button variant="ghost" onClick={() => onEdit(event)}>Edit</Button>
                    <Button variant="danger" onClick={() => setIsConfirmDeleteOpen(true)}>Delete</Button>
                </div>
            )}
        </div>
      </div>
      
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto">
        {/* Left Side: Add Participants */}
        {canManageEvent ? (
            <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold">Add to Event</h3>
                <div className="flex border-b dark:border-gray-700">
                    <button onClick={() => setActiveTab('register')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'register' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Register Existing</button>
                    <button onClick={() => setActiveTab('create')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'create' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Create & Register New</button>
                </div>
                {activeTab === 'register' ? (
                    <div className="space-y-3">
                        <input type="text" placeholder="Search for participant..." value={searchExisting} onChange={e => setSearchExisting(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-900 dark:border-gray-600" />
                        <div className="space-y-2 max-h-64 overflow-y-auto border dark:border-gray-700 rounded-md p-2">
                            {searchExisting && availableToRegister.length > 0 ? availableToRegister.map(p => (
                                <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
                                    <Checkbox
                                        label={p.name}
                                        checked={selectedToRegister.has(p.id)}
                                        onChange={e => handleSelectForRegistration(p.id, e.target.checked)}
                                    />
                                </div>
                            )) : (
                                searchExisting && <p className="text-center text-sm text-gray-500 py-4">No participants found.</p>
                            )}
                        </div>
                        <Button onClick={handleBulkRegister} disabled={selectedToRegister.size === 0} className="w-full">
                            Register Selected ({selectedToRegister.size})
                        </Button>
                    </div>
                ) : (
                    <QuickAddParticipantForm onAdd={handleCreateAndRegister} clubs={clubs} />
                )}
            </div>
        ) : <div />}

        {/* Right Side: Current Attendees */}
        <div className="flex flex-col gap-4">
            <h3 className="text-lg font-semibold">Current Attendees ({filteredAttendees.length})</h3>
            <input type="text" placeholder="Search attendees..." value={searchAttendees} onChange={e => setSearchAttendees(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-900 dark:border-gray-600" />
            <div className="flex-1 space-y-2 overflow-y-auto max-h-[50vh]">
                {filteredAttendees.length > 0 ? filteredAttendees.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded-md">
                        <div>
                           <p className="font-medium text-sm">{p.name}</p>
                           <p className="text-xs text-gray-500">{p.institution}</p>
                        </div>
                        {canManageEvent && <Button variant="danger" size="sm" onClick={() => handleUnregister(p.id, p.name)}>Remove</Button>}
                    </div>
                )) : <p className="text-center text-sm text-gray-500 pt-8">No attendees registered yet.</p>}
            </div>
        </div>
      </div>
       <Modal isOpen={isConfirmDeleteOpen} onClose={() => setIsConfirmDeleteOpen(false)} title="Confirm Deletion">
        <div>
            <p>Are you sure you want to delete the event "{event.title}"? This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" onClick={() => setIsConfirmDeleteOpen(false)}>Cancel</Button>
                <Button variant="danger" onClick={confirmDeleteEvent}>Delete</Button>
            </div>
        </div>
      </Modal>
    </>
  );
};