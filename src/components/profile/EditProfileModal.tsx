import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Plus, 
  Trash2, 
  Briefcase, 
  MapPin, 
  Globe, 
  Camera, 
  Check, 
  Image as ImageIcon 
} from 'lucide-react';
import { User, WorkExperience } from '../../types';
import { api } from '../../utils/api';
import { sound } from '../../utils/sound';
import { uploadMediaFile } from '../../utils/image';
import { NeumorphicButton } from '../common/NeumorphicButton';

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

const LinkedinIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.53 1.53 0 1 0 0-3.06 1.53 1.53 0 0 0 0 3.06m1.39 9.74v-8.37H5.07v8.37h2.78z" />
  </svg>
);

interface EditProfileModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onProfileUpdated: (user: User) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onProfileUpdated,
}) => {
  const [name, setName] = useState(user.name || '');
  const [role, setRole] = useState(user.role || '');
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [coverUrl, setCoverUrl] = useState(user.coverUrl || '');
  const [githubUrl, setGithubUrl] = useState(user.githubUrl || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user.linkedinUrl || '');
  const [websiteUrl, setWebsiteUrl] = useState(user.websiteUrl || '');

  // Skills
  const [skills, setSkills] = useState<string[]>(user.skills || []);
  const [skillInput, setSkillInput] = useState('');

  // Work History
  const [workHistory, setWorkHistory] = useState<WorkExperience[]>(user.workHistory || []);
  const [showAddWork, setShowAddWork] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newCurrent, setNewCurrent] = useState(false);
  const [newDesc, setNewDesc] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setRole(user.role || '');
      setBio(user.bio || '');
      setLocation(user.location || '');
      setAvatarUrl(user.avatarUrl || '');
      setCoverUrl(user.coverUrl || '');
      setSkills(user.skills || []);
      setWorkHistory(user.workHistory || []);
      setGithubUrl(user.githubUrl || '');
      setLinkedinUrl(user.linkedinUrl || '');
      setWebsiteUrl(user.websiteUrl || '');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    sound.playClick();
    try {
      const url = await uploadMediaFile(file, 'avatars');
      setAvatarUrl(url);
      sound.playChime();
    } catch (err) {
      console.error('Failed to upload avatar:', err);
    } finally {
      setUploadingAvatar(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    sound.playClick();
    try {
      const url = await uploadMediaFile(file, 'covers');
      setCoverUrl(url);
      sound.playChime();
    } catch (err) {
      console.error('Failed to upload cover:', err);
    } finally {
      setUploadingCover(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills(prev => [...prev, trimmed]);
      setSkillInput('');
      sound.playClick();
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(prev => prev.filter(s => s !== skillToRemove));
    sound.playClick();
  };

  const handleAddWorkExperience = () => {
    if (!newTitle.trim() || !newCompany.trim()) return;
    const newExp: WorkExperience = {
      id: `work_${Date.now()}`,
      title: newTitle.trim(),
      company: newCompany.trim(),
      location: newLocation.trim() || undefined,
      startDate: newStartDate.trim() || '2023',
      endDate: newCurrent ? undefined : (newEndDate.trim() || 'Present'),
      current: newCurrent,
      description: newDesc.trim() || '',
      skills: [],
    };
    setWorkHistory(prev => [newExp, ...prev]);
    setNewTitle('');
    setNewCompany('');
    setNewLocation('');
    setNewStartDate('');
    setNewEndDate('');
    setNewCurrent(false);
    setNewDesc('');
    setShowAddWork(false);
    sound.playChime();
  };

  const handleRemoveWork = (id: string) => {
    setWorkHistory(prev => prev.filter(w => w.id !== id));
    sound.playClick();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    sound.playClick();
    try {
      const payload: Partial<User> = {
        name: name.trim(),
        role: role.trim(),
        bio: bio.trim(),
        location: location.trim(),
        avatarUrl,
        coverUrl,
        skills,
        workHistory,
        githubUrl: githubUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
      };

      const res = await api.updateProfile(payload);
      
      // Update UI and close modal immediately (0 millisecond delay)
      sound.playChime();
      onProfileUpdated(res.user);
      onClose();
    } catch (err: any) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-[#edf2f8] dark:bg-[#191b20] rounded-3xl neu-card overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl neu-inset text-indigo-600 dark:text-indigo-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Edit Profile & Work History
              </h3>
              <p className="text-xs text-slate-400">
                Update your public profile, photo, media links, and career journey.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl neu-btn text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Cover & Avatar Photo Upload */}
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              Photos & Media
            </label>
            <div className="relative rounded-2xl overflow-hidden h-32 bg-slate-200 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700">
              {coverUrl ? (
                <img 
                  src={coverUrl} 
                  alt="Cover" 
                  referrerPolicy="no-referrer" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                  No Cover Image
                </div>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{uploadingCover ? 'Uploading...' : 'Change Cover'}</span>
              </button>
            </div>

            {/* Avatar Row */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`}
                  alt={user.name}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${user.username}`;
                  }}
                  className="w-20 h-20 rounded-2xl object-cover neu-raised-sm border-2 border-white dark:border-black"
                />
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
              </div>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-3.5 py-1.5 rounded-xl neu-btn text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{uploadingAvatar ? 'Uploading...' : 'Upload Profile Photo'}</span>
                </button>
                <p className="text-[11px] text-slate-400">
                  Upload custom PNG/JPG or paste an image URL below.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Or paste Avatar Image URL"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-white"
              />
              <input
                type="text"
                placeholder="Or paste Cover Banner URL"
                value={coverUrl}
                onChange={e => setCoverUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Primary Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl neu-input text-slate-800 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Job Title / Role
              </label>
              <input
                type="text"
                placeholder="e.g. Senior Product Designer, Full Stack Dev"
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl neu-input text-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Location
              </label>
              <input
                type="text"
                placeholder="e.g. San Francisco, CA / Remote"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl neu-input text-slate-800 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Website / Portfolio
              </label>
              <input
                type="url"
                placeholder="https://yourportfolio.com"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl neu-input text-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
              About / Bio
            </label>
            <textarea
              rows={3}
              placeholder="Tell others about your background, design principles, or technical focus..."
              value={bio}
              onChange={e => setBio(e.target.value)}
              className="w-full p-3 text-sm rounded-xl neu-input text-slate-800 dark:text-white resize-none"
            />
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <GithubIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>GitHub Profile</span>
              </label>
              <input
                type="url"
                placeholder="https://github.com/username"
                value={githubUrl}
                onChange={e => setGithubUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl neu-input text-slate-800 dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <LinkedinIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>LinkedIn Profile</span>
              </label>
              <input
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl neu-input text-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Skills & Expertise */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Skills & Expertise Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type a skill (e.g. React, UX Design, Cloud) and hit Add"
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                className="flex-1 px-3.5 py-2 text-sm rounded-xl neu-input text-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="px-4 py-2 rounded-xl neu-btn text-xs font-bold text-slate-800 dark:text-white"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {skills.map((s, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2.5 py-1 rounded-xl neu-inset bg-[#e5ebf3] dark:bg-[#15171b] text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(s)}
                    className="hover:text-red-500 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Work History Section */}
          <div className="space-y-4 pt-4 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Work History & Careers
                </h4>
                <p className="text-xs text-slate-400">
                  Searchable by other users across Note Nest.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWork(!showAddWork)}
                className="px-3 py-1.5 rounded-xl neu-btn text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddWork ? 'Cancel' : 'Add Experience'}</span>
              </button>
            </div>

            {/* Add Experience Form */}
            {showAddWork && (
              <div className="p-4 rounded-2xl neu-inset bg-[#e6ecf4] dark:bg-[#14161a] space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Job Title (e.g. Senior Frontend Dev)"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Company Name (e.g. Figma)"
                    value={newCompany}
                    onChange={e => setNewCompany(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Location (e.g. Remote / NYC)"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="Start Date (e.g. 2022)"
                    value={newStartDate}
                    onChange={e => setNewStartDate(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-white"
                  />
                  <input
                    type="text"
                    placeholder="End Date (e.g. 2024)"
                    disabled={newCurrent}
                    value={newCurrent ? 'Present' : newEndDate}
                    onChange={e => setNewEndDate(e.target.value)}
                    className="px-3 py-2 text-xs rounded-xl neu-input text-slate-800 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="currentCheck"
                    checked={newCurrent}
                    onChange={e => setNewCurrent(e.target.checked)}
                    className="rounded accent-indigo-600 cursor-pointer"
                  />
                  <label htmlFor="currentCheck" className="text-xs text-slate-600 dark:text-slate-300 font-medium cursor-pointer">
                    I currently work in this role
                  </label>
                </div>

                <textarea
                  rows={2}
                  placeholder="Summary of responsibilities, achievements, and impact..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl neu-input text-slate-800 dark:text-white resize-none"
                />

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddWorkExperience}
                    className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer"
                  >
                    Save Experience
                  </button>
                </div>
              </div>
            )}

            {/* List Existing Work Experiences */}
            <div className="space-y-2">
              {workHistory.map(item => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-3 rounded-xl neu-card bg-[#edf2f8] dark:bg-[#191b20] border border-black/5 dark:border-white/5"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.title} <span className="text-indigo-600 dark:text-indigo-400 font-semibold">@ {item.company}</span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.startDate} - {item.current ? 'Present' : item.endDate || 'N/A'} {item.location ? `• ${item.location}` : ''}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 pt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveWork(item.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-800"
            >
              Cancel
            </button>
            <NeumorphicButton
              type="submit"
              variant="raised"
              size="md"
              disabled={saving}
              className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-xs px-6"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </NeumorphicButton>
          </div>
        </form>
      </div>
    </div>
  );
};
