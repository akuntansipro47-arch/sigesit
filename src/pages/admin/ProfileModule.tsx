import React, { useState, useEffect } from 'react';
import { getPKMProfile, updatePKMProfile } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/types';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

export default function ProfileModule() {
  const { isMock } = useAuth();
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
     if (profile && Object.keys(profile).length > 0) {
        localStorage.setItem('pkm_profile_v1', JSON.stringify(profile));
     }
  }, [profile]);

  useEffect(() => {
    // 1. Try to load committed backup first
    const committed = localStorage.getItem('pkm_profile_v1');
    
    // PRIORITY: LOCAL DATA WINS ON MOUNT (Fast UI)
    if (committed) {
       setProfile(JSON.parse(committed));
    }
    
    // 2. ALWAYS fetch fresh data from server on mount
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Force fresh fetch from server (skipFallback = true)
      const data = await getPKMProfile(true);
      if (data && (data.name || data.id || data.logo_url)) {
          console.log('Server data valid, updating profile');
          setProfile(data);
          localStorage.setItem('pkm_profile_v1', JSON.stringify(data));
      }
    } catch (error) {
      console.log('Server fetch failed or empty, sticking with backup');
    }
  };

  const handleSyncFromServer = async () => {
    if (confirm('Apakah Anda yakin ingin menarik data terbaru dari server?')) {
      if (isMock) {
        alert('[DEMO MODE] Data sinkronisasi berhasil disimulasikan (Lokal)');
        return;
      }
      setLoading(true);
      try {
        const data = await getPKMProfile(true); // Force server fetch
        if (data) {
          setProfile(data);
          localStorage.setItem('pkm_profile_v1', JSON.stringify(data));
          alert('Berhasil menarik data dari server!');
        } else {
          alert('Data di server kosong.');
        }
      } catch (error) {
        console.error("Sync Error:", error);
        alert('Gagal menarik data dari server. Periksa koneksi atau izin (RLS).');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate Size (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Ukuran file terlalu besar! Maksimal 5MB.');
      return;
    }

    // Convert to Base64 with Higher Quality Compression for Better Visuals
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result as string;
      
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        // INCREASED LIMITS: Much better quality for logos (800x800)
        const MAX_WIDTH = 800; 
        const MAX_HEIGHT = 800;
        
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Use better interpolation for resizing
        if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
        }

        // Compress to JPEG with 0.9 Quality (Very High) instead of 0.85
        // Since we increased quota limit, we can afford larger strings
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.9);
        
        setProfile(prev => ({ ...prev, logo_url: compressedBase64 }));
      };
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setProfile(prev => ({ ...prev, logo_url: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isMock) {
      localStorage.setItem('pkm_profile_v1', JSON.stringify(profile));
      alert('[DEMO MODE] Profil berhasil disimpan di browser (Lokal)');
      return;
    }

    setLoading(true);
    
    try {
        // 1. SAFE SAVE (Try-Catch for Quota Exceeded)
        try {
            localStorage.setItem('pkm_profile_backup', JSON.stringify(profile));
            localStorage.setItem('pkm_profile_permanent', JSON.stringify(profile));
            console.log("Saving to local backup success");
        } catch (storageError) {
            console.error("LocalStorage Full!", storageError);
            alert("Peringatan: Memori Browser Penuh! Gambar mungkin terlalu besar. Coba hapus gambar logo.");
            // Proceed to save to server anyway
        }

        await updatePKMProfile(profile);
        alert('Profile berhasil disimpan (Tersinkron ke Server)');
    } catch (error) {
      console.error(error);
      alert('Profile disimpan di Perangkat (Gagal sinkron ke Server - Cek Koneksi/Izin)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded shadow max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <ImageIcon className="text-blue-600" />
        Profile PKM
        <span className="text-xs font-normal bg-green-100 text-green-800 px-2 py-1 rounded ml-2">
          DATA: {localStorage.getItem('pkm_profile_v1') ? 'SINKRON' : 'BARU'}
        </span>
        <button 
          type="button"
          onClick={handleSyncFromServer}
          className="text-[10px] bg-amber-500 text-white px-3 py-1 rounded ml-auto hover:bg-amber-600 transition-colors uppercase font-black"
        >
          Tarik Data Server
        </button>
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Logo Section */}
        <div className="bg-gray-50 p-4 rounded border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">Logo PKM</label>
          <div className="flex items-start gap-4">
            <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden border border-gray-300">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt="Logo" className="w-full h-full object-contain bg-white" />
              ) : (
                <ImageIcon className="text-gray-400" size={40} />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-2">
                Format: JPG, PNG. Maksimal ukuran 5MB.
              </p>
              <div className="flex gap-2">
                <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 flex items-center gap-2">
                  <Upload size={16} />
                  Upload Logo
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />
                </label>
                {profile.logo_url && (
                  <button 
                    type="button" 
                    onClick={handleRemoveLogo}
                    className="bg-red-100 text-red-600 px-4 py-2 rounded text-sm hover:bg-red-200 flex items-center gap-2"
                  >
                    <X size={16} />
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama PKM</label>
            <input
              type="text"
              value={profile.name || ''}
              onChange={e => setProfile({...profile, name: e.target.value})}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Contoh: PKM PADASUKA"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Penanggung Jawab / Kesling</label>
            <input
              type="text"
              value={profile.pic_name || ''}
              onChange={e => setProfile({...profile, pic_name: e.target.value})}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Alamat Lengkap</label>
          <textarea
            value={profile.address || ''}
            onChange={e => setProfile({...profile, address: e.target.value})}
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">No. Telepon / WhatsApp</label>
          <input
            type="text"
            value={profile.phone || ''}
            onChange={e => setProfile({...profile, phone: e.target.value})}
            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Website</label>
            <input
              type="text"
              value={profile.website || ''}
              onChange={e => setProfile({...profile, website: e.target.value})}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Instagram</label>
            <input
              type="text"
              value={profile.ig || ''}
              onChange={e => setProfile({...profile, ig: e.target.value})}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="@username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Facebook</label>
            <input
              type="text"
              value={profile.fb || ''}
              onChange={e => setProfile({...profile, fb: e.target.value})}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Twitter / X</label>
            <input
              type="text"
              value={profile.twitter || ''}
              onChange={e => setProfile({...profile, twitter: e.target.value})}
              className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 w-full md:w-auto shadow-md"
        >
          {loading ? 'Menyimpan...' : 'Simpan Perubahan Profile'}
        </button>
      </form>
    </div>
  );
}
