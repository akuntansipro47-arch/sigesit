import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '@/contexts/AuthContext';
import { getUserEntries } from '@/lib/api';
import L from 'leaflet';

// Fix Leaflet Marker Icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function DistributionMap() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      const data = await getUserEntries(profile?.id || '');
      // Filter entries that have valid coordinates
      const validEntries = data?.filter((e: any) => e.latitude && e.longitude) || [];
      setEntries(validEntries);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-center">Memuat Peta...</div>;

  // Default center (PKM Padasuka / Sumedang approx)
  // If we have entries, center on the first one
  const center: [number, number] = entries.length > 0 
    ? [entries[0].latitude, entries[0].longitude] 
    : [-6.858689, 107.916664]; // Fallback Sumedang

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm z-0 relative">
       {entries.length === 0 ? (
          <div className="h-full flex items-center justify-center bg-gray-100 text-gray-500">
             Belum ada data lokasi (GPS) yang tersimpan.
          </div>
       ) : (
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {entries.map((entry) => (
            <Marker key={entry.id} position={[entry.latitude, entry.longitude]}>
                <Popup>
                <div className="text-xs">
                    <strong>{entry.family_members?.[0]?.head_of_family || 'Keluarga'}</strong><br/>
                    {entry.address}<br/>
                    RW: {entry.rw?.name}, RT: {entry.rt?.name}
                </div>
                </Popup>
            </Marker>
            ))}
        </MapContainer>
       )}
    </div>
  );
}
