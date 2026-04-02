import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campusApi } from '../../api/campus';
import { ArrowLeft, Edit2, MapPin, Building, Layers, DoorOpen, Users, Settings } from 'lucide-react';
import RoomFormModal from '../../components/campus/RoomFormModal';

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRoom = async () => {
    try {
      setLoading(true);
      const data = await campusApi.getRoom(id);
      setRoom(data);
    } catch (err) {
      console.error('Failed to load room details', err);
      navigate('/campus/rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoom(); }, [id]);

  if (loading) return <div className="text-center py-20 text-muted">Loading Room Details...</div>;
  if (!room) return null;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex justify-between items-start">
        <div className="flex gap-4 items-center">
            <button onClick={() => navigate('/campus/rooms')} className="p-2 bg-surface/50 hover:bg-surface rounded-xl text-muted transition-colors">
                <ArrowLeft className="w-5 h-5"/>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-black text-foreground tracking-tight">{room.room_number}</h2>
                <span className="bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20 px-3 py-1 rounded-lg text-sm font-bold tracking-wider uppercase">
                  {room.room_type_name}
                </span>
                {room.under_maintenance && (
                  <span className="bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 px-3 py-1 rounded-lg text-sm font-bold uppercase">
                    Maintenance
                  </span>
                )}
              </div>
              <p className="text-[var(--primary)] font-medium text-lg mt-1">{room.room_name}</p>
            </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-surface hover:bg-surface/80 border border-border text-foreground px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all"
        >
          <Edit2 className="w-4 h-4" /> Edit Details
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info Card */}
          <div className="md:col-span-2 bg-background border border-border rounded-3xl p-8">
             <h3 className="text-xl font-bold text-foreground mb-6 border-b border-border pb-4">Topology Map</h3>
             
             <div className="grid sm:grid-cols-2 gap-8">
                <div className="flex gap-4">
                   <div className="p-3 bg-background rounded-2xl h-fit border border-border"><MapPin className="text-muted w-6 h-6"/></div>
                   <div>
                       <p className="text-xs font-bold text-muted uppercase tracking-widest">Campus</p>
                       <p className="text-foreground font-medium text-lg mt-1">{room.campus_name}</p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="p-3 bg-background rounded-2xl h-fit border border-border"><Building className="text-[#2563EB] w-6 h-6"/></div>
                   <div>
                       <p className="text-xs font-bold text-muted uppercase tracking-widest">Building</p>
                       <p className="text-foreground font-medium text-lg mt-1">{room.building_name} [{room.building_code}]</p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="p-3 bg-background rounded-2xl h-fit border border-border"><Layers className="text-[#8B5CF6] w-6 h-6"/></div>
                   <div>
                       <p className="text-xs font-bold text-muted uppercase tracking-widest">Floor</p>
                       <p className="text-foreground font-medium text-lg mt-1">{room.floor_name || `Level ${room.floor_number}`}</p>
                   </div>
                </div>
                <div className="flex gap-4">
                   <div className="p-3 bg-background rounded-2xl h-fit border border-border"><DoorOpen className="text-[var(--primary)] w-6 h-6"/></div>
                   <div>
                       <p className="text-xs font-bold text-muted uppercase tracking-widest">Department</p>
                       <p className="text-foreground font-medium text-lg mt-1">{room.department || 'General Assign'}</p>
                   </div>
                </div>
             </div>
          </div>

          {/* Quick Specs */}
          <div className="bg-background border border-border rounded-3xl p-8">
             <h3 className="text-xl font-bold text-foreground mb-6 border-b border-border pb-4">Specifications</h3>
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                   <div className="flex gap-3 text-muted"><Users className="text-[#10B981] w-5 h-5"/> Capacity</div>
                   <div className="text-foreground font-black text-xl">{room.capacity || 'N/A'}</div>
                </div>
                <div className="flex justify-between items-center">
                   <div className="flex gap-3 text-muted"><Settings className="text-[#F59E0B] w-5 h-5"/> Status</div>
                   <div className="text-foreground tracking-widest uppercase font-bold text-sm">{room.status}</div>
                </div>
             </div>
          </div>
          
          {/* Facility Highlights */}
          <div className="md:col-span-3 bg-surface border border-border rounded-3xl p-8">
             <h3 className="text-xl font-bold text-foreground mb-6 border-b border-border pb-4">Infrastructure & Facilities</h3>
             
             <div className="flex flex-wrap gap-4">
                 {room.is_wheelchair_accessible && (
                     <span className="px-4 py-2 bg-surface border border-[#2563EB]/30 rounded-full text-sm font-medium text-[var(--primary)]">
                         Wheelchair Accessible
                     </span>
                 )}
                 {room.has_projector && (
                     <span className="px-4 py-2 bg-surface border border-[#2563EB]/30 rounded-full text-sm font-medium text-[var(--primary)]">
                         Has Projector
                     </span>
                 )}
                 {room.has_smart_board && (
                     <span className="px-4 py-2 bg-surface border border-[#2563EB]/30 rounded-full text-sm font-medium text-[var(--primary)]">
                         Smart Board Installed
                     </span>
                 )}
                 {room.has_video_conferencing && (
                     <span className="px-4 py-2 bg-surface border border-[#2563EB]/30 rounded-full text-sm font-medium text-[var(--primary)]">
                         Video Conferencing Ready
                     </span>
                 )}
                 {room.available_facilities?.map(f => (
                     <span key={f.id} className="px-4 py-2 bg-background border border-border rounded-full text-sm font-medium text-muted">
                         {f.name}
                     </span>
                 ))}
                 {!room.is_wheelchair_accessible && !room.has_projector && !room.has_smart_board && !room.has_video_conferencing && room.available_facilities?.length === 0 && (
                     <span className="text-muted italic">No specific facilities flagged.</span>
                 )}
             </div>
          </div>
      </div>

      {isModalOpen && (
        <RoomFormModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchRoom} 
          initialData={room} 
        />
      )}
    </div>
  );
}
